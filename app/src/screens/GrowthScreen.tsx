import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { content } from '@/services/content';
import { useSession } from '@/state/SessionContext';
import { usePlayer } from '@/state/PlayerContext';
import type { LessonEntry, ProgressSummary } from '@/types';
import { Card, colors, Loading, SectionHeader, StatusPill } from '@/components/Ui';
import type { Navigate } from '@/navigation';

const FREE_LESSON_COUNT = 10;

export function GrowthScreen({ onNavigate }: { onNavigate: Navigate }) {
  const session = useSession();
  const player = usePlayer();
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [words, setWords] = useState<LessonEntry[]>([]);
  const [english, setEnglish] = useState<LessonEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAccess = session.profile?.can_access_all === true;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [wordList, englishList, summary] = await Promise.all([
        content.lessons('识字'), content.lessons('英语'),
        session.childId && session.loggedIn ? api<ProgressSummary>(`/progress/summary?child_id=${encodeURIComponent(session.childId)}`) : Promise.resolve(null),
      ]);
      setWords(wordList); setEnglish(englishList); setData(summary);
    } catch (e) { setError(e instanceof Error ? e.message : '成长内容加载失败'); }
    finally { setLoading(false); }
  }, [session.childId, session.loggedIn]);
  useEffect(() => { void load(); }, [load]);

  const openLesson = (subject: '识字' | '英语', entry: LessonEntry) => {
    if (entry.seq >= FREE_LESSON_COUNT && !hasAccess) {
      Alert.alert('这里需要爸爸妈妈帮忙打开', `前 ${FREE_LESSON_COUNT} 课免费；当前为非权益状态，可以先从前面的字词开始。`);
      return;
    }
    player.play(content.lesson(entry, subject));
  };

  if (session.loading && !words.length) return <Loading />;
  const learned = data?.overall_stats.total_words_learned ?? 0;
  const friends = data?.overall_stats.total_words_friends ?? 0;
  const mastered = data?.overall_stats.total_words_mastered ?? 0;
  const wordPreview = words.slice(0, 12);
  const englishPreview = english.slice(0, 8);

  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.orange} />}>
    <View style={styles.heading}><Text style={styles.kicker}>F R I E N D S  C O L L E C T I O N</Text><Text style={styles.title}>我的朋友收集册</Text></View>
    {!session.loggedIn ? <Pressable style={styles.loginBanner}><Text style={styles.loginText}>登录后记录朋友收集进度；未登录仍可体验前 10 课 →</Text></Pressable> : null}
    <View style={styles.progressCard}>
      <Text style={styles.progressTitle}>已遇见 <Text style={styles.orange}>{learned}</Text> 位朋友 · 其中 <Text style={styles.green}>{mastered}</Text> 位好伙伴</Text>
      <View style={styles.progressBar}><View style={[styles.progressSegment, { flex: Math.max(1, learned - friends), backgroundColor: '#F9D33D' }]} /><View style={[styles.progressSegment, { flex: Math.max(1, friends - mastered), backgroundColor: colors.blue }]} /><View style={[styles.progressSegment, { flex: Math.max(1, mastered), backgroundColor: '#66C153' }]} /></View>
      <View style={styles.legend}><Text style={styles.legendText}>🟡 已相识 {Math.max(0, learned - friends)}</Text><Text style={styles.legendText}>🔵 好朋友 {Math.max(0, friends - mastered)}</Text><Text style={styles.legendText}>🟢 好伙伴 {mastered}</Text></View>
    </View>
    <View style={styles.accessWrap}>{hasAccess ? <StatusPill tone="green">权益已生效：全部字词与进阶内容开放</StatusPill> : <StatusPill>非权益状态：识字/英语各前 10 课免费</StatusPill>}</View>
    {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}

    <SectionHeader title="🌱 和字交朋友" action="全部字词 ›" onAction={() => onNavigate({ name: 'lessons', subject: '识字' })} />
    <View style={styles.wordGrid}>{wordPreview.map((entry) => <WordCell key={entry.id} entry={entry} locked={entry.seq >= FREE_LESSON_COUNT && !hasAccess} onPress={() => openLesson('识字', entry)} />)}</View>

    <SectionHeader title="🌈 和单词交朋友" action="全部单词 ›" onAction={() => onNavigate({ name: 'lessons', subject: '英语' })} />
    <View style={styles.englishGrid}>{englishPreview.map((entry) => <WordCell key={entry.id} entry={entry} english locked={entry.seq >= FREE_LESSON_COUNT && !hasAccess} onPress={() => openLesson('英语', entry)} />)}</View>

    <SectionHeader title="成长概览" />
    <View style={styles.stats}><Metric value={learned} label="新相识" color="#E0B91F" /><Metric value={friends} label="好朋友" color={colors.blue} /><Metric value={mastered} label="好伙伴" color={colors.green} /></View>
    {(data?.subject_progress ?? []).filter((item) => item.subject !== '拼音').map((item) => <Card key={item.subject}><Text style={styles.subject}>{item.subject}</Text><Text style={styles.detail}>认识 {item.learned} · 通过挑战 {item.tested} · 熟练掌握 {item.mastered}</Text></Card>)}
    <Pressable onPress={() => onNavigate({ name: 'search', scope: 'growth' })} style={styles.featureRow}><Text style={styles.featureIcon}>🔎</Text><Text style={styles.featureLabel}>搜字 / 词</Text><Text style={styles.featureRight}>识字 / 英语 ›</Text></Pressable>
    <Pressable onPress={() => onNavigate({ name: 'collection' })} style={styles.featureRow}><Text style={styles.featureIcon}>🌱</Text><Text style={styles.featureLabel}>朋友收集册</Text><Text style={styles.featureRight}>{session.loggedIn ? '查看成长记录 ›' : '登录后可用 ›'}</Text></Pressable>
    <Pressable onPress={() => onNavigate({ name: 'challenge', subject: '识字' })} style={styles.featureRow}><Text style={styles.featureIcon}>🏆</Text><Text style={styles.featureLabel}>友情大考验</Text><Text style={styles.featureRight}>{hasAccess ? '开始挑战 ›' : '普通挑战可用 ›'}</Text></Pressable>
  </ScrollView>;
}

