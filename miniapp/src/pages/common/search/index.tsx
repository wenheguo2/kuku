/**
 * pages/common/search — C-05 搜索（★ 按来源 Tab 隔离检索：story/song/growth 各搜各的，互不串）
 * ★ 两级命中（2026-07-29 用户定：既能大类又能单条目）：
 *  - story ：学科/章回大类 + 单故事条目（_search_story.json 万级懒拉）→ 学科页/作品页/播放器
 *  - song  ：43 分类 + 单曲条目（_search_song.json）→ 歌单列表/歌曲播放器（单曲直接入队播）
 *  - growth：三学科入口 + 字/词条目（lessonCatalog 全量词表，输入"的"即可命中）→ 教学播放器
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { GlobalIndex, HomeIndex, NON_STORY_SUBJECT_IDS } from '@/types/content';
import { loadSongCategories, SongCategory } from '@/services/songCatalog';
import { loadLessonEntries, LessonEntry } from '@/services/lessonCatalog';
import { searchEntries, SearchItem } from '@/services/searchIndex';
import { usePlayerStore } from '@/stores/playerStore';
import { buildAssetUrl, buildCoverUrl, guessCoverFromPath } from '@/utils/path';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

type Scope = 'story' | 'song' | 'growth';
interface Hit { key: string; badge: string; thumb: string; title: string; sub: string; onClick: () => void; }

const GROWTH_SUBJECTS = ['识字', '英语', '拼音'];
const HOT_WORDS: Record<Scope, string[]> = {
  story: ['三国', '哪吒', '成语', '西游', '恐龙'],
  song: ['摇篮曲', '刘备', '恐龙', '诗词歌曲'],
  growth: ['的', 'apple', '识字', '拼音'],
};
const PLACEHOLDER: Record<Scope, string> = {
  story: '搜故事名 / 学科…',
  song: '搜歌名 / 歌单…',
  growth: '搜字 / 单词 / 拼音…',
};
const SCOPE_LABEL: Record<Scope, string> = { story: '故事', song: '歌曲', growth: '成长' };
/** ★空态小贴士（走查 s02 发现：未输入时热词下方一大片空白，给点可搜什么的引导） */
const SCOPE_TIPS: Record<Scope, string[]> = {
  story: ['试试搜故事名，比如「三国」「哪吒」', '也能搜学科，比如「成语故事」「品格养成」', '长篇作品会显示共多少章，点进去可以连听'],
  song: ['试试搜歌名，比如「摇篮曲」', '也能搜歌单，比如「诗词歌曲」', '点单首歌会直接开始播放'],
  growth: ['搜单个字，比如「的」「山」', '搜英文单词，比如「apple」', '点结果直接开始认字交朋友'],
};

/** 歌曲单曲封面按路径规则（与音乐厅一致） */
const songCover = (p: string) => {
  const name = p.split('/').filter(Boolean).pop();
  return name ? buildCoverUrl(`covers/generated/${p}/${name}_1.jpg`) : '';
};

