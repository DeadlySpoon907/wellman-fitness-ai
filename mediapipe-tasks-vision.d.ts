export {};

declare module '@mediapipe/tasks-vision' {
  export function FilesetResolver(): any;
  export function PoseLandmarker(): any;
  export function HandLandmarker(): any;

  export interface FilesetResolver {
    forVisionTasks(path: string): Promise<FilesetResolver>;
  }

  export interface PoseLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: 'GPU' | 'CPU';
    };
    runningMode: 'VIDEO' | 'IMAGE';
    numPoses?: number;
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export interface PoseLandmarker {
    createFromOptions(vision: FilesetResolver, options: PoseLandmarkerOptions): Promise<PoseLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): PoseLandmarkerResult;
    detect(image: HTMLImageElement): PoseLandmarkerResult;
  }

  export interface PoseLandmarkerResult {
    landmarks?: NormalizedLandmark[][];
    worldLandmarks?: Landmark3D[][];
  }

  export interface NormalizedLandmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
  }

  export interface Landmark3D {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface HandLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: 'GPU' | 'CPU';
    };
    runningMode: 'VIDEO' | 'IMAGE';
    numHands?: number;
    minHandDetectionConfidence?: number;
    minHandPresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export interface HandLandmarker {
    createFromOptions(vision: FilesetResolver, options: HandLandmarkerOptions): Promise<HandLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult;
    detect(image: HTMLImageElement): HandLandmarkerResult;
  }

  export interface HandLandmarkerResult {
    landmarks?: NormalizedLandmark[][];
    worldLandmarks?: Landmark3D[][];
    handedness?: Handedness[][];
  }

  export interface Handedness {
    index: number;
    score: number;
    displayName: string;
    categoryName: string;
  }
}