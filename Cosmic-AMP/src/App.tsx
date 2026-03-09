import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Shield,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Track, useAudioPlayer } from './hooks/useAudioPlayer';
import { Visualizer } from './components/Visualizer';
import { CyberCard } from './components/ui/CyberCard';
import { CyberButton } from './components/ui/CyberButton';
import { TrackList } from './components/TrackList';
import { PlayerControls } from './components/PlayerControls';
import { adminEmail, isSupabaseConfigured, supabase, tracksBucket } from './lib/supabase';
import celestialData from './data/celestial_tracks.json';

/** Celestial Garden tracks — built-in, always publicly accessible */
const celestialTracks: Track[] = celestialData.phases.flatMap((phase, _pi) =>
  phase.tracks.map((t, ti) => ({
    id: `celestial-${phase.id}-${ti}`,
    name: t.title,
    filePath: t.url,
    fileUrl: t.url,
    mimeType: 'audio/mpeg',
    sizeBytes: 0,
    isPublic: true,
    group: phase.title,
  })),
);

type DbTrack = {
  id: string;
  title: string;
  file_path: string;
  duration: number | null;
  mime_type: string;
  size_bytes: number;
};

type TokenRecord = {
  id: string;
  token: string;
  used_count: number;
  max_uses: number;
  expires_at: string | null;
};

const randomToken = () =>
  `MYTH-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`;

const isAllowedType = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(file.type) || ['mp3', 'wav'].includes(ext || '');
};

