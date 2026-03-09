import React, { useRef } from 'react';
import { Play, Pause, Volume2, SkipBack, SkipForward, VolumeX } from 'lucide-react';
import { CyberButton } from './ui/CyberButton';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      onSeek(pos * duration);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-[var(--cp-border-circuit-strong)] bg-[var(--cp-bg-surface)] rounded-md shadow-[var(--cp-glow-sm)]">
      {/* Progress Bar */}
      <div 
        className="relative w-full h-2 bg-[var(--cp-bg-tertiary)] rounded-full cursor-pointer group"
        ref={progressBarRef}
        onClick={handleSeek}
      >
        <div 
          className="absolute top-0 left-0 h-full bg-[var(--cp-accent-amber-500)] rounded-full transition-all duration-100 ease-linear shadow-[var(--cp-glow-md)]"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--cp-text-primary)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] font-mono text-[var(--cp-text-muted)]">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center gap-2 group w-24">
          <button 
            onClick={() => onVolumeChange(volume === 0 ? 0.5 : 0)}
            className="text-[var(--cp-text-secondary)] hover:text-[var(--cp-text-primary)]"
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-[var(--cp-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--cp-accent-cyan-400)]"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <CyberButton 
            className="p-2 rounded-full !border-0" 
            onClick={onPrev}
            disabled={!onPrev}
          >
            <SkipBack size={20} />
          </CyberButton>
          
          <CyberButton 
            className="p-4 rounded-full border-2 !border-[var(--cp-accent-amber-400)] text-[var(--cp-accent-amber-400)] hover:bg-[var(--cp-accent-amber-400)] hover:text-black shadow-[var(--cp-glow-amber)]" 
            onClick={onPlayPause}
            glow
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </CyberButton>

          <CyberButton 
            className="p-2 rounded-full !border-0" 
            onClick={onNext}
            disabled={!onNext}
          >
            <SkipForward size={20} />
          </CyberButton>
        </div>

        {/* Placeholder for layout balance */}
        <div className="w-24"></div> 
      </div>
    </div>
  );
};
