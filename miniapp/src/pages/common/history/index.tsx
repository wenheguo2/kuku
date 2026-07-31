/**
 * pages/common/history — C-04 播放历史（★ 按 child_id 隔离）
 * GET /history?child_id=；DELETE /history?child_id= 清空。加载/空/错误态用 StateView。
 * ★ 故事 / 歌曲 分段展示（与收藏页同套插画卡 Tab），段内再按 今天/昨天/更早 分组。
 */
import { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { buildCoverUrl, guessCoverChain } from '@/utils/path';
import iconStory from '@/assets/icon_fav_story.png';
import iconSong from '@/assets/icon_fav_song.png';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

interface Hist { history_id: string; content_type: string; content_id: string; title: string | null; played_at: string }
type Tab = 'story' | 'song';

/** 歌曲单曲封面按路径规则：covers/generated/{path}/{歌名}_1.jpg（与收藏页同规则） */
const songCoverFromPath = (p: string) => {
  const name = p.split('/').filter(Boolean).pop();
  return name ? buildCoverUrl(`covers/generated/${p}/${name}_1.jpg`) : '';
};

export default function History() {
  const isLogin = useUserStore((s) => s.isLogin);
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const [list, setList] = useState<Hist[]>([]);
  const [tab, setTab] = useState<Tab>('story');
  // ★章回章节无专属封面：每条目维护候选链游标，onError 逐级上溯到作品封面，全失败回退插画
  const [coverIdx, setCoverIdx] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    if (!isLogin || !selectedChildId) { setLoading(false); return; }
    setLoading(true); setError(false);
    api.get<{ list: Hist[] }>(`/history?child_id=${selectedChildId}`)
      .then((d) => setList(d.list))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useDidShow(load);

  const clear = async () => {
    const res = await Taro.showModal({ title: '清空历史', content: '确定清空宝宝的全部播放记录？' });
    if (!res.confirm) return;
    try {
      await api.del(`/history?child_id=${selectedChildId}`);
      setList([]);
    } catch (error) {
      console.warn('清空历史失败', error);
      Taro.showToast({ title: '清空失败，请重试', icon: 'none' });
    }
  };

  /** 点历史条目→对应播放器续播（story→故事灯，song→歌曲） */
  const openHist = (h: Hist) => {
    if (h.content_type === 'song') {
      Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(h.content_id)}&title=${encodeURIComponent(h.title || h.content_id)}` });
    } else {
      Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(h.content_id)}&title=${encodeURIComponent(h.title || h.content_id)}` });
    }
  };

  /** ★ md/09 C-04：按 今天/昨天/更早 分组展示 */
  const groupOf = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    if (day(d) === day(now)) return '今天';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    return day(d) === day(y) ? '昨天' : '更早';
  };
  const stories = list.filter((h) => h.content_type !== 'song');
  const songs = list.filter((h) => h.content_type === 'song');
  const shown = tab === 'story' ? stories : songs;
  const groups = ['今天', '昨天', '更早'].map((g) => ({ g, items: shown.filter((h) => groupOf(h.played_at) === g) })).filter((x) => x.items.length);

  if (!isLogin) return (
    <View className={`center ${night}`}>
      <Text className="emoji-xl">🕒</Text>
      <Text className="muted" style={{ marginBottom: '28px' }}>登录后查看宝宝的播放历史</Text>
      <View className="pill-orange" onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>去登录</View>
    </View>
  );

  return (
    <View className={`page-container ${night}`}>
      <View className="row" style={{ margin: '8px 4px 16px' }}>
        <Text className="flex-1" style={{ fontSize: '38px', fontWeight: 'bold', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>🕒 播放历史</Text>
        {list.length > 0 && <View className="load-more-pill" style={{ flex: '0 0 auto', padding: '8px 20px', margin: 0, fontSize: '24px', color: '#E4572E', borderColor: '#F3C6BC' }} onClick={clear}>🗑 清空</View>}
      </View>
      {/* 故事 / 歌曲 分段：与收藏页同款插画卡 Tab */}
      <View style={{ display: 'flex', gap: '16px', margin: '4px 0 20px' }}>
        <View style={{ flex: 1, position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '120px', boxShadow: tab === 'story' ? '0 6px 18px rgba(255,140,66,.35)' : 'none', border: tab === 'story' ? '3px solid var(--color-primary)' : '2px solid var(--color-border)' }} onClick={() => setTab('story')}>
          <Image src={iconStory} mode="aspectFill" style={{ width: '100%', height: '100%', opacity: tab === 'story' ? 1 : 0.5 }} />
          <Text style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '24px', fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>故事 {stories.length}</Text>
        </View>
        <View style={{ flex: 1, position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '120px', boxShadow: tab === 'song' ? '0 6px 18px rgba(63,197,188,.35)' : 'none', border: tab === 'song' ? '3px solid #3FC5BC' : '2px solid var(--color-border)' }} onClick={() => setTab('song')}>
          <Image src={iconSong} mode="aspectFill" style={{ width: '100%', height: '100%', opacity: tab === 'song' ? 1 : 0.5 }} />
          <Text style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '24px', fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>歌曲 {songs.length}</Text>
        </View>
      </View>
      <StateView loading={loading} error={error} empty={shown.length === 0}
        emptyText={tab === 'story' ? '暂无故事播放记录' : '暂无歌曲播放记录'} emptyIcon="clock" onRetry={load}>
        {groups.map(({ g, items }) => (
          <View key={g}>
            <View className="sec-h"><Text className="t">{g}</Text></View>
            {items.map((h) => {
              const chain = h.content_type === 'song' ? [songCoverFromPath(h.content_id)] : guessCoverChain(h.content_id);
              const src = chain[coverIdx[h.history_id] ?? 0] || (h.content_type === 'song' ? iconSong : iconStory);
              return (
                <View key={h.history_id} className="list-row" onClick={() => openHist(h)}>
                  <Image className="cvr" src={src} mode="aspectFill" onError={() => setCoverIdx((m) => ({ ...m, [h.history_id]: (m[h.history_id] ?? 0) + 1 }))} ariaLabel={`${h.title || '内容'}封面`} />
                  <View className="gr">
                    <Text className="nm">{h.title || h.content_id}</Text>
                    <Text className="ds">{new Date(h.played_at).toLocaleString()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </StateView>
    </View>
  );
}
