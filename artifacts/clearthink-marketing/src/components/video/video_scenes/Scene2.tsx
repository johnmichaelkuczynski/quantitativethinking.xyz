import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-light"
      {...sceneTransitions.wipe}
    >
      <div className="absolute inset-0 opacity-10">
        <img
          src={`${import.meta.env.BASE_URL}images/bg-brain.png`}
          alt="Brain"
          className="w-full h-full object-cover grayscale mix-blend-luminosity"
        />
      </div>

      <div className="w-full max-w-6xl px-12 grid grid-cols-2 gap-16 relative z-10">
        <div className="flex flex-col justify-center">
          <motion.h2
            className="text-[4vw] font-serif font-bold text-primary leading-tight"
            initial={{ opacity: 0, x: -40 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.8, ease: 'circOut' }}
          >
            A Tutor<br />in Every Section.
          </motion.h2>
          <motion.div
            className="w-16 h-1 bg-accent mt-8 mb-6"
            initial={{ scaleX: 0, originX: 0 }}
            animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.p
            className="text-[1.5vw] font-body text-secondary"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: 'circOut' }}
          >
            Ask questions on the exact paragraph you're reading.
          </motion.p>
        </div>

        <div className="relative flex items-center justify-center">
          <motion.div
            className="w-[30vw] h-[30vw] rounded-2xl bg-white shadow-2xl border border-border p-8 flex flex-col gap-4"
            initial={{ opacity: 0, rotateY: 30, transformPerspective: 1000, x: 100 }}
            animate={phase >= 2 ? { opacity: 1, rotateY: -10, x: 0 } : { opacity: 0, rotateY: 30, x: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="w-1/3 h-4 bg-bg-muted rounded-full" />
            <div className="w-full h-24 bg-bg-light border border-border rounded-lg p-4">
              <motion.div
                className="w-0 h-4 bg-accent/20 rounded-full mb-2"
                animate={phase >= 4 ? { width: '80%' } : { width: '0%' }}
                transition={{ duration: 1, ease: 'circOut' }}
              />
              <motion.div
                className="w-0 h-4 bg-accent/20 rounded-full"
                animate={phase >= 4 ? { width: '60%' } : { width: '0%' }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'circOut' }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}