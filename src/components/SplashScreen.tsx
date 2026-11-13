import React, { useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const totalDuration = prefersReducedMotion ? 350 : 1900;
    const doneTimer = window.setTimeout(() => {
      onCompleteRef.current();
    }, totalDuration);

    return () => {
      window.clearTimeout(doneTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden select-none bg-[#f6f7fa] animate-splash-backdrop pointer-events-none"
    >
      <div className="relative animate-splash-logo-zoom">
        <img
          src="/logo.png"
          alt="ENJ Digital Concept"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover bg-white shadow-[0_16px_40px_-8px_rgba(0,0,0,0.12)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/aistudio/logo_3018c959.png';
          }}
        />
      </div>
    </div>
  );
}
