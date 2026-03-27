
import React, { useState, useRef } from 'react';
import { User, BmiEstimation } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { saveUser } from '../services/DB';
import { CameraCapture } from '../components/CameraCapture';
import { estimateBmiFromPhoto } from '../services/geminiService';

const BmiEstimator: React.FC<{ user: User, onUpdateProfile: () => void; apiKey?: string }> = ({ user, onUpdateProfile, apiKey }) => {
  const [image, setImage] = useState<string | null>(null);
  const [estimation, setEstimation] = useState<BmiEstimation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <div className="p-12 text-center text-slate-400 font-medium">Loading user profile...</div>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        processImage(base64, file.type);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCameraCapture = (capturedImage: string) => {
    const base64 = capturedImage.split(',')[1];
    const mimeType = capturedImage.split(';')[0].split(':')[1];
    setImage(capturedImage);
    processImage(base64, mimeType);
  };

  const processImage = async (base64: string, mimeType: string = "image/jpeg") => {
    setIsProcessing(true);
    setEstimation(null);
    try {
      // Use Gemini AI service directly for BMI estimation
      const result = await estimateBmiFromPhoto(base64, apiKey);
      setEstimation(result);
    } catch (err) {
      console.error(err);
      alert("BMI estimation failed. Please ensure you have a valid API key configured.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateProfile = async () => {
    if (estimation && user) {
      const updatedUser = { 
        ...user, 
        heightCm: estimation.estimatedHeightCm,
        weightLogs: [...(user.weightLogs || []), { date: new Date().toISOString(), weight: estimation.estimatedWeightKg }]
      };
      await saveUser(updatedUser);
      onUpdateProfile();
      alert("Profile updated with estimated metrics!");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-1">
           <span className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">Advanced Algorithm</span>
           <h2 className="text-3xl font-black">Visual BMI Estimator</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Precision geometry-based body metric analysis.</p>
      </section>

      <AuthGuard user={user} requireMember>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-950/20 rounded-2xl text-sm text-primary-800 dark:text-primary-200 leading-relaxed border border-primary-100 dark:border-primary-900/30">
              <h4 className="font-black mb-1 flex items-center gap-2 uppercase text-xs tracking-widest">
                <span className="text-lg">🎯</span> Calibration Required
              </h4>
              <p>For accurate results, you <strong>MUST</strong> stand exactly <strong>2 meters (6.5 feet)</strong> away from the camera. Your full body, from head to toe, must be visible.</p>
            </div>
            
            <div 
              className="aspect-[3/4] w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden relative"
            >
              {image ? (
                <img src={image} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-8">
                  <span className="text-6xl mb-4 block">🧍‍♂️</span>
                  <p className="text-slate-400 font-bold">Provide Full-Body Photo</p>
                </div>
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white flex-col">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                  <span className="font-black tracking-widest uppercase text-sm">Running Volumetric Analysis...</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3 mt-6">
              <button 
                onClick={() => setShowCamera(true)}
                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-3"
              >
                <span>📸</span> START MEASUREMENT
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                UPLOAD FROM FILES
              </button>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold mb-6">Algorithm Output</h3>
              {estimation ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-1">Calculated Height</div>
                      <div className="text-2xl font-black">{estimation.estimatedHeightCm} cm</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-1">Estimated Weight</div>
                      <div className="text-2xl font-black">{estimation.estimatedWeightKg} kg</div>
                    </div>
                  </div>

                  <div className="p-6 bg-primary-50 dark:bg-primary-950/20 rounded-3xl flex flex-col items-center text-center border border-primary-100 dark:border-primary-900/30">
                    <div className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-2">Precision BMI</div>
                    <div className="text-5xl font-black text-primary-700 dark:text-primary-300 mb-2">{estimation.bmi.toFixed(1)}</div>
                    <div className="px-4 py-1 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-100 rounded-full text-xs font-bold">
                      {estimation.bmi < 18.5 ? 'Underweight' : estimation.bmi < 25 ? 'Normal' : estimation.bmi < 30 ? 'Overweight' : 'Obese'}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm text-slate-600 dark:text-slate-400">
                    <h4 className="font-bold mb-2 uppercase text-[10px] tracking-widest text-slate-400">Analysis Summary</h4>
                    {estimation.notes}
                  </div>

                  <button 
                    onClick={updateProfile}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                  >
                    Sync to Profile Database
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <div className="text-6xl mb-4">🔬</div>
                  <p className="text-center font-bold">Waiting for visual capture...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AuthGuard>

      {showCamera && (
        <CameraCapture 
          aspectRatio="portrait"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default BmiEstimator;
