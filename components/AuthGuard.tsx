
import React, { useState } from 'react';
import { User } from '../types';

interface AuthGuardProps {
  user: User | null;
  requireMember?: boolean;
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ user, requireMember, children }) => {
  const [showModal, setShowModal] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <p className="text-slate-500">Please sign in to access this feature.</p>
      </div>
    );
  }

  const isMember = user.role === 'admin' || user.role === 'member' || new Date(user.membershipExpires) > new Date();

  if (requireMember && !isMember) {
    return (
      <>
        <div className="bg-gym-red-50 dark:bg-gym-red-950/20 border border-gym-red-200 dark:border-gym-red-800 p-8 rounded-2xl text-center">
          <div className="text-4xl mb-4">💪</div>
          <h2 className="text-xl font-bold text-gym-red-900 dark:text-gym-red-100 mb-2">Wellman Members Only</h2>
          <p className="text-gym-red-800 dark:text-gym-red-200 mb-6">
            This AI feature requires an active Wellman membership.
            New accounts get 30 days free trial!
          </p>
          <button 
            className="px-6 py-2 bg-gym-red text-white rounded-full font-semibold hover:bg-gym-red-700 transition-colors"
            onClick={() => setShowModal(true)}
          >
            Upgrade Membership
          </button>
        </div>

        {/* Membership Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-gym-red-100 dark:bg-gym-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏋️</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">
                Upgrade to Wellman
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                For membership upgrades and payments, please contact J&A Fitness Co.
              </p>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  📍 Visit us at the gym front desk
                </p>
              </div>
              <button 
                className="w-full py-3 bg-gym-red text-white rounded-xl font-bold hover:bg-gym-red-700 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};
