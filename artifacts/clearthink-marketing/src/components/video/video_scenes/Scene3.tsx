import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
      setTimeout(() => setPhase(5), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-light overflow-hidden"
      {...sceneTransitions.morphExpand}
    >
      <div className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-accent/5 -skew-x-12 translate-x-32" />

      <div className="w-full max-w-6xl px-12 flex flex-col items-center text-center relative z-10">
        <motion.h2
          className="text-[4.5vw] font-serif font-bold text-primary leading-tight mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: 'circOut' }}
        >
          Adaptive Practice.
        </motion.h2>

        <div className="flex gap-8 mt-8">
          {[1, 2, 3, 4].map((level, i) => (
            <motion.div
              key={level}
              className={`w-[12vw] h-[16vw] rounded-xl border-2 flex items-center justify-center text-4xl font-serif font-bold
                ${i === 2 ? 'bg-primary text-white border-primary' : 'bg-white border-border text-secondary'}`}
              initial={{ opacity: 0, y: 50, rotateX: -20, transformPerspective: 800 }}
              animate={phase >= 2 ? { opacity: 1, y: i === 2 ? -20 : 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: phase >= 2 ? i * 0.1 : 0 }}
            >
              L{level}
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-[1.8vw] font-body text-secondary mt-16"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 4 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
        >
          Difficulty adjusts in real time based on performance.
        </motion.p>
      </div>
    </motion.div>
  );
}