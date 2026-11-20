import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

type SplashPhase = 'ripples' | 'orb' | 'exit';

// Four layered organic wave contours echoing the fluid concentric rings concept
const ORGANIC_RING_PATHS = [
  'M 260 54 C 362 50, 462 122, 466 238 C 470 356, 384 462, 260 466 C 142 470, 56 374, 54 256 C 52 140, 146 58, 260 54 Z',
  'M 260 92 C 344 86, 424 146, 428 242 C 432 340, 360 424, 256 426 C 156 428, 92 348, 94 252 C 96 154, 168 98, 260 92 Z',
  'M 262 132 C 328 128, 388 176, 388 248 C 388 324, 330 384, 258 386 C 184 388, 134 328, 132 256 C 130 182, 188 136, 262 132 Z',
  'M 260 174 C 308 172, 348 206, 346 254 C 344 306, 304 344, 258 344 C 210 344, 174 306, 176 256 C 178 206, 212 176, 260 174 Z',
];

const MICRO_EMBERS = [
  { dx: -74, dy: -92, size: 2.2, delay: 0.22 },
  { dx: 74, dy: -78, size: 2.6, delay: 0.32 },
  { dx: 96, dy: 52, size: 2.0, delay: 0.40 },
  { dx: -90, dy: 58, size: 2.4, delay: 0.28 },
  { dx: 8, dy: -138, size: 1.8, delay: 0.45 },
  { dx: -12, dy: 132, size: 2.2, delay: 0.36 },
  { dx: -132, dy: -16, size: 1.8, delay: 0.48 },
  { dx: 134, dy: -12, size: 2.0, delay: 0.26 },
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [reducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );

  const timersRef = useRef<number[]>([]);
  const completedRef = useRef<boolean>(false);

  const [phase, setPhase] = useState<SplashPhase>(reducedMotion ? 'orb' : 'ripples');
  const [logoSrc, setLogoSrc] = useState<string>('/logo.png');

  const finishSplash = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const clearAllTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    if (reducedMotion) {
      timersRef.current.push(
        window.setTimeout(() => setPhase('exit'), 350),
        window.setTimeout(finishSplash, 600)
      );
      return () => {
        clearAllTimers();
        document.body.style.overflow = prevOverflow;
      };
    }

    // Choreography timeline:
    // 0.00s - 1.02s : Layered brand-orange organic rings expand & pull inward to center
    // 1.02s - 2.20s : Centered circular Brand Orange glowing logo orb ignites & settles
    // 2.20s - 2.74s : Smooth dissolve onto the page
    timersRef.current.push(
      window.setTimeout(() => setPhase('orb'), 1020),
      window.setTimeout(() => setPhase('exit'), 2200),
      window.setTimeout(finishSplash, 2740)
    );

    return () => {
      clearAllTimers();
      document.body.style.overflow = prevOverflow;
    };
  }, [reducedMotion]);

  const handleEarlyDismiss = () => {
    if (phase === 'exit' || completedRef.current) return;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setPhase('exit');
    timersRef.current.push(window.setTimeout(finishSplash, 260));
  };

  const isOrbVisible = phase === 'orb' || phase === 'exit';

  return (
    <motion.div
      role="presentation"
      aria-hidden="true"
      onClick={handleEarlyDismiss}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{
        duration: phase === 'exit' ? (reducedMotion ? 0.22 : 0.54) : 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden select-none bg-[#07080b] cursor-pointer"
    >
      {/* Subtle Brand Orange Ambient Glow Behind Ripples */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0.16, scale: 0.72 }}
        animate={{
          opacity: phase === 'ripples' ? [0.16, 0.48, 0.36] : phase === 'orb' ? 0.58 : 0.25,
          scale: phase === 'ripples' ? [0.72, 1.15, 0.9] : phase === 'orb' ? 1.05 : 1.12,
        }}
        transition={{
          duration: phase === 'ripples' ? 1.02 : 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none absolute w-[min(86vw,520px)] aspect-square rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(244, 123, 32, 0.36) 0%, rgba(201, 85, 16, 0.15) 38%, rgba(7, 8, 11, 0) 72%)',
        }}
      />

      {/* PHASE 1: Concentric Organic Liquid Energy Ripples */}
      {!reducedMotion && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.42 }}
          animate={
            phase === 'ripples'
              ? {
                  opacity: [0, 1, 1, 0.92],
                  scale: [0.42, 1.12, 0.92, 0.34],
                }
              : {
                  opacity: 0,
                  scale: 0.22,
                }
          }
          transition={{
            duration: phase === 'ripples' ? 1.1 : 0.34,
            times: phase === 'ripples' ? [0, 0.36, 0.72, 1] : undefined,
            ease: [0.25, 1, 0.35, 1],
          }}
          className="pointer-events-none absolute flex items-center justify-center w-[min(92vw,540px)] aspect-square"
        >
          <svg
            viewBox="0 0 520 520"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="enj-wave-grad-0" x1="12%" y1="10%" x2="88%" y2="90%">
                <stop offset="0%" stopColor="#1d1d1f" stopOpacity="0.35" />
                <stop offset="48%" stopColor="#c95510" stopOpacity="0.65" />
                <stop offset="82%" stopColor="#f47b20" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#ffb067" stopOpacity="0.92" />
              </linearGradient>
              <linearGradient id="enj-wave-grad-1" x1="8%" y1="18%" x2="86%" y2="88%">
                <stop offset="0%" stopColor="#26262a" stopOpacity="0.28" />
                <stop offset="45%" stopColor="#ea580c" stopOpacity="0.60" />
                <stop offset="84%" stopColor="#f47b20" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#ffd1a3" stopOpacity="0.94" />
              </linearGradient>
              <linearGradient id="enj-wave-grad-2" x1="20%" y1="8%" x2="84%" y2="92%">
                <stop offset="0%" stopColor="#1f2024" stopOpacity="0.24" />
                <stop offset="50%" stopColor="#c95510" stopOpacity="0.66" />
                <stop offset="86%" stopColor="#fb923c" stopOpacity="0.94" />
                <stop offset="100%" stopColor="#fff0df" stopOpacity="0.88" />
              </linearGradient>
              <radialGradient id="enj-wave-inner-bloom" cx="62%" cy="66%" r="58%">
                <stop offset="45%" stopColor="#07080b" stopOpacity="0" />
                <stop offset="84%" stopColor="#f47b20" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0.30" />
              </radialGradient>
            </defs>

            {ORGANIC_RING_PATHS.map((d, idx) => (
              <motion.g
                key={idx}
                style={{ transformOrigin: '260px 260px' }}
                initial={{ rotate: idx % 2 === 0 ? -10 : 12, scale: 0.85 + idx * 0.03 }}
                animate={{
                  rotate: idx % 2 === 0 ? 18 : -16,
                  scale: [0.85 + idx * 0.03, 1.05 - idx * 0.015, 0.92],
                }}
                transition={{
                  duration: 1.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <path
                  d={d}
                  fill="url(#enj-wave-inner-bloom)"
                  opacity={0.75 - idx * 0.14}
                />
                <path
                  d={d}
                  stroke={`url(#enj-wave-grad-${idx % 3})`}
                  strokeWidth={6 - idx * 0.8}
                  strokeOpacity={0.30}
                  strokeLinecap="round"
                />
                <path
                  d={d}
                  stroke={`url(#enj-wave-grad-${idx % 3})`}
                  strokeWidth={1.8}
                  strokeOpacity={0.96 - idx * 0.08}
                  strokeLinecap="round"
                />
              </motion.g>
            ))}

            {/* Subtle glowing embers pulled into core via GPU transform */}
            {MICRO_EMBERS.map((dot, idx) => (
              <motion.circle
                key={idx}
                cx={260}
                cy={260}
                r={dot.size}
                fill="#ffb067"
                initial={{ opacity: 0, scale: 0.5, x: dot.dx, y: dot.dy }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0.6, 1.15, 0.3],
                  x: 0,
                  y: 0,
                }}
                transition={{
                  duration: 0.92,
                  delay: dot.delay,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            ))}
          </svg>
        </motion.div>
      )}

      {/* PHASE 2: Centered Glowing Circular Brand Logo */}
      <motion.div
        initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.22 }}
        animate={{
          opacity: isOrbVisible ? 1 : 0,
          scale: phase === 'exit' ? 1.08 : isOrbVisible ? 1 : 0.22,
        }}
        transition={{
          opacity: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
          scale: {
            type: 'spring',
            stiffness: 280,
            damping: 22,
            mass: 0.85,
          },
        }}
        className="relative z-10 flex items-center justify-center"
      >
        {/* Expanding shockwave pulse ring on core ignition */}
        {!reducedMotion && isOrbVisible && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0.88, scale: 0.88 }}
            animate={{ opacity: 0, scale: 1.85 }}
            transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#f47b20]"
          />
        )}

        {/* Brand Orange Circular Halo Ring */}
        <div
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[4px] sm:p-[5px] flex items-center justify-center shadow-[0_0_48px_rgba(244,123,32,0.58),0_14px_32px_rgba(0,0,0,0.55)]"
          style={{
            background:
              'linear-gradient(140deg, #ffc285 0%, #f47b20 42%, #ea580c 72%, #c95510 100%)',
          }}
        >
          {/* Specular sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-1 h-1/2 rounded-t-full bg-gradient-to-b from-white/40 to-transparent"
          />

          {/* Pure circular ENJ logo */}
          <div className="relative w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden shadow-inner p-1">
            <img
              src={logoSrc}
              alt="ENJ Digital Concept"
              className="w-full h-full object-contain rounded-full"
              onError={() => {
                if (logoSrc !== '/assets/aistudio/logo_3018c959.png') {
                  setLogoSrc('/assets/aistudio/logo_3018c959.png');
                }
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
