import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { coverUrl } from '@/config';
import { colors, Cover, Empty, HeroCard, Loading, SectionHeader, StatusPill } from '@/components/Ui';
import { content, songCoverFromPath } from '@/services/content';
import { usePlayer } from '@/state/PlayerContext';
import { useSession } from '@/state/SessionContext';
import type { CategoryBrief, ContentEntry, DirectoryIndex, FreePool } from '@/types';
import { Icon } from '@/components/Icon';
import { embeddedImages } from '@/assets/embeddedImages';
import type { Navigate } from '@/navigation';

const ROOT = '瞎编的歌曲';
const PRIORITY = ['幼儿', '小孩儿', '大孩儿', '蒙学歌曲', '诗词歌曲'];

export function SongScreen({ onNavigate }: { onNavigate: Navigate }) {
  const player = usePlayer();
  const session = useSession();
  const [path, setPath] = useState(ROOT);
  const [data, setData] = useState<DirectoryIndex | null>(null);
  const [free, setFree] = useState<FreePool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAccess = session.profile?.can_access_all === true;

  const load = async (next: string) => {
    setLoading(true); setError(null);
    try {
      const [directory, freePool] = await Promise.all([content.directory(next), content.freePool()]);
      setData(directory); setFree(freePool); setPath(next);
    } catch (e) { setError(e instanceof Error ? e.message : '歌曲目录加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(ROOT); }, []);

  const subs = useMemo(() => {
    const list = [...(data?.categories ?? data?.sub_categories ?? [])];
    if (path !== ROOT) return list;
    return list.sort((a, b) => {
      const ai = PRIORITY.indexOf(a.name); const bi = PRIORITY.indexOf(b.name);
      return (ai < 0 ? PRIORITY.length : ai) - (bi < 0 ? PRIORITY.length : bi);
    });
  }, [data, path]);

  const playSong = async (entry: ContentEntry | { path: string; title: string; cover?: { cover_image_url?: string } }) => {
    try {
      if (!hasAccess && !await content.isFree('song', entry.path)) {
        Alert.alert(session.loggedIn ? '这是权益歌曲' : '需要监护人登录', session.loggedIn ? '当前权益期已结束，可以继续收听固定 100 首免费儿歌。App 不复用微信支付。' : '未登录也可收听免费专区，登录后按活动规则领取体验期。');
        return;
      }
      const candidates = (data?.entries ?? []).filter((item) => hasAccess || free?.songs.some((x) => x.p === item.path));
      const queue = candidates.length ? candidates.map((item) => content.song(item)) : [content.song(entry)];
      const index = Math.max(0, queue.findIndex((item) => item.id === entry.path));
      player.playQueue(queue, index);
    } catch (e) { Alert.alert('播放失败', e instanceof Error ? e.message : '请稍后重试'); }
  };

  if (loading && !data) return <Loading label="音乐厅开场中…" />;
  const freeSong = free?.songs[0];
  const firstCategory = subs[0];
  const hero = hasAccess && firstCategory ? {
    image: coverUrl(firstCategory.cover?.cover_image_url), eyebrow: '♫ 全库歌单 · 权益已生效', title: '酷酷音乐厅', subtitle: `${subs.length} 类歌单 · 后台与锁屏播放`, color: colors.teal,
    onPress: () => void load(nextPath(path, firstCategory)),
  } : freeSong ? {
    image: songCoverFromPath(freeSong.p), eyebrow: '🎁 免费专区 · 无权益也能唱', title: '精选儿歌免费听', subtitle: `${free?.songs.length ?? 0} 首儿歌 · 固定免费池`, color: colors.teal,
    onPress: () => onNavigate({ name: 'free-zone', tab: 'song' }),
  } : null;

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    {path !== ROOT ? <Pressable style={styles.back} onPress={() => void load(path.split('/').slice(0, -1).join('/') || ROOT)}><Text style={styles.backText}>‹ 上一级</Text></Pressable> : null}
    {path === ROOT ? <View style={styles.greeting}><View style={{ flex: 1 }}><Text style={styles.hi}>一起唱歌吧 ♫</Text><Text style={styles.bigTitle}>酷酷音乐厅</Text></View><Pressable accessibilityLabel="搜索歌曲" onPress={() => onNavigate({ name: 'search', scope: 'song' })} style={styles.searchButton}><Image source={{ uri: embeddedImages.search }} resizeMode="contain" style={styles.searchImage} /></Pressable></View> : <View style={styles.subHead}><Text style={styles.subTitle}>{data?.name ?? data?.subject_name ?? '歌单'}</Text><Text style={styles.subNote}>点选歌单继续下钻，点歌曲立即播放</Text></View>}
    {path === ROOT && hero ? <HeroCard {...hero} /> : null}
    {path === ROOT ? <View style={[styles.shareBar, { backgroundColor: colors.teal }]}><Text style={styles.shareText}>♫ 把好听的儿歌分享给小伙伴</Text></View> : null}
    {!hasAccess ? <View style={styles.accessWrap}><StatusPill tone="purple">非权益用户：100 首免费，其余歌单展示但播放受限</StatusPill></View> : null}
    {loading ? <Loading label="歌单加载中…" /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}

    {!loading && subs.length ? <>
      <SectionHeader title={path === ROOT ? '歌曲分类' : '选择歌单'} action={`${subs.length} 类`} />
      <View style={styles.grid}>{subs.map((item) => <CategoryTile key={nextPath(path, item)} item={item} onPress={() => void load(nextPath(path, item))} locked={!hasAccess} />)}</View>
    </> : null}

    {!loading && (data?.entries ?? []).length ? <>
      <SectionHeader title="歌曲列表" action={`${data?.entries?.length ?? 0} 首`} />
      {(data?.entries ?? []).map((entry) => <SongRow key={entry.path} title={entry.title} note={hasAccess || free?.songs.some((x) => x.p === entry.path) ? '立即播放' : '权益歌曲'} image={coverUrl(entry.cover?.cover_image_url) || songCoverFromPath(entry.path)} onPress={() => void playSong(entry)} locked={!hasAccess && !free?.songs.some((x) => x.p === entry.path)} />)}
    </> : null}
    {!loading && !subs.length && !data?.entries?.length ? <Empty text="当前歌单暂无歌曲" /> : null}
  </ScrollView>;
}

function nextPath(path: string, item: CategoryBrief) { return item.path ?? `${path}/${item.id ?? item.name}`; }

function CategoryTile({ item, onPress, locked }: { item: CategoryBrief; onPress: () => void; locked: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: .75 }]}>
    <Image source={{ uri: coverUrl(item.cover?.cover_image_url) }} style={styles.tileImage} /><View style={styles.tileShade} />
    <View style={styles.tileMeta}><Text numberOfLines={1} style={styles.tileTitle}>{item.name}</Text><Text style={styles.tileCount}>{item.entry_count ?? 0} 首</Text></View>
    {locked ? <View style={styles.lockBadge}><Text style={styles.lockText}>权益</Text></View> : null}
  </Pressable>;
}

function SongRow({ title, note, image, onPress, locked }: { title: string; note: string; image?: string; onPress: () => void; locked?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}><Cover uri={image} /><View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.title}>{title.replace(/^(中文|英文|双语)\s*[-－]\s*/, '')}</Text><Text style={styles.note}>{note}</Text></View><View style={[styles.play, locked && styles.playLocked]}>{locked ? <Text>🔒</Text> : <Icon name="play" size={19} color="#fff" />}</View></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4FBFA' }, content: { paddingBottom: 30 }, greeting: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' }, hi: { color: colors.muted, fontSize: 14, fontWeight: '700' }, bigTitle: { color: colors.ink, fontSize: 29, fontWeight: '900', marginTop: 4 }, searchButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDF6F3', alignItems: 'center', justifyContent: 'center' }, searchImage: { width: 30, height: 30 },
  shareBar: { marginHorizontal: 44, marginVertical: 5, minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, shareText: { color: '#fff', fontWeight: '900', fontSize: 14 }, accessWrap: { paddingHorizontal: 18, marginTop: 10 },
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '48%', height: 132, borderRadius: 22, overflow: 'hidden', backgroundColor: '#DDF6F3' }, tileImage: { position: 'absolute', inset: 0, width: '100%', height: '100%' }, tileShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(13,35,38,.18)' }, tileMeta: { position: 'absolute', left: 14, right: 8, bottom: 12 }, tileTitle: { color: '#fff', fontSize: 17, fontWeight: '900' }, tileCount: { color: '#fff', fontWeight: '700', fontSize: 12, marginTop: 4 }, lockBadge: { position: 'absolute', right: 8, top: 8, backgroundColor: 'rgba(36,27,54,.68)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 }, lockText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 8 }, backText: { color: colors.teal, fontWeight: '800' }, subHead: { paddingHorizontal: 20, paddingBottom: 12 }, subTitle: { color: colors.ink, fontWeight: '900', fontSize: 28 }, subNote: { color: colors.muted, marginTop: 5 },
  row: { minHeight: 94, marginHorizontal: 16, marginBottom: 10, padding: 11, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBE9E6', flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '800' }, note: { color: colors.muted, fontSize: 13, marginTop: 6 }, play: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }, playLocked: { backgroundColor: '#DDD6E8' }, playText: { color: '#fff', fontWeight: '900' }, error: { color: '#B42318', margin: 20 },
});
