/**
 * pages/common/search — C-05 搜索
 * MVP 前端索引检索：合并 _global(学科) + _home(章回大IP/单篇/热点) 做「学科名 + 作品标题」匹配。
 *  - 学科命中 → 学科页；章回命中 → 作品总入口(story/work)；单篇/热点 → 播放器(story/player)。
 * 内容为静态索引（不在库里），故不接后端 /search；量级上来再评估 PG 全文检索(KD-05)。
 */
import { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { GlobalIndex, HomeIndex, SubjectBrief } from '@/types/content';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

interface Hit {
  key: string;
  kind: 'subject' | 'work' | 'story';
  title: string;
  sub: string;
  onClick: () => void;
}

export default function Search() {
  const [global, setGlobal] = useState<GlobalIndex | null>(null);
  const [home, setHome] = useState<HomeIndex | null>(null);
  const [kw, setKw] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([indexLoader.loadGlobal(), indexLoader.loadHome()])
      .then(([g, h]) => { setGlobal(g); setHome(h); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const goSubject = (s: SubjectBrief) =>
    Taro.navigateTo({ url: `/pages/story/subject/index?subject=${encodeURIComponent(s.subject_id)}` });
  const goWork = (path: string, title: string) =>
    Taro.navigateTo({ url: `/pages/story/work/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}` });
  const goPlayer = (path: string, title: string) =>
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}` });

  const q = kw.trim();
  const hits: Hit[] = [];
  if (q) {
    (global?.subjects ?? [])
      .filter((s) => s.subject_name.includes(q))
      .forEach((s) => hits.push({ key: `sub-${s.subject_id}`, kind: 'subject', title: s.subject_name, sub: `${s.total_entries} 个故事`, onClick: () => goSubject(s) }));
    (home?.chaptered_works ?? [])
      .filter((w) => w.title.includes(q))
      .forEach((w) => hits.push({ key: `work-${w.path}`, kind: 'work', title: w.title, sub: `${w.subject} · 共 ${w.total_chapters} 章`, onClick: () => goWork(w.path, w.title) }));
    (home?.standalone_picks ?? [])
      .filter((p) => p.title.includes(q))
      .forEach((p) => hits.push({ key: `pick-${p.path}`, kind: 'story', title: p.title, sub: p.subject, onClick: () => goPlayer(p.path, p.title) }));
    (home?.hot ?? [])
      .filter((x) => x.title.includes(q))
      .forEach((x) => hits.push({ key: `hot-${x.path}`, kind: x.type === 'chaptered' ? 'work' : 'story', title: x.title, sub: `🔥 ${x.subject}`, onClick: () => (x.type === 'chaptered' ? goWork(x.path, x.title) : goPlayer(x.path, x.title)) }));
  }
  // 同名去重（一个 IP 可能同时在 works/hot 命中）
  const seen = new Set<string>();
  const uniq = hits.filter((h) => {
    if (seen.has(h.title)) return false;
    seen.add(h.title);
    return true;
  });

  const hotWords = ['三国', '勇敢', '成语', '西游', '恐龙'];
  const badge = (kind: Hit['kind']) => (kind === 'subject' ? '学科' : kind === 'work' ? '章回' : '单篇');
  const thumb = (kind: Hit['kind']) => (kind === 'subject' ? '📚' : kind === 'work' ? '📖' : '🎧');

  return (
    <View className={`page-container ${night}`}>
      <Input className="kk-search" style={{ color: 'var(--color-text)' }} value={kw}
        placeholder="搜索故事 / 学科…" onInput={(e) => setKw(e.detail.value)} confirmType="search" />

      {!q && (
        <View>
          <View className="sec-h"><Text className="t">🔥 热门搜索</Text></View>
          <View style={{ padding: '0 4px' }}>
            {hotWords.map((w) => (
              <Text key={w} className="chip" onClick={() => setKw(w)}>{w}</Text>
            ))}
          </View>
        </View>
      )}

      {q && (
        <StateView loading={loading} error={error} empty={uniq.length === 0} onRetry={load} emptyText={`没有找到「${q}」相关内容`}>
          {uniq.map((h) => (
            <View key={h.key} className="list-row" onClick={h.onClick}>
              <View className="thumb">{thumb(h.kind)}</View>
              <View className="gr">
                <Text className="nm">{h.title}</Text>
                <Text className="ds"><Text className="lvb">{badge(h.kind)}</Text>{h.sub}</Text>
              </View>
              <Text className="rt">›</Text>
            </View>
          ))}
        </StateView>
      )}
    </View>
  );
}
