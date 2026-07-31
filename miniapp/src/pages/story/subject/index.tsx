/**
 * pages/story/subject — S-02 学科页（v4：真封面 sbhead + 真封面分类行 + 全局夜间）
 * 加载 {subject}/_index.json（subject_index）→ 顶部封面头 + 分类行（索引 categories[].cover 真封面，缺图回退色条）；点击进 story/list。
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
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    setError(false);
    indexLoader.loadIndexByPath(subject)
      .then((d) => setData(d as SubjectIndex))
      .catch((err) => { console.warn('加载主题目录失败', err); setError(true); });
  };
  useEffect(load, [subject]);

  const cats = data?.categories ?? [];
  const cover = buildCoverUrl(data?.cover?.cover_image_url);
  const openCategory = (c: CategoryBrief) => {
    const path = c.path || `${subject}/${c.id || c.name}`;
    // 分类位可能直接是章回作品（如 蒙学经典/M1三字经，chapters 在作品索引里）→ 直达 work 总入口，走 list 会读 entries 致空白
    const isWork = c.structure_type === 'chaptered_work' || c.structure_type === 'chaptered' || c.display_as === 'chaptered_card';
    const target = isWork ? 'work' : 'list';
    Taro.navigateTo({ url: `/pages/story/${target}/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(c.name)}` });
  };
  const typeTag = (st?: string) => (st === 'mixed' ? '合集/章回' : st === 'multi_level' ? '多层分类' : st === 'chaptered_work' || st === 'chaptered' ? '章回' : '');

  return (
    <ScrollView scrollY className={`page-v4 ${night}`}>
      {/* 学科封面头 */}
      <View className="sbhead">
        {cover ? <Image className="cover" webp src={cover} mode="aspectFill" ariaLabel={`${subject}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#FFB067,#FF8C42)' }} />}
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
          {/* 分类真封面（索引 cover_image_url，物理图为分类同名 webp）；缺图回退色条 */}
          {buildCoverUrl(c.cover?.cover_image_url)
            ? <Image className="cvr" webp src={buildCoverUrl(c.cover?.cover_image_url)} mode="aspectFill" ariaLabel={`${c.name}封面`} />
            : <View className="bar" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />}
          <View className="gr">
            <Text className="nm">{c.name}</Text>
            <Text className="ds">{c.entry_count ? `${c.entry_count} 个故事` : ''}{typeTag(c.structure_type) ? ` · ${typeTag(c.structure_type)}` : ''}</Text>
          </View>
          <Text className="rt">›</Text>
        </View>
      ))}
      {error && cats.length === 0 && (
        <View className="center" style={{ padding: '40px 0' }}>
          <Text className="muted" style={{ marginBottom: '20px' }}>😶‍🌫️ 加载失败了，稍后再试试吧</Text>
          <View className="pill-ghost" onClick={load}>重试</View>
        </View>
      )}
      <MiniPlayer />
    </ScrollView>
  );
}
