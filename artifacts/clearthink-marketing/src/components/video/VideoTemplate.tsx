import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, type ComponentType } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  open: 4000,
  tutor: 4500,
  adaptive: 4000,
  detection: 4500,
  close: 4000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  open: Scene1,
  tutor: Scene2,
  adaptive: Scene3,
  detection: Scene4,
  close: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-light">
      {/* Persistent Midground Layer */}
      <motion.div
        className="absolute w-[60vw] h-[60vw] rounded-full mix-blend-multiply blur-3xl pointer-events-none"
        animate={{
          x: ['-20vw', '40vw', '10vw', '50vw', '20vw'][sceneIndex],
          y: ['-20vh', '10vh', '40vh', '-10vh', '20vh'][sceneIndex],
          backgroundColor: ['#E2E8F0', '#E2E8F0', '#3B82F620', '#E2E8F0', '#E2E8F0'][sceneIndex],
          scale: [1, 1.2, 0.8, 1.5, 1][sceneIndex],
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full mix-blend-multiply blur-3xl pointer-events-none"
        animate={{
          x: ['50vw', '-10vw', '60vw', '10vw', '-20vw'][sceneIndex],
          y: ['50vh', '60vh', '-10vh', '40vh', '50vh'][sceneIndex],
          backgroundColor: ['#3B82F610', '#E2E8F0', '#E2E8F0', '#3B82F620', '#3B82F610'][sceneIndex],
          scale: [1.2, 0.9, 1.4, 0.8, 1.2][sceneIndex],
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
