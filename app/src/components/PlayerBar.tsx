import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '@/state/PlayerContext';
import { useSession } from '@/state/SessionContext';
import { api } from '@/services/api';
import { colors, Cover, StatusPill } from './Ui';
import { Icon } from './Icon';

interface FavoriteItem { favorite_id: string; content_type: string; content_id: string }
function time(value: number): string { if (!Number.isFinite(value)) return '0:00'; const sec = Math.max(0, Math.floor(value)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
const MODE_LABEL = { order: '顺序播放', 'repeat-all': '列表循环', 'repeat-one': '单曲循环' } as const;

export function PlayerBar() {
  const p = usePlayer();
  const session = useSession();
  const [expanded, setExpanded] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyrics, setLyrics] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteId(null);
    if (!session.loggedIn || !p.track) return;
    void api<{ list: FavoriteItem[] }>('/favorites').then((result) => setFavoriteId(result.list.find((item) => item.content_type === p.track?.kind && item.content_id === p.track?.id)?.favorite_id ?? null)).catch(() => undefined);
  }, [p.track?.id, session.loggedIn]);

  useEffect(() => {
    setLyrics([]);
    if (!p.track?.lyricsUrl) return;
    const controller = new AbortController();
    void fetch(p.track.lyricsUrl, { signal: controller.signal }).then((response) => response.ok ? response.text() : '').then((text) => setLyrics(text.split(/\r?\n/).map((line) => line.replace(/^\[[^\]]+\]\s*/, '').trim()).filter((line) => line && !line.includes('|') && !/^\[.*\]$/.test(line) && !/^[（(].*[）)]$/.test(line)).slice(0, 80))).catch(() => undefined);
    return () => controller.abort();
  }, [p.track?.lyricsUrl]);

  if (!p.track) return null;
  const progress = p.duration > 0 ? Math.min(100, Math.max(0, p.currentTime / p.duration * 100)) : 0;
  const timerMinutes = p.sleepDeadline ? Math.max(0, Math.ceil((p.sleepDeadline - Date.now()) / 60_000)) : null;

  const toggleFavorite = async () => {
    if (!session.loggedIn) { Alert.alert('请先由监护人登录', '登录后可在 App 账号内同步收藏，不会读取微信小程序收藏。'); return; }
    try {
      if (favoriteId) { await api(`/favorites/${favoriteId}`, { method: 'DELETE' }); setFavoriteId(null); }
      else { const result = await api<{ favorite_id: string }>('/favorites', { method: 'POST', body: JSON.stringify({ content_type: p.track?.kind, content_id: p.track?.id, content_title: p.track?.title }) }); setFavoriteId(result.favorite_id); }
    } catch (e) { Alert.alert('收藏操作失败', e instanceof Error ? e.message : '请稍后重试'); }
  };

  return <>
    <Pressable onPress={() => setExpanded(true)} style={styles.wrap}>
      <Cover uri={p.track.coverUrl} size={48} /><View style={styles.meta}><Text numberOfLines={1} style={styles.title}>{p.track.title}</Text><Text style={styles.time}>{p.buffering ? '缓冲中…' : p.error ? '播放失败' : `${time(p.currentTime)} / ${time(p.duration)} · ${p.playbackRate.toFixed(1)}x`}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={p.playing ? '暂停' : '播放'} onPress={(event) => { event.stopPropagation(); p.toggle(); }} style={styles.round}><Icon name={p.playing ? 'pause' : 'play'} size={21} color="#fff" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="关闭播放器" onPress={(event) => { event.stopPropagation(); p.stop(); }} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
    </Pressable>

    <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
      <SafeAreaView style={styles.playerPage}>
        <View style={styles.playerTop}><Pressable onPress={() => setExpanded(false)} style={styles.back}><Icon name="back" size={30} color="#fff" /></Pressable><Text style={styles.brand}>酷酷儿童故事</Text><Pressable onPress={() => void Share.share({ message: `我正在酷酷儿童故事听《${p.track?.title}》` })} style={styles.back}><Icon name="share" size={25} color="#fff" /></Pressable></View>
        <ScrollView contentContainerStyle={styles.playerContent}>
          <StatusPill tone={p.track.kind === 'song' ? 'purple' : p.track.kind === 'lesson' ? 'green' : 'orange'}>{p.track.kind === 'song' ? '酷酷音乐厅' : p.track.kind === 'lesson' ? '成长课堂' : '故事灯'}</StatusPill>
          {p.track.coverUrl ? <Image source={{ uri: p.track.coverUrl }} style={styles.artwork} /> : <View style={[styles.artworkFallback, p.track.kind === 'lesson' && styles.lessonArtwork]}>{p.track.kind === 'lesson' ? <Text style={styles.lessonWord}>{p.track.lessonText}</Text> : <Icon name={p.track.kind === 'song' ? 'music' : 'book'} size={104} color={colors.orange} />}</View>}
          <Text numberOfLines={2} style={styles.trackTitle}>{p.track.title}</Text><Text style={styles.album}>{p.track.kind === 'song' ? '听儿歌 · 唱起来 · 快乐成长' : p.track.kind === 'lesson' ? `${p.track.subject ?? '成长'} · 认一认 · 懂一懂 · 用一用` : '关灯也能听 · 支持后台与锁屏播放'}</Text>
          {p.track.kind === 'song' ? <View style={styles.lyricsBox}><Text style={styles.lyricsTitle}>歌词</Text><ScrollView style={styles.lyricsScroll} nestedScrollEnabled>{lyrics.length ? lyrics.map((line, index) => <Text key={`${line}-${index}`} style={styles.lyricLine}>{line}</Text>) : <Text style={styles.lyricEmpty}>暂无歌词</Text>}</ScrollView></View> : null}

          <View style={styles.actions}>
            <Action icon="heart" label={favoriteId ? '已收藏' : '收藏'} active={!!favoriteId} onPress={() => void toggleFavorite()} />
            <Pressable onPress={p.cycleRate} style={styles.action}><Text style={styles.rate}>{p.playbackRate.toFixed(1)}x</Text><Text style={styles.actionLabel}>倍速</Text></Pressable>
            <Action icon="timer" label={timerMinutes ? `${timerMinutes} 分` : '定时'} active={timerOpen || !!timerMinutes} onPress={() => { setTimerOpen((v) => !v); setQueueOpen(false); }} />
            <Action icon="list" label={`${p.queueIndex + 1}/${p.queue.length}`} active={queueOpen} onPress={() => { setQueueOpen((v) => !v); setTimerOpen(false); }} />
          </View>

          {timerOpen ? <View style={styles.panel}><Text style={styles.panelTitle}>睡眠定时</Text><View style={styles.timerChoices}>{[15, 30, 60].map((minutes) => <Pressable key={minutes} onPress={() => { p.setSleepTimer(minutes); setTimerOpen(false); }} style={styles.timerChoice}><Text style={styles.timerText}>{minutes} 分钟</Text></Pressable>)}<Pressable onPress={() => { p.setSleepTimer(null); setTimerOpen(false); }} style={styles.timerChoice}><Text style={styles.timerText}>关闭</Text></Pressable></View></View> : null}
          {queueOpen ? <View style={styles.panel}><Text style={styles.panelTitle}>播放列表 · {MODE_LABEL[p.playMode]}</Text>{p.queue.map((item, index) => <Pressable key={`${item.id}-${index}`} onPress={() => p.playQueue(p.queue, index)} style={[styles.queueRow, index === p.queueIndex && styles.queueRowActive]}><Icon name={item.kind === 'song' ? 'music' : item.kind === 'lesson' ? 'sprout' : 'book'} size={18} color={index === p.queueIndex ? colors.orange : '#ABB3CF'} /><Text numberOfLines={1} style={[styles.queueTitle, index === p.queueIndex && { color: colors.orange }]}>{item.title}</Text></Pressable>)}</View> : null}

          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]} /></View><View style={styles.timeRow}><Text style={styles.darkTime}>{time(p.currentTime)}</Text><Text style={styles.darkTime}>{time(p.duration)}</Text></View>
          <View style={styles.controls}><Pressable accessibilityRole="button" accessibilityLabel="上一首" onPress={p.previous} style={styles.secondary}><Icon name="prev" size={29} color="#DCE2FA" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={p.playing ? '暂停' : '播放'} onPress={p.toggle} style={styles.mainControl}><Icon name={p.playing ? 'pause' : 'play'} size={34} color="#fff" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="下一首" onPress={p.next} style={styles.secondary}><Icon name="next" size={29} color="#DCE2FA" /></Pressable></View>
          <Pressable onPress={p.cycleMode} style={styles.modeButton}><Icon name="refresh" size={18} color="#ABB3CF" /><Text style={styles.modeText}>{MODE_LABEL[p.playMode]}</Text></Pressable>
          <View style={styles.seekRow}><Pressable onPress={() => void p.seek(Math.max(0, p.currentTime - 15))}><Text style={styles.seekText}>↶ 后退 15 秒</Text></Pressable><Pressable onPress={() => void p.seek(Math.min(p.duration || p.currentTime + 15, p.currentTime + 15))}><Text style={styles.seekText}>前进 15 秒 ↷</Text></Pressable></View>
          <Pressable onPress={() => { p.stop(); setExpanded(false); }} style={styles.stopButton}><Text style={styles.stopText}>结束播放</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}

