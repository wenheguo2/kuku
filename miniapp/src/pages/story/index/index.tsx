/**
 * pages/story/index — S-01 故事首页（v4 典藏绘本：问候头 + Hero + 继续听 + 大IP章回 + 单篇换一换 + 学科 tiles）
 * 推荐数据来自 _home.json；封面走 buildCoverUrl（真实封面管线，缺图则柔和底色）。
 */
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { api } from '@/services/api';
import { buildCoverUrl } from '@/utils/path';
import { GlobalIndex, HomeIndex, HomeHot } from '@/types/content';
import { usePlayerStore } from '@/stores/playerStore';
import { useUserStore } from '@/stores/userStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTabStore } from '@/stores/tabStore';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import StateView from '@/components/StateView';
import './index.scss';

interface HistItem { content_type: string; content_id: string; title: string | null }
const PICK_WINDOW = 4;

export default function StoryHome() {
  const [global, setGlobal] = useState<GlobalIndex | null>(null);
  const [home, setHome] = useState<HomeIndex | null>(null);
  const [pickOffset, setPickOffset] = useState(0);
  const [last, setLast] = useState<HistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { isLogin, selectedChildId, nickname } = useUserStore();
  const night = useNight();
  const toggleSleep = useSettingsStore((s) => s.toggleSleep);

  const loadIndexes = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [globalData, homeData] = await Promise.all([indexLoader.loadGlobal(), indexLoader.loadHome()]);
      setGlobal(globalData);
      setHome(homeData);
    } catch (error) {
      console.warn('故事首页索引加载失败', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIndexes();
  }, []);

  useDidShow(() => {
    useTabStore.getState().setTab('story');
    if (isLogin && selectedChildId) {
      api.get<{ list: HistItem[] }>(`/history?child_id=${selectedChildId}`)
        .then((d) => setLast((d.list || []).find((h) => h.content_type === 'story') || null))
        .catch((error) => console.warn('继续收听加载失败', error));
    }
  });

  const goSubject = (s: string) => Taro.navigateTo({ url: `/pages/story/subject/index?subject=${encodeURIComponent(s)}` });
  const goWork = (path: string, title: string) => Taro.navigateTo({ url: `/pages/story/work/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}` });
  const goPlayer = (path: string, title: string) => Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}` });
  const openHot = (h: HomeHot) => (h.type === 'chaptered' ? goWork(h.path, h.title) : goPlayer(h.path, h.title));

  const chaptered = (home?.chaptered_works ?? []).slice(0, 8);
  const picks = home?.standalone_picks ?? [];
  const win = picks.length ? Array.from({ length: Math.min(PICK_WINDOW, picks.length) }, (_, i) => picks[(pickOffset + i) % picks.length]) : [];
  const shuffle = () => setPickOffset((o) => (o + PICK_WINDOW) % Math.max(1, picks.length));
  const playPick = (path: string, title: string) => {
    usePlayerStore.getState().setQueue(win.map((p) => ({ path: p.path, title: p.title })), win.findIndex((p) => p.path === path));
    goPlayer(path, title);
  };
  const hero = (home?.hot ?? [])[0];

  return (
    <ScrollView scrollY className={`page-v4 has-tab ${night}`}>
      <StateView
        loading={loading}
        error={loadError}
        empty={!global && !home}
        emptyText="暂无故事内容"
        onRetry={() => void loadIndexes()}
      >
      {/* 问候头 */}
      <View className="greet">
        <View className="avatar" />
        <View className="flex-1">
          <Text className="hi">{isLogin ? `你好，${nickname || '小听众'} 🌙` : '晚上好，小听众 🌙'}</Text>
          <Text className="big serif">今天想听什么故事呀？</Text>
        </View>
        <View className="sbtn" onClick={toggleSleep} style={{ marginLeft: 'auto' }}>
          <Icon name="moon" size={36} color="#B8A9E8" />
        </View>
        <View className="sbtn" onClick={() => Taro.navigateTo({ url: '/pages/common/search/index' })} style={{ marginLeft: '12px' }}>
          <Icon name="search" size={38} color="#FF8C42" />
        </View>
      </View>

      {/* Hero 今日推荐 */}
      {hero && (
        <View>
          <View className="hero" onClick={() => openHot(hero)}>
            {buildCoverUrl(hero.cover) ? <Image className="cover" src={buildCoverUrl(hero.cover)} mode="aspectFill" ariaLabel={`${hero.title}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#FFB067,#FF8C42)' }} />}
            <View className="shade" />
            <View className="inner">
              <Text className="htag">🌟 今日推荐</Text>
              <Text className="h-title serif">{hero.title}</Text>
              <Text className="h-meta">{hero.subject}{hero.type === 'chaptered' ? ` · 共${hero.total_chapters}章` : ''}</Text>
            </View>
            <View className="hplay"><Icon name="play" size={42} color="#fff" /></View>
          </View>
          <View className="dots-i"><Text className="on" /><Text /><Text /></View>
        </View>
      )}

      {/* 继续听 */}
      {last && (
        <View>
          <View className="sec-h"><Text className="t">继续听</Text><Text className="m">全部 ›</Text></View>
          <View className="cont" style={{ margin: '0 4px' }} onClick={() => goPlayer(last.content_id, last.title || '继续听')}>
            <View className="cvr" />
            <View className="gr">
              <Text className="nm">{last.title || last.content_id}</Text>
              <Text className="ds">上次听到的故事</Text>
              <View className="c-bar"><View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '42%', borderRadius: '5px', background: 'linear-gradient(90deg,#FFB067,#FF8C42)' }} /></View>
            </View>
            <View className="cp"><Icon name="play" size={30} color="#fff" /></View>
          </View>
        </View>
      )}

      {/* 大IP章回 */}
      {chaptered.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">📜 章回故事推荐</Text><Text className="m" onClick={() => goSubject('上下五千年')}>更多 ›</Text></View>
          <ScrollView scrollX className="hscroll">
            {chaptered.map((w) => (
              <View key={w.path} className="scard" onClick={() => goWork(w.path, w.title)}>
                {buildCoverUrl(w.cover) ? <Image className="cvr" src={buildCoverUrl(w.cover)} mode="aspectFill" ariaLabel={`${w.title}封面`} /> : <View className="cvr" />}
                <Text className="nm">{w.title}</Text>
                <Text className="ds">章回 · {w.total_chapters} 章</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 单篇推荐 换一换 */}
      {win.length > 0 && (
        <View>
          <View className="sec-h"><Text className="t">✨ 为你推荐</Text><Text className="m" onClick={shuffle}>换一换 ↻</Text></View>
          {win.map((p) => (
            <View key={p.path} className="list-row" style={{ margin: '0 4px 18px' }} onClick={() => playPick(p.path, p.title)}>
              {buildCoverUrl(p.cover) ? <Image className="cvr" src={buildCoverUrl(p.cover)} mode="aspectFill" ariaLabel={`${p.title}封面`} /> : <View className="cvr" />}
              <View className="gr">
                <Text className="nm">{p.title}</Text>
                <Text className="ds">{p.level ? <Text className="lvb">{p.level}</Text> : null}{p.subject}</Text>
              </View>
              <View className="cp"><Icon name="play" size={28} color="#fff" /></View>
            </View>
          ))}
        </View>
      )}

      {/* 故事学科 tiles */}
      <View className="sec-h"><Text className="t">故事学科</Text><Text className="m">全部 ›</Text></View>
      <View className="tilegrid">
        {(global?.subjects ?? []).map((s) => (
          <View key={s.subject_id} className="tile" onClick={() => goSubject(s.subject_id)}>
            {buildCoverUrl(s.cover?.cover_image_url) ? <Image className="cover" src={buildCoverUrl(s.cover?.cover_image_url)} mode="aspectFill" ariaLabel={`${s.subject_name}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#FFB067,#FF8C42)' }} />}
            <View className="shade" />
            <View className="tt"><Text className="a">{s.subject_name}</Text><Text className="b">{s.total_entries} 个故事</Text></View>
          </View>
        ))}
      </View>
      </StateView>
      <MiniPlayer />
    </ScrollView>
  );
}
