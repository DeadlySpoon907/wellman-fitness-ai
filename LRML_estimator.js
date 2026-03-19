const express = require('express');
const cors = require('cors');
const multer = require('multer');
const tf = require('@tensorflow/tfjs');
const poseDetection = require('@tensorflow-models/pose-detection');
const { createCanvas, Image } = require('canvas');

const app = express();
app.use(cors());
const upload = multer();

// CONFIGURATION CONSTANTS
const DISTANCE_TO_CAMERA_CM = 200; // Adjusted to 2 meters
const CAMERA_VERTICAL_FOV = 60;    // Standard webcam FOV
const HUMAN_DENSITY = 0.985;       // average g/cm3 (human body is slightly less dense than water)

class BMIEstimator {
    constructor() {
        this.detector = null;
    }

    // Initialize the Pose Model
    async loadModel() {
        this.detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet, 
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
        );
        console.log("Model Loaded");
    }

    /**
     * THE ALGORITHM
     * @param {Array} keypoints - The detected body points
     * @param {number} imgHeight - Image height in pixels
     */
    calculateMetrics(keypoints, imgHeight) {
        const getPt = (name) => keypoints.find(kp => kp.name === name);

        const nose = getPt('nose');
        const lAnkle = getPt('left_ankle');
        const rAnkle = getPt('right_ankle');
        const lShoulder = getPt('left_shoulder');
        const rShoulder = getPt('right_shoulder');
        const lHip = getPt('left_hip');
        const rHip = getPt('right_hip');

        // 1. HEIGHT CALCULATION (Geometry)
        // Formula: ActualHeight = (PixelHeight / ImageHeight) * 2 * Distance * tan(FOV/2)
        const ankleY = (lAnkle.y + rAnkle.y) / 2;
        const pixelHeight = (ankleY - nose.y) * 1.15; // 1.15 multiplier to account for top of head
        
        const heightCm = Math.round(
            ((pixelHeight / imgHeight) * 
            (2 * DISTANCE_TO_CAMERA_CM * Math.tan((CAMERA_VERTICAL_FOV / 2) * (Math.PI / 180)))) * 1.0
        );

        // 2. WEIGHT ESTIMATION (Volumetric Heuristic)
        // We treat the torso/body as a cylinder. 
        // Cylinder Volume = PI * radius^2 * height
        const shoulderWidthPixels = Math.abs(lShoulder.x - rShoulder.x);
        const hipWidthPixels = Math.abs(lHip.x - rHip.x);

        const shoulderWidthCm = (shoulderWidthPixels / pixelHeight) * heightCm;
        const hipWidthCm = (hipWidthPixels / pixelHeight) * heightCm;
        
        // Use average of shoulder and hip width for better body representation
        const avgWidthCm = (shoulderWidthCm + hipWidthCm) / 2;

        // Estimate body depth (thickness) as approx 60% of average width
        // Elliptical Cylinder Area = PI * (width/2) * (depth/2)
        const estimatedDepthCm = avgWidthCm * 0.55;
        const crossSectionArea = Math.PI * (avgWidthCm / 2) * (estimatedDepthCm / 2);
        const volumeCm3 = crossSectionArea * heightCm;
        
        // Weight = Volume * Density (approx)
        // Scaling factor 1.0 restores baseline physics
        const weightKg = Math.round((volumeCm3 * HUMAN_DENSITY * 1.0) / 1000);

        // 3. BMI
        const heightM = heightCm / 100;
        const bmi = (weightKg / (heightM * heightM)).toFixed(1);

        return { heightCm, weightKg, bmi };
    }
}

const bmiEstimator = new BMIEstimator();

// API Endpoint
app.post('/estimate', upload.single('image'), async (req, res) => {
    try {
        const img = new Image();
        img.src = req.file.buffer;
        
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const poses = await bmiEstimator.detector.estimatePoses(canvas);

        if (poses.length === 0) {
            return res.status(400).json({ error: "No person detected" });
        }

        const metrics = bmiEstimator.calculateMetrics(poses[0].keypoints, img.height);
        
        res.json({
            success: true,
            data: metrics,
            confidence: poses[0].score.toFixed(2)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

bmiEstimator.loadModel().then(() => {
    app.listen(5001, () => console.log("API running on port 5001"));
});