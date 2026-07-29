/**
 * pages/story/work — S-04 章回作品页（总入口，如 三国演义）
 * 加载 {path}/_index.json（work_index）→ 展示作品封面/总章节 + 「连续播放」+ 章节列表。
 * 点任一章 → 设置播放队列=全部章节(full_path)，进播放器；播完自动续下一章（ST-033）。
 */
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { buildCoverUrl, cleanChapterTitle } from '@/utils/path';
import { ChapterItem, WorkIndex } from '@/types/content';
import { usePlayerStore } from '@/stores/playerStore';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';

export default function StoryWork() {
  const router = useRouter();
  const path = decodeURIComponent(router.params.path || '');
  const title = decodeURIComponent(router.params.title || '章回作品');
  const [work, setWork] = useState<WorkIndex | null>(null);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    setError(false);
    indexLoader.loadIndexByPath(path)
      .then((d) => setWork(d as WorkIndex))
      .catch((err) => { console.warn('加载作品目录失败', err); setError(true); });
  };
  useEffect(load, [path]);

  const chapters = work?.chapters ?? [];
  const cover = buildCoverUrl(work?.cover?.cover_image_url);

  const playFrom = (index: number) => {
    // ★章回连续播放：队列=全部章节，从 index 开始，播完自动续播下一章；章节共享作品封面(故事灯大幅展示用)
    const queue = chapters.map((c) => ({ type: 'story' as const, id: c.full_path, title: cleanChapterTitle(c.title), coverUrl: cover || undefined }));
    usePlayerStore.getState().setQueue(queue, index);
    const c = chapters[index];
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(c.full_path)}&title=${encodeURIComponent(cleanChapterTitle(c.title))}` });
  };

  return (
    <ScrollView scrollY className={`page-v4 ${night}`}>
      {/* 作品封面头 */}
      <View className="sbhead">
        {cover ? <Image className="cover" webp src={cover} mode="aspectFill" ariaLabel={`${title}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#C9A66B,#9C7B4A)' }} />}
        <View className="shade" />
        <View className="inner">
          <Text className="htag">章回作品 · {work?.total_chapters ?? chapters.length} 章</Text>
          <Text className="h-title serif">{work?.work_name || title}</Text>
          <Text className="h-meta">点进听整部 · 播完自动续下一章</Text>
        </View>
      </View>
      {chapters.length > 0 && (
        <View className="btn-primary" style={{ margin: '20px 0' }} onClick={() => playFrom(0)}>▶ 从第 1 章连续播放</View>
      )}

      {/* 章节目录 */}
      <View className="sec-h"><Text className="t">章节目录</Text><Text className="m">连续播放 ✓</Text></View>
      {chapters.map((c: ChapterItem, i) => (
        <View key={c.chapter_id || i} className="list-row" style={{ margin: '0 0 16px' }} onClick={() => playFrom(i)}>
          <View className="cvr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#FFF3E7,#FFE8D2)', color: 'var(--color-primary-dark)', fontWeight: 800, fontSize: '30px' }}>{c.chapter_index ?? i + 1}</View>
          <View className="gr">
            <Text className="nm">{cleanChapterTitle(c.title)}</Text>
          </View>
          <View className="cp"><Icon name="play" size={28} color="#fff" /></View>
        </View>
      ))}
      {error && chapters.length === 0 && (
        <View className="center" style={{ padding: '40px 0' }}>
          <Text className="muted" style={{ marginBottom: '20px' }}>😶‍🌫️ 加载失败了，稍后再试试吧</Text>
          <View className="btn-ghost" style={{ width: '240px' }} onClick={load}>重试</View>
        </View>
      )}
      <MiniPlayer />
    </ScrollView>
  );
}
