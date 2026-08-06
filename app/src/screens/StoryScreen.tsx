import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { coverUrl } from '@/config';
import { content, storyCoverFromPath } from '@/services/content';
import { usePlayer } from '@/state/PlayerContext';
import type { DirectoryIndex, FreePool, GlobalIndex, HomeEntry, HomeIndex } from '@/types';
import { Card, colors, Cover, Empty, HeroCard, Loading, SectionHeader, StatusPill } from '@/components/Ui';
import { useSession } from '@/state/SessionContext';
import { Icon } from '@/components/Icon';
import { embeddedImages } from '@/assets/embeddedImages';
import type { Navigate } from '@/navigation';

export function StoryScreen({ onNavigate }: { onNavigate: Navigate }) {
  const player = usePlayer();
  const session = useSession();
  const [home, setHome] = useState<HomeIndex | null>(null);
  const [global, setGlobal] = useState<GlobalIndex | null>(null);
  const [free, setFree] = useState<FreePool | null>(null);
  const [directory, setDirectory] = useState<{ path: string; data: DirectoryIndex } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAccess = session.profile?.can_access_all === true;

  const loadHome = async () => {
    setLoading(true); setError(null); setDirectory(null);
    try {
      const [nextHome, nextGlobal, nextFree] = await Promise.all([content.home(), content.global(), content.freePool()]);
      setHome(nextHome); setGlobal(nextGlobal); setFree(nextFree);
    } catch (e) { setError(e instanceof Error ? e.message : '内容加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadHome(); }, []);

  const openDirectory = async (path: string) => {
    setLoading(true); setError(null);
    try { setDirectory({ path, data: await content.directory(path) }); }
    catch (e) { setError(e instanceof Error ? e.message : '目录加载失败'); }
    finally { setLoading(false); }
  };

  const playStory = async (path: string, title: string, image?: string, queueEntries?: Array<{ path: string; title: string; cover?: string }>) => {
    setLoading(true); setError(null);
    try {
      if (!hasAccess && !await content.isFree('story', path)) {
        Alert.alert(session.loggedIn ? '这是权益内容' : '需要监护人登录', session.loggedIn ? '当前权益期已结束，可以继续收听固定免费专区。App 内购上线前不会调用微信支付。' : '未登录可免费听固定 50 个故事；登录后按活动规则领取体验期。');
        return;
      }
      const allowed = (queueEntries ?? []).filter((item) => hasAccess || free?.stories.some((x) => x.p === item.path));
      if (allowed.length > 1) {
        const tracks = await Promise.all(allowed.map((item) => content.story(item.path, item.title, coverUrl(item.cover) || storyCoverFromPath(item.path))));
        player.playQueue(tracks, Math.max(0, tracks.findIndex((item) => item.id === path)));
      } else {
        player.play(await content.story(path, title, image));
      }
    } catch (e) { setError(e instanceof Error ? e.message : '故事加载失败'); }
    finally { setLoading(false); }
  };

  const recommendations = useMemo(() => [...(home?.standalone_picks ?? []), ...(home?.hot ?? []).filter((x) => !x.total_chapters)].slice(0, 8), [home]);
  const storySubjects = (global?.subjects ?? []).filter((item) => item.subject_id !== '瞎编的歌曲' && item.subject_id !== '学科启蒙');
  const freePreview = free?.stories.slice(0, 6) ?? [];
  const premiumHero = home?.hot?.[0] ?? home?.chaptered_works?.[0];
  const freeHero = freePreview[0];

  if (loading && !home && !directory) return <Loading label="故事屋开门中…" />;

  if (directory) {
    const d = directory.data;
    const children = d.categories ?? d.sub_categories ?? [];
    return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable onPress={() => setDirectory(null)} style={styles.back}><Text style={styles.backText}>‹ 返回故事首页</Text></Pressable>
      <View style={styles.directoryHead}><Text style={styles.directoryTitle}>{d.work_name ?? d.name ?? d.subject_name ?? '故事目录'}</Text><Text style={styles.directorySub}>完整目录 · 点按章节播放</Text></View>
      {!hasAccess ? <View style={styles.accessNote}><StatusPill>非权益用户：免费池外章节试听受限</StatusPill></View> : null}
      {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}
      {children.map((item) => {
        const nextPath = item.path ?? `${directory.path}/${item.id ?? item.name}`;
        return <Row key={nextPath} title={item.name} image={coverUrl(item.cover?.cover_image_url)} note={`${item.entry_count ?? 0} 个内容`} onPress={() => void openDirectory(nextPath)} />;
      })}
      {(d.entries ?? []).map((item) => <Row key={item.path} title={item.title} image={coverUrl(item.cover?.cover_image_url) || storyCoverFromPath(item.path)} note={!hasAccess ? '免费内容可播 · 其余需权益' : '点按播放'} onPress={() => void playStory(item.path, item.title, coverUrl(item.cover?.cover_image_url) || storyCoverFromPath(item.path))} />)}
      {(d.chapters ?? []).map((item) => <Row key={item.chapter_id} title={item.title} image={coverUrl(item.cover?.cover_image_url)} note={!hasAccess ? '权益章节' : '点按播放'} onPress={() => void playStory(item.full_path, item.title, coverUrl(item.cover?.cover_image_url))} />)}
      {!children.length && !d.entries?.length && !d.chapters?.length ? <Empty text="这个目录暂时没有内容" /> : null}
    </ScrollView>;
  }

  const hero = hasAccess && premiumHero ? {
    image: coverUrl(premiumHero.cover), eyebrow: '🌟 今日推荐 · 全库畅听', title: premiumHero.title,
    subtitle: `${premiumHero.subject}${premiumHero.total_chapters ? ` · ${premiumHero.total_chapters} 章` : ''}`,
    onPress: () => premiumHero.total_chapters ? void openDirectory(premiumHero.path) : void playStory(premiumHero.path, premiumHero.title, coverUrl(premiumHero.cover)),
  } : freeHero ? {
    image: storyCoverFromPath(freeHero.p), eyebrow: '🎁 免费专区 · 无权益也能听', title: '精选故事免费听', subtitle: `${free?.stories.length ?? 0} 个故事 · ${free?.songs.length ?? 0} 首儿歌`,
    onPress: () => onNavigate({ name: 'free-zone', tab: 'story' }),
  } : null;

  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadHome()} tintColor={colors.orange} />}>
    <View style={styles.greeting}><View style={{ flex: 1 }}><Text style={styles.hi}>{session.loggedIn ? `你好，${session.profile?.nickname ?? '小听众'} 🌙` : '晚上好，小听众 🌙'}</Text><Text style={styles.bigTitle}>今天想听什么故事呀？</Text></View><View style={styles.headerActions}><View style={styles.listener}><Image source={{ uri: embeddedImages.night }} resizeMode="contain" style={styles.headerImage} /></View><Pressable accessibilityLabel="搜索故事" onPress={() => onNavigate({ name: 'search', scope: 'story' })} style={styles.listener}><Image source={{ uri: embeddedImages.search }} resizeMode="contain" style={styles.headerImage} /></Pressable></View></View>
    {hero ? <HeroCard {...hero} /> : null}
    <View style={styles.shareBar}><Text style={styles.shareText}>📤 把酷酷分享给小伙伴一起听</Text></View>
    {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}

    {!hasAccess && freePreview.length ? <>
      <SectionHeader title="🎁 免费专区" action={`${free?.stories.length ?? 0} 个故事 ›`} onAction={() => onNavigate({ name: 'free-zone', tab: 'story' })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
        {freePreview.map((item) => <Poster key={item.p} title={item.t} note="免费畅听" image={storyCoverFromPath(item.p)} onPress={() => void playStory(item.p, item.t, storyCoverFromPath(item.p), freePreview.map((entry) => ({ path: entry.p, title: entry.t })))} free />)}
      </ScrollView>
    </> : null}

    <SectionHeader title="📜 章回故事推荐" action={`${home?.chaptered_works?.length ?? 0} 部`} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
      {(home?.chaptered_works ?? []).slice(0, 8).map((item) => <Poster key={item.path} title={item.title} note={`${item.total_chapters ?? 0} 章${hasAccess ? ' · 畅听' : ' · 权益'}`} image={coverUrl(item.cover)} onPress={() => void openDirectory(item.path)} />)}
    </ScrollView>

    <SectionHeader title="✨ 为你推荐" action="每日更新" />
    {recommendations.slice(0, 5).map((item) => <Row key={`${item.path}-${item.title}`} title={item.title} image={coverUrl(item.cover)} note={`${item.subject}${hasAccess ? ' · 全库可播' : ' · 免费池内可播'}`} onPress={() => void playStory(item.path, item.title, coverUrl(item.cover), recommendations.slice(0, 5))} play />)}

    <SectionHeader title="故事学科" action={`${storySubjects.length} 类`} />
    <View style={styles.subjectGrid}>{storySubjects.map((item) => <Pressable key={item.subject_id} onPress={() => void openDirectory(item.subject_id)} style={styles.subjectTile}>
      <Image source={{ uri: coverUrl(item.cover?.cover_image_url) }} style={styles.subjectImage} /><View style={styles.subjectShade} /><View style={styles.subjectMeta}><Text numberOfLines={1} style={styles.subjectTitle}>{item.subject_name}</Text><Text style={styles.subjectCount}>{item.total_entries} 个故事</Text></View>
    </Pressable>)}</View>
  </ScrollView>;
}

function Poster({ title, note, image, onPress, free }: { title: string; note: string; image?: string; onPress: () => void; free?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.poster, pressed && styles.pressed]}><Cover uri={image} size={132} />{free ? <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>免费</Text></View> : null}<Text numberOfLines={1} style={styles.posterTitle}>{title}</Text><Text numberOfLines={1} style={styles.posterNote}>{note}</Text></Pressable>;
}

function Row({ title, note, image, onPress, play }: { title: string; note: string; image?: string; onPress: () => void; play?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Cover uri={image} /><View style={styles.meta}><Text numberOfLines={2} style={styles.rowTitle}>{title}</Text><Text style={styles.note}>{note}</Text></View><View style={play ? styles.playRound : undefined}>{play ? <Icon name="play" size={19} color="#fff" /> : <Text style={styles.chevron}>›</Text>}</View></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream }, content: { paddingBottom: 30 },
  greeting: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, hi: { color: colors.muted, fontSize: 14, fontWeight: '700' }, bigTitle: { color: colors.ink, fontSize: 22, lineHeight: 29, fontWeight: '900', marginTop: 5 }, headerActions: { flexDirection: 'row', gap: 7 }, listener: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE3CC', alignItems: 'center', justifyContent: 'center' }, headerImage: { width: 29, height: 29 }, listenerEmoji: { fontSize: 24 },
  shareBar: { marginHorizontal: 44, marginVertical: 5, minHeight: 50, borderRadius: 25, backgroundColor: '#FFA25E', alignItems: 'center', justifyContent: 'center' }, shareText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  horizontal: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 }, poster: { width: 132, position: 'relative' }, posterTitle: { color: colors.ink, fontWeight: '900', fontSize: 15, marginTop: 8 }, posterNote: { color: colors.muted, fontSize: 12, marginTop: 3 }, freeBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.orange, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }, freeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  row: { minHeight: 94, marginHorizontal: 16, marginBottom: 10, padding: 11, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed: { opacity: 0.72 }, meta: { flex: 1 }, rowTitle: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '800' }, note: { color: colors.muted, fontSize: 13, marginTop: 6 }, chevron: { fontSize: 30, color: colors.orange }, playRound: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }, playText: { color: '#fff', marginLeft: 2, fontWeight: '900' },
  subjectGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, subjectTile: { width: '48%', height: 126, borderRadius: 22, overflow: 'hidden', backgroundColor: '#FFD1AF' }, subjectImage: { position: 'absolute', inset: 0, width: '100%', height: '100%' }, subjectShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(20,17,24,.23)' }, subjectMeta: { position: 'absolute', left: 14, right: 10, bottom: 12 }, subjectTitle: { color: '#fff', fontSize: 17, fontWeight: '900' }, subjectCount: { color: '#fff', fontSize: 12, marginTop: 4, fontWeight: '700' },
  back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 8 }, backText: { color: colors.purple, fontWeight: '800', fontSize: 15 }, directoryHead: { paddingHorizontal: 20, paddingVertical: 10 }, directoryTitle: { color: colors.ink, fontSize: 29, fontWeight: '900' }, directorySub: { color: colors.muted, marginTop: 6 }, accessNote: { paddingHorizontal: 20, marginBottom: 10 }, error: { color: '#B42318', lineHeight: 21 },
});