function Action({ icon, label, active, onPress }: { icon: 'heart' | 'timer' | 'list'; label: string; active?: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.action}><Icon name={icon} size={25} color={active ? colors.orange : '#ABB3CF'} /><Text style={[styles.actionLabel, active && { color: colors.orange }]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 6, padding: 10, backgroundColor: '#FFFDFB', borderWidth: 1, borderColor: colors.line, borderRadius: 20 }, meta: { flex: 1 }, title: { color: colors.ink, fontWeight: '800', fontSize: 15 }, time: { color: colors.muted, fontSize: 12, marginTop: 4 }, round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }, close: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 27, color: colors.muted },
  playerPage: { flex: 1, backgroundColor: '#151B31' }, playerTop: { minHeight: 58, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, brand: { color: '#fff', fontSize: 16, fontWeight: '800' }, playerContent: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 10, paddingBottom: 40 }, artwork: { width: 270, height: 270, borderRadius: 28, marginTop: 20, backgroundColor: '#28304D' }, artworkFallback: { width: 220, height: 220, borderRadius: 110, marginTop: 30, backgroundColor: '#252D4B', borderWidth: 2, borderColor: '#FF9A56', alignItems: 'center', justifyContent: 'center' }, lessonArtwork: { borderRadius: 32, backgroundColor: '#E7F6E4', borderColor: '#65B95B' }, lessonWord: { color: '#347E31', fontSize: 112, fontWeight: '900' }, trackTitle: { color: '#F7F2FF', fontSize: 27, lineHeight: 34, fontWeight: '900', textAlign: 'center', marginTop: 22 }, album: { color: '#9AA4C7', fontSize: 13, marginTop: 8, textAlign: 'center' },
  lyricsBox: { width: '100%', marginTop: 16, padding: 13, borderRadius: 17, backgroundColor: '#202945' }, lyricsTitle: { color: '#F1F3FF', textAlign: 'center', fontWeight: '900', marginBottom: 7 }, lyricsScroll: { maxHeight: 112 }, lyricLine: { color: '#BFC7E2', textAlign: 'center', lineHeight: 25, fontSize: 13 }, lyricEmpty: { color: '#7E89AA', textAlign: 'center', paddingVertical: 20 },
  actions: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', marginTop: 22 }, action: { minWidth: 58, minHeight: 54, alignItems: 'center', justifyContent: 'center' }, actionLabel: { color: '#ABB3CF', fontSize: 11, marginTop: 5 }, rate: { color: '#ABB3CF', fontSize: 18, fontWeight: '900' }, panel: { width: '100%', backgroundColor: '#202945', borderRadius: 18, marginTop: 10, padding: 14 }, panelTitle: { color: '#F1F3FF', fontWeight: '900', marginBottom: 10 }, timerChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, timerChoice: { paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#303A5B', borderRadius: 16 }, timerText: { color: '#DCE2FA', fontSize: 12, fontWeight: '700' }, queueRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderRadius: 10 }, queueRowActive: { backgroundColor: '#303A5B' }, queueTitle: { color: '#CCD3EC', flex: 1, fontSize: 13 },
  progressTrack: { width: '100%', height: 7, borderRadius: 4, backgroundColor: '#333C5C', marginTop: 24, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: colors.orange }, timeRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, darkTime: { color: '#9AA4C7', fontSize: 12 }, controls: { flexDirection: 'row', alignItems: 'center', gap: 30, marginTop: 20 }, secondary: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderColor: '#596382', alignItems: 'center', justifyContent: 'center' }, mainControl: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }, modeButton: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginTop: 8 }, modeText: { color: '#ABB3CF', fontSize: 12 }, seekRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 2 }, seekText: { color: '#7883A6', fontSize: 11 }, stopButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 24, marginTop: 6 }, stopText: { color: '#9AA4C7', fontWeight: '700' },
});
