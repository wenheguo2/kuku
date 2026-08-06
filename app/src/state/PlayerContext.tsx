import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { Track } from '@/types';
import { api } from '@/services/api';
import { useSession } from './SessionContext';

export type PlayMode = 'order' | 'repeat-all' | 'repeat-one';
const RATES = [0.8, 0.9, 1, 1.1, 1.2] as const;

interface PlayerValue {
  track: Track | null;
  queue: Track[];
  queueIndex: number;
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  playbackRate: number;
  playMode: PlayMode;
  sleepDeadline: number | null;
  play: (track: Track) => void;
  playQueue: (tracks: Track[], index?: number) => void;
  toggle: () => void;
  seek: (seconds: number) => Promise<void>;
  next: () => void;
  previous: () => void;
  cycleRate: () => void;
  cycleMode: () => void;
  setSleepTimer: (minutes: number | null) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const session = useSession();
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [track, setTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playMode, setPlayMode] = useState<PlayMode>('order');
  const [sleepDeadline, setSleepDeadline] = useState<number | null>(null);
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const modeRef = useRef<PlayMode>('order');
  const finishHandled = useRef(false);

  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }); }, []);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { rateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { modeRef.current = playMode; }, [playMode]);

  const startTrack = useCallback((next: Track) => {
    setTrack(next);
    player.replace(next.audioUrl);
    player.setPlaybackRate(rateRef.current);
    player.setActiveForLockScreen(true, { title: next.title, artist: '酷酷儿童故事', albumTitle: next.kind === 'song' ? '酷酷音乐厅' : next.kind === 'lesson' ? '成长花园' : '酷酷故事屋', artworkUrl: next.coverUrl });
    player.play();
    if (session.loggedIn && session.childId) {
      void api('/history', { method: 'POST', body: JSON.stringify({ child_id: session.childId, content_type: next.kind, content_id: next.id, content_title: next.title, last_position_ms: 0 }) }).catch(() => undefined);
    }
  }, [player, session.childId, session.loggedIn]);

  const playQueue = useCallback((tracks: Track[], index = 0) => {
    const safe = Math.min(Math.max(0, index), Math.max(0, tracks.length - 1));
    const next = tracks[safe];
    if (!next) return;
    queueRef.current = tracks; indexRef.current = safe;
    setQueue(tracks); setQueueIndex(safe); startTrack(next);
  }, [startTrack]);
  const play = useCallback((next: Track) => playQueue([next], 0), [playQueue]);

  const move = useCallback((delta: number) => {
    const items = queueRef.current;
    if (!items.length) return;
    let nextIndex = indexRef.current + delta;
    if (nextIndex < 0 || nextIndex >= items.length) {
      if (modeRef.current !== 'repeat-all') return;
      nextIndex = (nextIndex + items.length) % items.length;
    }
    const nextTrack = items[nextIndex];
    if (!nextTrack) return;
    indexRef.current = nextIndex; setQueueIndex(nextIndex); startTrack(nextTrack);
  }, [startTrack]);

  useEffect(() => {
    if (!status.didJustFinish) { finishHandled.current = false; return; }
    if (finishHandled.current) return;
    finishHandled.current = true;
    if (modeRef.current === 'repeat-one') { void player.seekTo(0).then(() => player.play()); return; }
    move(1);
  }, [move, player, status.didJustFinish]);

  useEffect(() => {
    if (!sleepDeadline) return;
    const timeout = setTimeout(() => { player.pause(); setSleepDeadline(null); }, Math.max(0, sleepDeadline - Date.now()));
    return () => clearTimeout(timeout);
  }, [player, sleepDeadline]);

  const stop = useCallback(() => { player.pause(); player.clearLockScreenControls(); setTrack(null); setQueue([]); setQueueIndex(0); queueRef.current = []; indexRef.current = 0; setSleepDeadline(null); }, [player]);
  const cycleRate = useCallback(() => {
    const current = RATES.findIndex((rate) => rate === playbackRate);
    const next = RATES[(current + 1) % RATES.length] ?? 1;
    rateRef.current = next; setPlaybackRate(next); player.setPlaybackRate(next);
  }, [playbackRate, player]);
  const cycleMode = useCallback(() => setPlayMode((mode) => {
    const next: PlayMode = mode === 'order' ? 'repeat-all' : mode === 'repeat-all' ? 'repeat-one' : 'order';
    modeRef.current = next; return next;
  }), []);

  const value = useMemo<PlayerValue>(() => ({
    track, queue, queueIndex, playing: status.playing, buffering: status.isBuffering, currentTime: status.currentTime, duration: status.duration, error: status.error,
    playbackRate, playMode, sleepDeadline, play, playQueue, toggle: () => status.playing ? player.pause() : player.play(), seek: (seconds) => player.seekTo(seconds), next: () => move(1), previous: () => move(-1), cycleRate, cycleMode,
    setSleepTimer: (minutes) => setSleepDeadline(minutes ? Date.now() + minutes * 60_000 : null), stop,
  }), [cycleMode, cycleRate, move, play, playMode, playQueue, playbackRate, player, queue, queueIndex, sleepDeadline, status.currentTime, status.duration, status.error, status.isBuffering, status.playing, stop, track]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue { const value = useContext(PlayerContext); if (!value) throw new Error('usePlayer 必须位于 PlayerProvider 内'); return value; }
