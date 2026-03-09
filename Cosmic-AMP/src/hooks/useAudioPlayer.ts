import { useState, useEffect, useRef, useCallback } from 'react';

export interface Track {
  id: string;
  name: string;
  filePath: string;
  fileUrl: string;
  duration?: number;
  mimeType: string;
  sizeBytes: number;
}

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  // Fix #1: expose analyser via state so consumers re-render once it's ready
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    // initialize audio context on first interaction if possible, or just setup here
    // Browsers require user interaction to start AudioContext, handled in play functions
    if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; 
        analyserRef.current = analyser;
        // Fix #1: trigger re-render so consumers receive the live AnalyserNode
        setAnalyserNode(analyser);

        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audioElementRef.current = audio;

        // Connect nodes
        const source = ctx.createMediaElementSource(audio);
        sourceNodeRef.current = source;
        source.connect(analyser);
        analyser.connect(ctx.destination);
    }
    
    const audio = audioElementRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const playTrack = useCallback(async (track: Track) => {
    const ctx = audioContextRef.current;
    const audio = audioElementRef.current;
    if (!ctx || !audio) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (currentTrack?.id === track.id) {
        if (audio.paused) {
            await audio.play();
            setIsPlaying(true);
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    } else {
        audio.src = track.fileUrl;
        audio.load();
        try {
            await audio.play();
            setIsPlaying(true);
            setCurrentTrack(track);
        } catch (e) {
            console.error("Playback error:", e);
        }
    }
  }, [currentTrack]);

  const togglePlay = useCallback(async () => {
    const ctx = audioContextRef.current;
    const audio = audioElementRef.current;
    if (!ctx || !audio) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (audio.paused) {
      if (audio.src) {
        await audio.play();
        setIsPlaying(true);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const setAudioVolume = useCallback((val: number) => {
    const audio = audioElementRef.current;
    if (audio) {
      audio.volume = val;
      setVolume(val);
    }
  }, []);
  
  const seek = useCallback((time: number) => {
      const audio = audioElementRef.current;
      if (audio) {
          audio.currentTime = time;
          setCurrentTime(time);
      }
  }, []);

  return {
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    volume,
    analyser: analyserNode, // Fix #1: state-derived, always current value
    playTrack,
    togglePlay,
    setVolume: setAudioVolume,
    seek
  };
};
