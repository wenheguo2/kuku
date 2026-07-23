/**
 * pages/story/list — S-03/S-05/S-06 通用条目浏览（按 structure_type 自适应 + 分类顶部推荐）
 * 对齐 UI 设计稿 S-03：顶部「✨ 为你推荐 换一换」+「📃 全部故事 N」；mixed 另分组 章回作品/合集。
 *  - chaptered_card → story/work 总入口
 *  - collection_card / nested_category → 继续下钻 story/list
 *  - story_card → story/player，并把本页单篇设为播放队列
 */
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { buildCoverUrl } from '@/utils/path';
import { CategoryIndex, EntryItem } from '@/types/content';
import { usePlayerStore } from '@/stores/playerStore';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

const isChaptered = (e: EntryItem) => e.display_as === 'chaptered_card' || e.structure_type === 'chaptered';
const isCollection = (e: EntryItem) => e.display_as === 'collection_card' || e.structure_type === 'collection';
const isNested = (e: EntryItem) => e.display_as === 'nested_category' || e.structure_type === 'nested_category';
const isStory = (e: EntryItem) => !isChaptered(e) && !isCollection(e) && !isNested(e);
const REC_WINDOW = 4;
const PAGE_SIZE = 50;

export default function StoryList() {
  const router = useRouter();
  const path = decodeURIComponent(router.params.path || '品格养成/A1勇敢');
  const title = decodeURIComponent(router.params.title || '');
  const [data, setData] = useState<CategoryIndex | null>(null);
  const [recOffset, setRecOffset] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    setVisibleCount(PAGE_SIZE);
    setLoading(true);
    setError(false);
    indexLoader.loadIndexByPath(path)
      .then((d) => setData(d as CategoryIndex))
      .catch((err) => { console.warn('加载分类目录失败', err); setError(true); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [path]);

  const entries = data?.entries ?? [];
  const chaptered = entries.filter(isChaptered);
  const containers = entries.filter((e) => isCollection(e) || isNested(e));
  const stories = entries.filter(isStory);
  const subCats = data?.sub_categories ?? []; // multi_level 子分类导航

  // 顶部推荐：单篇优先；纯章回分类则推荐章回作品（保证有内容的分类都有推荐）
  const recPool = stories.length ? stories : chaptered;
  const recIsStory = stories.length > 0;
  const rec = recPool.length ? Array.from({ length: Math.min(REC_WINDOW, recPool.length) }, (_, i) => recPool[(recOffset + i) % recPool.length]) : [];
  const shuffle = () => setRecOffset((o) => (o + REC_WINDOW) % Math.max(1, recPool.length));

  const openWork = (e: EntryItem) =>
    Taro.navigateTo({ url: `/pages/story/work/index?path=${encodeURIComponent(e.path)}&title=${encodeURIComponent(e.title)}` });
  const drill = (e: EntryItem) =>
    Taro.navigateTo({ url: `/pages/story/list/index?path=${encodeURIComponent(e.path)}&title=${encodeURIComponent(e.title)}` });
  const drillSub = (c: { id?: string; name: string }) => {
    const path = `${data?.path || ''}/${c.id || c.name}`;
    Taro.navigateTo({ url: `/pages/story/list/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(c.name)}` });
  };
  const playStory = (e: EntryItem) => {
    usePlayerStore.getState().setQueue(stories.map((s) => ({ path: s.path, title: s.title })), stories.indexOf(e));
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(e.path)}&title=${encodeURIComponent(e.title)}` });
  };

  const Thumb = ({ e }: { e: EntryItem }) =>
    e.cover?.cover_image_url ? (
      <Image className="cvr" src={buildCoverUrl(e.cover.cover_image_url)} mode="aspectFill" ariaLabel={`${e.title}封面`} />
    ) : (
      <View className="cvr" />
    );

  const StoryRow = ({ e }: { e: EntryItem }) => (
    <View className="list-row" onClick={() => playStory(e)}>
      <Thumb e={e} />
      <View className="gr">
        <Text className="nm">{e.title}</Text>
        <Text className="ds">{e.level ? <Text className="lvb">{e.level}</Text> : null}{e.duration_ms ? `${Math.round(e.duration_ms / 60000)} 分钟` : ''}</Text>
      </View>
      <View className="cp"><Icon name="play" size={28} color="#fff" /></View>
    </View>
  );

  return (
    <ScrollView scrollY className={`page-v4 ${night}`}>
      <Text className="serif" style={{ fontSize: '40px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>{title || data?.name}</Text>

      <StateView loading={loading} error={error} empty={!loading && !error && entries.length === 0 && subCats.length === 0} onRetry={load} emptyText="这个分类还没有内容">

      {/* ✨ 分类顶部推荐（换一换） */}
      {rec.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">✨ 为你推荐</Text><Text className="m" onClick={shuffle}>换一换 ↻</Text></View>
          {rec.map((e) => (recIsStory ? (
            <StoryRow key={`rec-${e.entry_id}`} e={e} />
          ) : (
            <View key={`rec-${e.entry_id}`} className="list-row" onClick={() => openWork(e)}>
              <Thumb e={e} />
              <View className="gr"><Text className="nm">{e.title}</Text><Text className="ds">共 {e.total_chapters ?? '?'} 章</Text></View>
              <Text className="rt">›</Text>
            </View>
          )))}
        </View>
      )}

      {/* 📚 章回作品（总入口） */}
      {chaptered.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">📚 章回作品</Text></View>
          {chaptered.map((e) => (
            <View key={e.entry_id} className="list-row" onClick={() => openWork(e)}>
              <Thumb e={e} />
              <View className="gr">
                <Text className="nm">{e.title}</Text>
                <Text className="ds">共 {e.total_chapters ?? '?'} 章 · 点进听整部</Text>
              </View>
              <Text className="rt">›</Text>
            </View>
          ))}
        </View>
      )}

      {/* 🗂 合集 / 多层 */}
      {containers.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">🗂 合集</Text></View>
          {containers.map((e) => (
            <View key={e.entry_id} className="list-row" onClick={() => drill(e)}>
              <Thumb e={e} />
              <View className="gr"><Text className="nm">{e.title}</Text></View>
              <Text className="rt">›</Text>
            </View>
          ))}
        </View>
      )}

      {/* 🗂 多层子分类导航（multi_level） */}
      {subCats.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">🗂 分类</Text></View>
          {subCats.map((c, i) => (
            <View key={c.id || c.name || i} className="list-row" onClick={() => drillSub(c)}>
              <View className="cvr" />
              <View className="gr"><Text className="nm">{c.name}</Text><Text className="ds">{c.entry_count ? `${c.entry_count} 项` : ''}</Text></View>
              <Text className="rt">›</Text>
            </View>
          ))}
        </View>
      )}

      {/* 📃 全部故事 */}
      {stories.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">📃 全部故事 {stories.length}</Text></View>
          {stories.slice(0, visibleCount).map((e) => <StoryRow key={e.entry_id} e={e} />)}
          {visibleCount < stories.length ? (
            <View
              className="btn-ghost"
              onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, stories.length))}
            >
              再加载 {Math.min(PAGE_SIZE, stories.length - visibleCount)} 个
            </View>
          ) : null}
        </View>
      )}
      </StateView>
      <MiniPlayer />
    </ScrollView>
  );
}
