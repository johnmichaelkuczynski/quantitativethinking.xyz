import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-primary"
      {...sceneTransitions.splitHorizontal}
    >
      <div className="absolute inset-0 opacity-30">
        <img
          src={`${import.meta.env.BASE_URL}images/bg-keystroke.png`}
          alt="Keystrokes"
          className="w-full h-full object-cover mix-blend-screen"
        />
        <div className="absolute inset-0 bg-primary/40" />
      </div>

      <div className="w-full max-w-6xl px-12 grid grid-cols-2 gap-16 relative z-10">
        <div className="relative h-[30vw]">
          <motion.div
            className="absolute right-0 top-1/4 w-[25vw] h-32 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="text-accent font-mono text-sm mb-2">GPTZero Classifier</div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={phase >= 4 ? { width: '85%' } : { width: 0 }}
                transition={{ duration: 1, ease: 'circOut' }}
              />
            </div>
          </motion.div>

          <motion.div
            className="absolute left-0 bottom-1/4 w-[25vw] h-32 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="text-white font-mono text-sm mb-2">Keystroke Behavior</div>
            <div className="flex gap-2 h-8 items-end">
              {[4, 8, 3, 12, 6, 9].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-white/40 rounded-sm"
                  initial={{ height: 0 }}
                  animate={phase >= 4 ? { height: `${h * 10}%` } : { height: 0 }}
                  transition={{ duration: 0.5, delay: phase >= 4 ? i * 0.1 : 0 }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col justify-center">
          <motion.h2
            className="text-[4vw] font-serif font-bold text-text-inverse leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, ease: 'circOut' }}
          >
            Two-Layer<br />Authorship<br />Detection.
          </motion.h2>
          <motion.p
            className="text-[1.5vw] font-body text-text-inverse/70"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'circOut' }}
          >
            Text classification + diachronic keystroke analysis. Proof of work on every submission.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}