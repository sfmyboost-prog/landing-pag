
import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-[2px] transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <div className={`relative flex flex-col items-center transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full w-32 h-32 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"></div>
        
        {/* Main Spinner Container */}
        <div className="relative w-16 h-16">
          {/* Outer Ring */}
          <div className="absolute inset-0 border-4 border-indigo-50 rounded-full"></div>
          
          {/* Animated Inner Ring (Gradient) */}
          <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 border-r-indigo-400 rounded-full animate-spin"></div>
          
          {/* Center Brand Dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shadow-lg shadow-indigo-500/50"></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-6">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">
            Loading
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
