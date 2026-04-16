import { useRef, useEffect } from 'react';
import type { Hand, HAND_CONNECTIONS } from '../types';

interface HandSkeletonProps {
  hands: Hand[];
  canvasWidth: number;
  canvasHeight: number;
  isCameraRunning: boolean;
}

interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

class HandOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private hands: NormalizedLandmark[][] = [];
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private boundingBoxes: { left: number; top: number; right: number; bottom: number }[] = [];

  private readonly handConnections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Could not get canvas context");
    this.ctx = context;
  }

  public setImageDimensions(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
  }

  public setHands(newHands: NormalizedLandmark[][]): void {
    this.hands = newHands.map(h => [...h]);
    this.boundingBoxes = newHands.map(h => this.calculateBoundingBox(h));
    this.draw();
  }

  private calculateBoundingBox(landmarks: NormalizedLandmark[]) {
    if (landmarks.length === 0) return { left: 0, top: 0, right: 0, bottom: 0 };

    let minX = 1, minY = 1, maxX = 0, maxY = 0;

    landmarks.forEach(lm => {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    });

    const padding = 0.02;
    return {
      left: Math.max(0, minX - padding),
      top: Math.max(0, minY - padding),
      right: Math.min(1, maxX + padding),
      bottom: Math.min(1, maxY + padding)
    };
  }

  public draw(): void {
    const { ctx, canvas, hands, boundingBoxes } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hands.length === 0 || this.imageWidth === 0) return;

    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    const handColors = ['#00FF00', '#FF00FF', '#00FFFF', '#FFFF00'];
    const connectionColors = ['white', 'orange', 'cyan', 'yellow'];

    hands.forEach((landmarks, handIdx) => {
      ctx.strokeStyle = connectionColors[handIdx % connectionColors.length];
      ctx.lineWidth = 4;
      ctx.beginPath();

      this.handConnections.forEach(([startIdx, endIdx]) => {
        if (landmarks[startIdx] && landmarks[endIdx]) {
          ctx.moveTo(landmarks[startIdx].x * viewWidth, landmarks[startIdx].y * viewHeight);
          ctx.lineTo(landmarks[endIdx].x * viewWidth, landmarks[endIdx].y * viewHeight);
        }
      });
      ctx.stroke();

      landmarks.forEach((lm, i) => {
        const x = lm.x * viewWidth;
        const y = lm.y * viewHeight;

        ctx.fillStyle = (i === 0) ? "yellow" : handColors[handIdx % handColors.length];
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      if (boundingBoxes[handIdx]) {
        const bbox = boundingBoxes[handIdx];
        ctx.strokeStyle = handColors[handIdx % handColors.length];
        ctx.lineWidth = 3;
        ctx.strokeRect(
          bbox.left * viewWidth,
          bbox.top * viewHeight,
          (bbox.right - bbox.left) * viewWidth,
          (bbox.bottom - bbox.top) * viewHeight
        );
      }
    });
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

function normalizeLandmarks(landmarks: { x: number; y: number; z?: number }[]): NormalizedLandmark[] {
  return landmarks.map(lm => ({
    x: lm.x,
    y: lm.y,
    z: lm.z
  }));
}

export function HandSkeleton({
  hands,
  canvasWidth,
  canvasHeight,
  isCameraRunning,
}: HandSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HandOverlay | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!overlayRef.current) {
      overlayRef.current = new HandOverlay(canvas);
    }

    const overlay = overlayRef.current;
    overlay.setImageDimensions(canvasWidth, canvasHeight);

    if (hands.length > 0 && isCameraRunning) {
      overlay.setHands(hands.map(h => normalizeLandmarks(h.landmarks)));
    } else {
      overlay.clear();
    }
  }, [hands, canvasWidth, canvasHeight, isCameraRunning]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        display: isCameraRunning ? 'block' : 'none',
        zIndex: 10,
      }}
    />
  );
}