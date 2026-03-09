import React from 'react';
import { Track } from '../hooks/useAudioPlayer';
import { Play, Pause, Trash2, Music, Lock, Download } from 'lucide-react';
import { cn } from '../utils/cn';

interface TrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  selectedTrackId: string | null;
  isAdmin: boolean;
  canAccess: (track: Track) => boolean;
  onPlay: (track: Track) => void;
  onSelect: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onDownload: (track: Track) => void;
}

export const TrackList: React.FC<TrackListProps> = ({ 
  tracks, 
  currentTrack, 
  isPlaying, 
  selectedTrackId,
  isAdmin,
  canAccess,
  onPlay, 
  onSelect,
  onDelete,
  onDownload,
}) => {
  if (tracks.length === 0) {
    return (
      <div className="text-center p-8 text-[var(--cp-text-muted)] border border-dashed border-[var(--cp-border-subtle)] rounded">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>NO DATA DETECTED</p>
        <p className="text-xs mt-2">Upload audio fragments to begin analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--cp-accent-amber-500)] scrollbar-track-[var(--cp-bg-secondary)]">
      {tracks.map((track) => {
        const isActive = currentTrack?.id === track.id;
        const isSelected = selectedTrackId === track.id;
        const locked = !canAccess(track);
        const minutes = Math.floor((track.duration || 0) / 60);
        const seconds = Math.floor(track.duration || 0) % 60;
        return (
          <div
            key={track.id}
            onClick={() => onSelect(track.id)}
            className={cn(
              "flex items-center justify-between p-3 rounded border transition-all duration-200 group cursor-pointer",
              isActive 
                ? "bg-[rgba(255,165,0,0.1)] border-[var(--cp-accent-amber-400)] shadow-[var(--cp-glow-sm)]" 
                : "bg-[var(--cp-bg-tertiary)] border-[var(--cp-border-circuit)] hover:border-[var(--cp-accent-cyan-400)]",
              isSelected && 'border-[var(--cp-accent-cyan-400)]'
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                disabled={locked}
                onClick={(e) => { e.stopPropagation(); onPlay(track); }}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isActive ? "text-[var(--cp-accent-amber-400)]" : "text-[var(--cp-text-secondary)] hover:text-[var(--cp-text-primary)]",
                  locked && 'opacity-40 pointer-events-none'
                )}
              >
                {isActive && isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <div className="flex flex-col overflow-hidden">
                <span className={cn(
                  "text-sm font-medium truncate",
                  isActive ? "text-[var(--cp-text-accent)]" : "text-[var(--cp-text-primary)]"
                )}>
                  {track.name}
                </span>
                <span className="text-[10px] text-[var(--cp-text-muted)] font-mono">
                   {minutes}:{seconds.toString().padStart(2, '0')} • {Math.round((track.sizeBytes / 1024 / 1024) * 10) / 10} MB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {locked && <Lock size={14} className="text-[var(--cp-text-muted)]" />}
              {!locked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(track);
                  }}
                  className="p-2 text-[var(--cp-text-muted)] hover:text-[var(--cp-accent-cyan-400)]"
                >
                  <Download size={14} />
                </button>
              )}
              {isAdmin && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(track.id);
                  }}
                  className="p-2 text-[var(--cp-text-muted)] hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
