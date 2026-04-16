import { useRef, useEffect } from 'react';
import type { NormalizedLandmark, POSE_CONNECTIONS } from '../types';

interface FullBodySkeletonProps {
  landmarks: NormalizedLandmark[];
  canvasWidth: number;
  canvasHeight: number;
  isCameraRunning: boolean;
  showOverlay?: boolean;
}

class FullBodyOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private landmarks: NormalizedLandmark[] = [];
  private hasDimensions: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Could not get canvas context");
    this.ctx = context;
  }

  public setImageDimensions(_width: number, _height: number): void {
    this.hasDimensions = true;
  }

  public setLandmarks(newLandmarks: NormalizedLandmark[]): void {
    this.landmarks = newLandmarks;
    this.draw();
  }

  public draw(): void {
    const { ctx, canvas, landmarks } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (landmarks.length === 0 || !this.hasDimensions) return;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    const connections: [number, number][] = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
      [24, 26], [26, 28]
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.beginPath();

    connections.forEach(([startIdx, endIdx]) => {
      if (landmarks[startIdx] && landmarks[endIdx]) {
        ctx.moveTo(landmarks[startIdx].x * viewWidth, landmarks[startIdx].y * viewHeight);
        ctx.lineTo(landmarks[endIdx].x * viewWidth, landmarks[endIdx].y * viewHeight);
      }
    });
    ctx.stroke();

    const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

    keyJoints.forEach((idx) => {
      const lm = landmarks[idx];
      if (!lm) return;
      
      const x = lm.x * viewWidth;
      const y = lm.y * viewHeight;

      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.restore();
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export function FullBodySkeleton({
  landmarks,
  canvasWidth,
  canvasHeight,
  isCameraRunning,
  showOverlay = true,
}: FullBodySkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<FullBodyOverlay | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!overlayRef.current) {
      overlayRef.current = new FullBodyOverlay(canvas);
    }

    const overlay = overlayRef.current;
    overlay.setImageDimensions(canvasWidth, canvasHeight);

    if (landmarks.length > 0 && isCameraRunning && showOverlay) {
      overlay.setLandmarks(landmarks);
    } else {
      overlay.clear();
    }
  }, [landmarks, canvasWidth, canvasHeight, isCameraRunning, showOverlay]);

  if (!showOverlay) return null;

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