export function App() {
  const { isPlaying, currentTrack, currentTime, duration, volume, analyser, playTrack, togglePlay, setVolume, seek } =
    useAudioPlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [unlockedTrackIds, setUnlockedTrackIds] = useState<Set<string>>(new Set());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [tokenInput, setTokenInput] = useState('');
  const [tokenMessage, setTokenMessage] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId],
  );

  const canAccess = useCallback(
    (track: Track) => track.isPublic || isAdmin || unlockedTrackIds.has(track.id),
    [isAdmin, unlockedTrackIds],
  );

  const loadTracks = useCallback(async () => {
    const sb = supabase;
    // Always show celestial tracks; Supabase tracks are additive
    if (!sb) {
      setTracks([...celestialTracks]);
      setSelectedTrackId((prev) => prev || celestialTracks[0]?.id || null);
      return;
    }
    setIsLoading(true);
    const { data, error } = await sb.from('tracks').select('*').order('created_at', { ascending: false });
    if (error) {
      setTokenMessage(`Track load failed: ${error.message}`);
      setTracks([...celestialTracks]);
      setIsLoading(false);
      return;
    }

    const mapped = ((data as DbTrack[]) || []).map((track) => ({
      id: track.id,
      name: track.title,
      filePath: track.file_path,
      fileUrl: sb.storage.from(tracksBucket).getPublicUrl(track.file_path).data.publicUrl,
      duration: track.duration || 0,
      mimeType: track.mime_type,
      sizeBytes: track.size_bytes,
      group: 'My Vault',
    }));

    // Merge: celestial built-ins first, then Supabase uploads
    const merged = [...celestialTracks, ...mapped];
    setTracks(merged);
    setSelectedTrackId((prev) => prev || merged[0]?.id || null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const sb = supabase;

    const init = async () => {
      if (sb) {
        const { data } = await sb.auth.getSession();
        const userEmail = data.session?.user?.email || '';
        setIsAdmin(userEmail.length > 0 && userEmail === adminEmail);
      }
      // Always load tracks — celestial tracks show even without Supabase
      await loadTracks();
    };

    void init();
  }, [loadTracks]);

  const handleAdminLogin = async () => {
    if (!supabase) return;
    setTokenMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setTokenMessage(`Admin login failed: ${error.message}`);
      return;
    }

    const userEmail = data.user?.email || '';
    if (userEmail !== adminEmail) {
      await supabase.auth.signOut();
      setIsAdmin(false);
      setTokenMessage('User is not configured as admin. Set VITE_ADMIN_EMAIL correctly.');
      return;
    }

    setIsAdmin(true);
    setTokenMessage('Admin access granted.');
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsAdmin(false);
    setGeneratedToken('');
  };

  const handleUpload = async (files: FileList | null) => {
    if (!supabase || !isAdmin || !files?.length) return;

    const candidates = Array.from(files).filter((file) => isAllowedType(file));
    if (candidates.length === 0) {
      setTokenMessage('Only .mp3 and .wav files are accepted.');
      return;
    }

    setIsUploading(true);
    for (const file of candidates) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${Date.now()}-${safeName}`;

      const uploadResult = await supabase.storage.from(tracksBucket).upload(storagePath, file, {
        contentType: file.type || 'audio/mpeg',
        upsert: false,
      });

      if (uploadResult.error) {
        setTokenMessage(`Upload failed: ${uploadResult.error.message}`);
        continue;
      }

      const { error: insertError } = await supabase.from('tracks').insert({
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_path: storagePath,
        mime_type: file.type || 'audio/mpeg',
        size_bytes: file.size,
      });

      if (insertError) {
        setTokenMessage(`DB insert failed: ${insertError.message}`);
      }
    }

    await loadTracks();
    setIsUploading(false);
  };

  const handleDelete = async (trackId: string) => {
    if (!supabase || !isAdmin) return;
    const track = tracks.find((item) => item.id === trackId);
    if (!track) return;

    await supabase.storage.from(tracksBucket).remove([track.filePath]);
    await supabase.from('tracks').delete().eq('id', trackId);
    await loadTracks();
  };

  const handleGenerateToken = async () => {
    if (!supabase || !isAdmin || !selectedTrack) return;
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('access_tokens').insert({
      token,
      track_id: selectedTrack.id,
      max_uses: 1,
      used_count: 0,
      expires_at: expiresAt,
    });

    if (error) {
      setTokenMessage(`Token create failed: ${error.message}`);
      return;
    }

    setGeneratedToken(token);
    setTokenMessage('One-time token generated (valid for 24h).');
  };

  const handleRedeemToken = async () => {
    if (!supabase || !selectedTrack || !tokenInput.trim()) return;

    const { data, error } = await supabase
      .from('access_tokens')
      .select('id, token, used_count, max_uses, expires_at')
      .eq('token', tokenInput.trim())
      .eq('track_id', selectedTrack.id)
      .maybeSingle();

    if (error || !data) {
      setTokenMessage('Token invalid for this track.');
      return;
    }

    const tokenData = data as TokenRecord;
    if (tokenData.expires_at && new Date(tokenData.expires_at).getTime() < Date.now()) {
      setTokenMessage('Token expired.');
      return;
    }
    if (tokenData.used_count >= tokenData.max_uses) {
      setTokenMessage('Token already consumed.');
      return;
    }

    const { error: updateError } = await supabase
      .from('access_tokens')
      .update({ used_count: tokenData.used_count + 1 })
      .eq('id', tokenData.id);

    if (updateError) {
      setTokenMessage(`Token update failed: ${updateError.message}`);
      return;
    }

    setUnlockedTrackIds((prev) => new Set(prev).add(selectedTrack.id));
    setTokenInput('');
    setTokenMessage('Token accepted. Track unlocked for playback/download in this session.');
  };

  const handleDownload = (track: Track) => {
    if (!canAccess(track)) {
      setTokenMessage('Redeem a valid token first.');
      return;
    }

    const link = document.createElement('a');
    link.href = track.fileUrl;
    link.download = `${track.name}.${track.mimeType.includes('wav') ? 'wav' : 'mp3'}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <Visualizer analyser={analyser} isPlaying={isPlaying} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8">
        <CyberCard className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-[var(--cp-font-display)] text-2xl tracking-wider text-[var(--cp-accent-amber-400)]">
                AETHER MUSIC VAULT
              </h1>
              <span className="cp-annotation">MP3 / WAV</span>
            </div>

            {!isSupabaseConfigured && (
              <p className="text-sm text-red-300">Supabase env vars are missing. Configure .env for cloud storage.</p>
            )}

            <TrackList
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              selectedTrackId={selectedTrackId}
              isAdmin={isAdmin}
              canAccess={canAccess}
              onPlay={(track) => {
                setSelectedTrackId(track.id);
                if (!canAccess(track)) {
                  setTokenMessage('Track locked. Redeem token first.');
                  return;
                }
                playTrack(track);
              }}
              onSelect={setSelectedTrackId}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />

            <div className="flex items-center gap-3">
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="One-time token for selected track"
                className="h-10 flex-1 border border-[var(--cp-border-circuit)] bg-black/40 px-3 text-sm outline-none focus:border-[var(--cp-accent-cyan-400)]"
              />
              <CyberButton onClick={handleRedeemToken}>
                <KeyRound size={14} />
                REDEEM
              </CyberButton>
            </div>
            {tokenMessage && <p className="text-xs text-[var(--cp-text-secondary)]">{tokenMessage}</p>}
            {isLoading && <Loader2 className="animate-spin text-[var(--cp-accent-amber-400)]" size={20} />}
          </section>

          <section className="space-y-5 border-t border-[var(--cp-border-circuit)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="space-y-2">
              <h2 className="font-[var(--cp-font-display)] text-lg text-[var(--cp-accent-cyan-400)]">Admin Access</h2>
              {!isAdmin ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin email"
                    className="h-10 w-full border border-[var(--cp-border-circuit)] bg-black/40 px-3 text-sm outline-none focus:border-[var(--cp-accent-cyan-400)]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    className="h-10 w-full border border-[var(--cp-border-circuit)] bg-black/40 px-3 text-sm outline-none focus:border-[var(--cp-accent-cyan-400)]"
                  />
                  <CyberButton onClick={handleAdminLogin}>
                    <LogIn size={14} />
                    LOGIN
                  </CyberButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[var(--cp-accent-amber-400)]">
                    <Shield size={16} />
                    <span className="text-sm">Admin authenticated</span>
                  </div>
                  <label className="relative inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-[var(--cp-border-circuit)] px-4 py-2 text-sm text-[var(--cp-accent-amber-400)]">
                    <Upload size={14} />
                    {isUploading ? 'Uploading...' : 'Upload MP3/WAV'}
                    <input
                      type="file"
                      accept=".mp3,.wav,audio/mpeg,audio/wav"
                      multiple
                      onChange={(e) => void handleUpload(e.target.files)}
                      className="absolute inset-0 opacity-0"
                    />
                  </label>
                  <CyberButton onClick={handleGenerateToken} disabled={!selectedTrack}>
                    <Sparkles size={14} />
                    GENERATE ONE-TIME TOKEN
                  </CyberButton>
                  {generatedToken && <p className="break-all text-xs text-[var(--cp-text-secondary)]">{generatedToken}</p>}
                  <CyberButton onClick={handleLogout}>
                    <LogOut size={14} />
                    LOGOUT
                  </CyberButton>
                </div>
              )}
            </div>

            <PlayerControls
              isPlaying={isPlaying}
              onPlayPause={togglePlay}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              onVolumeChange={setVolume}
              onSeek={(t) => seek(t)}
              onNext={undefined}
              onPrev={undefined}
            />
          </section>
        </CyberCard>
      </div>
    </div>
  );
}

export default App;
