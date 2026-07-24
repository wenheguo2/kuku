/**
 * pages/common/search — C-05 搜索（★ 按来源 Tab 隔离检索：story/song/growth 各搜各的，互不串）
 *  - story ：_global 学科 + _home 章回/单篇/热点 → 学科页 / 作品总入口 / 播放器
 *  - song  ：songCatalog(mock 歌曲目录) 标题 → 歌曲播放器
 *  - growth：识字/英语/拼音 三学科 → 课程页（真实词库到位后可扩为搜字/词）
 * scope 由各 Tab 的搜索入口透传（缺省 story）；内容为静态索引/占位，故不接后端 /search。
 */
import { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { GlobalIndex, HomeIndex } from '@/types/content';
import { ALL_SONGS } from '@/services/songCatalog';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

type Scope = 'story' | 'song' | 'growth';
interface Hit { key: string; badge: string; thumb: string; title: string; sub: string; onClick: () => void; }

const GROWTH_SUBJECTS = ['识字', '英语', '拼音'];
const HOT_WORDS: Record<Scope, string[]> = {
  story: ['三国', '勇敢', '成语', '西游', '恐龙'],
  song: ['两只老虎', '摇篮曲', '数鸭子', '嫦娥奔月'],
  growth: ['识字', '英语', '拼音'],
};
const PLACEHOLDER: Record<Scope, string> = {
  story: '搜索故事 / 学科…',
  song: '搜索儿歌 / 歌曲…',
  growth: '搜索识字 / 英语 / 拼音…',
};
const SCOPE_LABEL: Record<Scope, string> = { story: '故事', song: '歌曲', growth: '成长' };

export default function Search() {
  const router = useRouter();
  const raw = router.params.scope;
  const scope: Scope = raw === 'song' || raw === 'growth' ? raw : 'story';

  const [global, setGlobal] = useState<GlobalIndex | null>(null);
  const [home, setHome] = useState<HomeIndex | null>(null);
  const [kw, setKw] = useState('');
  const [loading, setLoading] = useState(scope === 'story');
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    if (scope !== 'story') return; // song/growth 用本地目录/固定学科，无需拉索引
    setLoading(true);
    setError(false);
    Promise.all([indexLoader.loadGlobal(), indexLoader.loadHome()])
      .then(([g, h]) => { setGlobal(g); setHome(h); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const q = kw.trim();
  const hits: Hit[] = [];
  if (q && scope === 'story') {
    (global?.subjects ?? [])
      .filter((s) => s.subject_name.includes(q))
      .forEach((s) => hits.push({ key: `sub-${s.subject_id}`, badge: '学科', thumb: '📚', title: s.subject_name, sub: `${s.total_entries} 个故事`, onClick: () => Taro.navigateTo({ url: `/pages/story/subject/index?subject=${encodeURIComponent(s.subject_id)}` }) }));
    (home?.chaptered_works ?? [])
      .filter((w) => w.title.includes(q))
      .forEach((w) => hits.push({ key: `work-${w.path}`, badge: '章回', thumb: '📖', title: w.title, sub: `${w.subject} · 共 ${w.total_chapters} 章`, onClick: () => Taro.navigateTo({ url: `/pages/story/work/index?path=${encodeURIComponent(w.path)}&title=${encodeURIComponent(w.title)}` }) }));
    [...(home?.standalone_picks ?? []), ...(home?.hot ?? []).filter((x) => x.type !== 'chaptered')]
      .filter((p) => p.title.includes(q))
      .forEach((p) => hits.push({ key: `story-${p.path}`, badge: '单篇', thumb: '🎧', title: p.title, sub: p.subject, onClick: () => Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(p.path)}&title=${encodeURIComponent(p.title)}` }) }));
  } else if (q && scope === 'song') {
    ALL_SONGS
      .filter((s) => s.title.includes(q))
      .forEach((s) => hits.push({ key: `song-${s.id}`, badge: '歌曲', thumb: '🎵', title: s.title, sub: `${s.category} · ${s.meta}`, onClick: () => Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(s.id)}&title=${encodeURIComponent(s.title)}` }) }));
  } else if (q && scope === 'growth') {
    GROWTH_SUBJECTS
      .filter((s) => s.includes(q))
      .forEach((s) => hits.push({ key: `growth-${s}`, badge: '学科', thumb: '🌱', title: s, sub: '进入课程', onClick: () => Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent(s)}` }) }));
  }
  // 同名去重
  const seen = new Set<string>();
  const uniq = hits.filter((h) => {
    if (seen.has(h.title)) return false;
    seen.add(h.title);
    return true;
  });

  return (
    <View className={`page-container ${night}`}>
      <Input className="kk-search" style={{ color: 'var(--color-text)' }} value={kw}
        placeholder={PLACEHOLDER[scope]} onInput={(e) => setKw(e.detail.value)} confirmType="search" />
      <Text className="muted" style={{ display: 'block', margin: '2px 4px 10px' }}>当前范围：{SCOPE_LABEL[scope]}（各 Tab 分开搜索）</Text>

      {!q && (
        <View>
          <View className="sec-h"><Text className="t">🔥 热门搜索</Text></View>
          <View style={{ padding: '0 4px' }}>
            {HOT_WORDS[scope].map((w) => (
              <Text key={w} className="chip" onClick={() => setKw(w)}>{w}</Text>
            ))}
          </View>
        </View>
      )}

      {q && (
        <StateView loading={loading} error={error} empty={uniq.length === 0} onRetry={load} emptyText={`没有找到「${q}」相关内容`}>
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
