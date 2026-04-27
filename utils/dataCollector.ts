/**
 * Data Collection Utility for Model Improvement
 *
 * Allows users to opt-in to sharing anonymized pose feature vectors
 * to improve local AI models (BMI estimator, exercise classifier).
 *
 * Data is stored locally and can be exported as JSON for retraining.
 */

export interface TrainingSample {
  features: number[];       // 28-dim feature vector for BMI model, 12-dim for exercise (or both)
  exerciseLabel?: string;   // Detected exercise (if any)
  bmi?: number;             // Known BMI if user has it (optional)
  timestamp: number;
  sessionId: string;
  // No personal identifiers
}

const STORAGE_KEY = 'wellman_training_data_v1';
const CONSENT_KEY = 'wellman_data_collection_consent';
const SESSION_KEY = 'wellman_session_id';

export class DataCollector {
  private consent: boolean;
  private sessionId: string;

  constructor() {
    this.consent = localStorage.getItem(CONSENT_KEY) === 'true';
    this.sessionId = this.getOrCreateSessionId();
  }

  /** Ask user for consent (call from UI on first load) */
  async requestConsent(): Promise<boolean> {
    // In a real app, show a modal. Here we just check/return status.
    return this.consent;
  }

  setConsent(given: boolean) {
    this.consent = given;
    localStorage.setItem(CONSENT_KEY, given ? 'true' : 'false');
  }

  hasConsent(): boolean {
    return this.consent;
  }

  private getOrCreateSessionId(): string {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  /** Capture a training sample from current pose */
  capture(features: number[], exerciseLabel?: string, bmi?: number) {
    if (!this.consent) return;

    const sample: TrainingSample = {
      features,
      exerciseLabel,
      bmi,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    const data = this.getAll();
    data.push(sample);

    // Keep last 1000 samples to limit storage
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Capture both BMI & exercise features in one call */
  captureBoth(bmiFeatures: number[], exerciseFeatures: number[], exerciseLabel?: string) {
    // Store combined sample with a flag
    if (!this.consent) return;

    const sample: TrainingSample & { exerciseFeatures?: number[] } = {
      features: bmiFeatures,
      exerciseLabel,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      exerciseFeatures
    };

    const data = this.getAll();
    data.push(sample as any);

    if (data.length > 1000) data.splice(0, data.length - 1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getAll(): TrainingSample[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /** Export collected data as JSON string for download */
  exportData(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /** Clear all collected data */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Get statistics */
  getStats(): { totalSamples: number; exercises: Record<string, number> } {
    const data = this.getAll();
    const exercises: Record<string, number> = {};
    for (const s of data) {
      if (s.exerciseLabel) {
        exercises[s.exerciseLabel] = (exercises[s.exerciseLabel] || 0) + 1;
      }
    }
    return { totalSamples: data.length, exercises };
  }
}

// Singleton instance
let collectorInstance: DataCollector | null = null;

export function getDataCollector(): DataCollector {
  if (!collectorInstance) {
    collectorInstance = new DataCollector();
  }
  return collectorInstance;
}