export default function Search() {
  const router = useRouter();
  const raw = router.params.scope;
  const scope: Scope = raw === 'song' || raw === 'growth' ? raw : 'story';

  const [global, setGlobal] = useState<GlobalIndex | null>(null);
  const [home, setHome] = useState<HomeIndex | null>(null);
  const [songCats, setSongCats] = useState<SongCategory[]>([]);
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [entryHits, setEntryHits] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [kw, setKw] = useState('');
  const [loading, setLoading] = useState(scope === 'story');
  const [error, setError] = useState(false);
  const night = useNight();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const load = () => {
    if (scope === 'song') {
      loadSongCategories().then(setSongCats).catch((err) => console.warn('加载歌曲分类失败', err));
      return;
    }
    if (scope === 'growth') {
      // 三学科全量词表（识字3499/英语3910/拼音100，索引有缓存），支持搜单字/单词
      Promise.all(GROWTH_SUBJECTS.map((s) => loadLessonEntries(s).then((l) => l.map((e) => ({ ...e, subject: s })))))
        .then((ls) => setLessons((ls.flat() as (LessonEntry & { subject: string })[])))
        .catch((err) => console.warn('加载词表失败', err));
      return;
    }
    setLoading(true);
    setError(false);
    Promise.all([indexLoader.loadGlobal(), indexLoader.loadHome()])
      .then(([g, h]) => { setGlobal(g); setHome(h); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const q = kw.trim();

  // ★条目级检索（story/song 万级索引懒拉）：300ms 防抖 + 序号防竞态
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || scope === 'growth') { setEntryHits([]); setSearching(false); return; }
    setSearching(true);
    const mySeq = ++seqRef.current;
    debounceRef.current = setTimeout(() => {
      searchEntries(scope, q, 30)
        .then((list) => { if (mySeq === seqRef.current) setEntryHits(list); })
        .catch((err) => console.warn('条目检索失败', err))
        .finally(() => { if (mySeq === seqRef.current) setSearching(false); });
    }, 300);
  }, [q, scope]);

  /** 播单曲：设单曲队列（音频/歌词/封面按路径规则）进歌曲播放器 */
  const playSongEntry = (it: SearchItem) => {
    usePlayerStore.getState().setQueue([{
      type: 'song' as const, id: it.p, title: it.t,
      audioUrl: buildAssetUrl(`generated_stories/${it.p}.mp3`),
      lrcUrl: buildAssetUrl(`generated_stories/${it.p}.txt`),
      coverUrl: songCover(it.p) || undefined,
    }], 0);
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(it.p)}&title=${encodeURIComponent(it.t)}` });
  };
  /** 播单故事：单篇队列（播放器会自动扩展为所在目录整列表续播） */
  const playStoryEntry = (it: SearchItem) => {
    usePlayerStore.getState().setQueue([{ type: 'story' as const, id: it.p, title: it.t, coverUrl: guessCoverFromPath(it.p) || undefined }], 0);
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(it.p)}&title=${encodeURIComponent(it.t)}` });
  };

  const hits: Hit[] = [];
  if (q && scope === 'story') {
    (global?.subjects ?? [])
      .filter((s) => !NON_STORY_SUBJECT_IDS.includes(s.subject_id) && s.subject_name.includes(q))
      .forEach((s) => hits.push({ key: `sub-${s.subject_id}`, badge: '学科', thumb: '📚', title: s.subject_name, sub: `${s.total_entries} 个故事`, onClick: () => Taro.navigateTo({ url: `/pages/story/subject/index?subject=${encodeURIComponent(s.subject_id)}` }) }));
    entryHits.forEach((it) => (it.c
      ? hits.push({ key: `work-${it.p}`, badge: '章回', thumb: '📖', title: it.t, sub: it.s, onClick: () => Taro.navigateTo({ url: `/pages/story/work/index?path=${encodeURIComponent(it.p)}&title=${encodeURIComponent(it.t)}` }) })
      : hits.push({ key: `story-${it.p}`, badge: '故事', thumb: '🎧', title: it.t, sub: it.s, onClick: () => playStoryEntry(it) })));
  } else if (q && scope === 'song') {
    songCats
      .filter((c) => c.name.includes(q))
      .forEach((c) => hits.push({ key: `songcat-${c.path}`, badge: '歌单', thumb: '🎵', title: c.name, sub: c.count ? `${c.count} 首` : '进入歌单', onClick: () => Taro.navigateTo({ url: `/pages/song/list/index?path=${encodeURIComponent(c.path)}&title=${encodeURIComponent(c.name)}` }) }));
    entryHits.forEach((it) => hits.push({ key: `song-${it.p}`, badge: '歌曲', thumb: '🎤', title: it.t, sub: it.s, onClick: () => playSongEntry(it) }));
  } else if (q && scope === 'growth') {
    GROWTH_SUBJECTS
      .filter((s) => s.includes(q))
      .forEach((s) => hits.push({ key: `growth-${s}`, badge: '成长', thumb: '🌱', title: s, sub: '进入字词', onClick: () => Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent(s)}` }) }));
    // ★字/词条目命中（text 精确/包含 或 课名包含）：直达教学播放器
    (lessons as (LessonEntry & { subject: string })[])
      .filter((w) => w.text.toLowerCase().includes(q.toLowerCase()) || w.id.includes(q))
      .slice(0, 30)
      .forEach((w) => hits.push({ key: `word-${w.subject}-${w.id}`, badge: w.subject, thumb: '🔤', title: w.text, sub: w.id, onClick: () => Taro.navigateTo({ url: `/pages/growth/player/index?subject=${encodeURIComponent(w.subject)}&word=${encodeURIComponent(w.text)}&path=${encodeURIComponent(w.path)}&study_type=study1` }) }));
  }
  // 同 key 去重（标题允许重复：不同学科可能有同名条目）
  const seen = new Set<string>();
  const uniq = hits.filter((h) => {
    if (seen.has(h.key)) return false;
    seen.add(h.key);
    return true;
  });

  return (
    <View className={`page-container ${night}`}>
      {/* ★搜索框：包一层带放大镜图标 + 一键清空（原先光秃 Input 只有 placeholder，不像搜索框） */}
      <View className="kk-search-wrap">
        <Text className="ic">🔍</Text>
        <Input className="kk-search-in" value={kw}
          placeholder={PLACEHOLDER[scope]} onInput={(e) => setKw(e.detail.value)} confirmType="search" />
        {kw ? <Text className="clr" onClick={() => setKw('')}>✕</Text> : null}
      </View>
      <Text className="muted" style={{ display: 'block', margin: '2px 4px 10px' }}>正在「{SCOPE_LABEL[scope]}」里找（歌曲 / 成长请到各自页面搜）</Text>

      {!q && (
        <View>
          <View className="sec-h"><Text className="t">🔥 热门搜索</Text></View>
          <View style={{ padding: '0 4px' }}>
            {HOT_WORDS[scope].map((w) => (
              <Text key={w} className="chip" onClick={() => setKw(w)}>{w}</Text>
            ))}
          </View>

          {/* 搜索小贴士：填补未输入时的大片空白 */}
          <View className="sec-h" style={{ marginTop: '24px' }}><Text className="t">💡 小贴士</Text></View>
          <View className="card">
            {SCOPE_TIPS[scope].map((t) => (
              <View key={t} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <Text style={{ color: 'var(--color-primary)', fontSize: '20px', lineHeight: 1.6 }}>●</Text>
                <Text className="ds" style={{ margin: 0, lineHeight: 1.6, flex: 1 }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {q && (
        <StateView loading={loading || (searching && uniq.length === 0)} error={error} empty={uniq.length === 0} onRetry={load} emptyText={`没有找到「${q.length > 12 ? q.slice(0, 12) + '…' : q}」相关内容`}>
          {uniq.map((h) => (
            <View key={h.key} className="list-row" onClick={h.onClick}>
              <View className="thumb">{h.thumb}</View>
              <View className="gr">
                <Text className="nm">{h.title}</Text>
                <Text className="ds"><Text className="lvb">{h.badge}</Text>{h.sub}</Text>
              </View>
              <Text className="rt">›</Text>
            </View>
          ))}
        </StateView>
      )}
    </View>
  );
}