function WordCell({ entry, locked, english, onPress }: { entry: LessonEntry; locked: boolean; english?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [english ? styles.englishCell : styles.wordCell, locked && styles.lockedCell, pressed && { opacity: .72 }]}><Text numberOfLines={1} style={english ? styles.englishWord : styles.word}>{entry.text}</Text>{locked ? <Text style={styles.lock}>🔒</Text> : null}</Pressable>;
}
function Metric({ value, label, color }: { value: number; label: string; color: string }) { return <View style={styles.metric}><Text style={[styles.value, { color }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6FBF3' }, content: { paddingBottom: 30 }, heading: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 }, kicker: { color: colors.muted, fontSize: 12, letterSpacing: 3, fontWeight: '900' }, title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 10 },
  loginBanner: { marginHorizontal: 16, marginVertical: 8, padding: 14, borderRadius: 18, backgroundColor: '#FFF1E6' }, loginText: { color: colors.orange, textAlign: 'center', fontWeight: '800', lineHeight: 20 },
  progressCard: { marginHorizontal: 16, marginTop: 8, padding: 18, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9EAD6' }, progressTitle: { color: colors.ink, fontSize: 19, lineHeight: 27, fontWeight: '900' }, orange: { color: colors.orange }, green: { color: colors.green }, progressBar: { height: 14, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', marginTop: 18 }, progressSegment: { minWidth: 8 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }, legendText: { color: colors.muted, fontSize: 11 }, accessWrap: { paddingHorizontal: 18, marginTop: 12 },
  wordGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, wordCell: { width: '22.8%', height: 82, borderRadius: 18, backgroundColor: '#E8F6E5', alignItems: 'center', justifyContent: 'center', position: 'relative' }, word: { color: '#347E31', fontSize: 32, fontWeight: '900' }, englishGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, englishCell: { width: '48.5%', height: 72, borderRadius: 18, backgroundColor: '#E8F2FF', alignItems: 'center', justifyContent: 'center', position: 'relative' }, englishWord: { color: '#3174BE', fontSize: 21, fontWeight: '900' }, lockedCell: { opacity: .58 }, lock: { position: 'absolute', right: 6, top: 6, fontSize: 11 },
  stats: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, gap: 10 }, metric: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: '#CDE7C9' }, value: { fontSize: 25, fontWeight: '900' }, metricLabel: { color: colors.muted, marginTop: 4 }, subject: { color: colors.ink, fontWeight: '900', fontSize: 18 }, detail: { color: colors.muted, marginTop: 8, lineHeight: 21 },
  featureRow: { minHeight: 68, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DFECDC' }, featureIcon: { fontSize: 24, marginRight: 12 }, featureLabel: { color: colors.ink, fontSize: 16, fontWeight: '800' }, featureRight: { color: colors.muted, fontSize: 12, marginLeft: 'auto' }, error: { color: '#B42318' },
});
