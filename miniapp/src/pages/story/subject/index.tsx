/**
 * pages/story/subject — S-02 学科页（v4：真封面 sbhead + 色条分类行 + 全局夜间）
 * 加载 {subject}/_index.json（subject_index）→ 顶部封面头 + 分类行；点击进 story/list。
 */
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { buildCoverUrl } from '@/utils/path';
import { SubjectIndex, CategoryBrief } from '@/types/content';
import MiniPlayer from '@/components/MiniPlayer';
import { useNight } from '@/hooks/useNight';

const BAR_COLORS = ['#FF8E9E', '#FFB067', '#7FC96A', '#3FC5BC', '#B8A9E8', '#FFC93C'];

export default function StorySubject() {
  const router = useRouter();
  const subject = decodeURIComponent(router.params.subject || '品格养成');
  const [data, setData] = useState<SubjectIndex | null>(null);
  const night = useNight();

  useEffect(() => {
    indexLoader.loadIndexByPath(subject)
      .then((d) => setData(d as SubjectIndex))
      .catch((error) => console.warn('加载主题目录失败', error));
  }, [subject]);

  const cats = data?.categories ?? [];
  const cover = buildCoverUrl(data?.cover?.cover_image_url);
  const openCategory = (c: CategoryBrief) => {
    const path = c.path || `${subject}/${c.id || c.name}`;
    Taro.navigateTo({ url: `/pages/story/list/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(c.name)}` });
  };
  const typeTag = (st?: string) => (st === 'mixed' ? '合集/章回' : st === 'multi_level' ? '多层分类' : '');

  return (
    <ScrollView scrollY className={`page-v4 ${night}`}>
      {/* 学科封面头 */}
      <View className="sbhead">
        {cover ? <Image className="cover" src={cover} mode="aspectFill" ariaLabel={`${subject}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#FFB067,#FF8C42)' }} />}
        <View className="shade" />
        <View className="inner">
          <Text className="htag">{subject}</Text>
          <Text className="h-title serif">{subject}</Text>
          <Text className="h-meta">{cats.length} 个分类</Text>
        </View>
      </View>
      <View style={{ height: '18px' }} />

      {cats.map((c, i) => (
        <View key={c.id || c.name} className="list-row" style={{ margin: '0 0 16px' }} onClick={() => openCategory(c)}>
          <View className="bar" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
          <View className="gr">
            <Text className="nm">{c.name}</Text>
            <Text className="ds">{c.entry_count ? `${c.entry_count} 个故事` : ''}{typeTag(c.structure_type) ? ` · ${typeTag(c.structure_type)}` : ''}</Text>
          </View>
          <Text className="rt">›</Text>
        </View>
      ))}
      <MiniPlayer />
    </ScrollView>
  );
}
