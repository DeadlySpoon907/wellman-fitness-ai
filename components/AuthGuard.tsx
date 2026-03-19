
import React from 'react';
import { User } from '../types';

interface AuthGuardProps {
  user: User | null;
  requireMember?: boolean;
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ user, requireMember, children }) => {
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
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-8 rounded-2xl text-center">
        <div className="text-4xl mb-4">⭐</div>
        <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">Member Only Feature</h2>
        <p className="text-amber-800 dark:text-amber-200 mb-6">
          This AI feature requires an active membership. 
          New accounts get 1 month for free!
        </p>
        <button className="px-6 py-2 bg-primary-600 text-white rounded-full font-semibold hover:bg-primary-700 transition-colors">
          Upgrade Membership
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
