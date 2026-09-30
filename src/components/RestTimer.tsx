import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer, Volume2 } from 'lucide-react';

interface RestTimerProps {
  initialSeconds?: number;
  onClose?: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ initialSeconds = 60, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(initialSeconds);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      // Try playing a friendly beep
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch {
        // AudioContext might be restricted until user gesture
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  const setTimer = (sec: number) => {
    setSelectedDuration(sec);
    setSecondsLeft(sec);
    setIsActive(false);
  };

  const progressPercent = Math.max(0, Math.min(100, ((selectedDuration - secondsLeft) / selectedDuration) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-lg flex items-center justify-between gap-3 text-zinc-200">
      <div className="flex items-center space-x-2">
        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
          <Timer className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Rest Timer</div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {formatTime(secondsLeft)}
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center space-x-1">
        {[30, 60, 90, 120].map((s) => (
          <button
            key={s}
            onClick={() => setTimer(s)}
            className={`px-2 py-1 text-xs rounded font-medium transition-all ${
              selectedDuration === s
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s}s
          </button>
        ))}
      </div>

      {/* Play/Pause & Reset */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`p-2 rounded-lg font-medium transition-all ${
            isActive
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold'
          }`}
          title={isActive ? 'Pause timer' : 'Start rest timer'}
        >
          {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <button
          onClick={() => {
            setIsActive(false);
            setSecondsLeft(selectedDuration);
          }}
          className="p-2 bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all"
          title="Reset timer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
