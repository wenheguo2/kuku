/**
 * pages/story/index — S-01 故事首页（v4 典藏绘本：问候头 + Hero + 继续听 + 大IP章回 + 单篇换一换 + 学科 tiles）
 * 推荐数据来自 _home.json；封面走 buildCoverUrl（真实封面管线，缺图则柔和底色）。
 */
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { api } from '@/services/api';
import { buildCoverUrl, guessCoverFromPath, guessCoverChain } from '@/utils/path';
import { GlobalIndex, HomeIndex, HomeHot, NON_STORY_SUBJECT_IDS } from '@/types/content';
import { usePlayerStore } from '@/stores/playerStore';
import { useUserStore } from '@/stores/userStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTabStore } from '@/stores/tabStore';
import MiniPlayer from '@/components/MiniPlayer';
import TabBarV4 from '@/components/TabBarV4';
import avatarImg from '@/assets/avatar.jpg';
import iconNight from '@/assets/icon_night.png';
import iconDay from '@/assets/icon_day.png';
import iconSearch from '@/assets/icon_search.png';
import iconFreeStory from '@/assets/icon_free_story.jpg';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { shareCard } from '@/utils/share';
import StateView from '@/components/StateView';
import './index.scss';

interface HistItem { content_type: string; content_id: string; title: string | null }
const PICK_WINDOW = 4;
/** 当年第几天：今日推荐/为你推荐每日自动换一拨（用户定：推荐要动态每天不一样） */
const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

export default function StoryHome() {
  const [global, setGlobal] = useState<GlobalIndex | null>(null);
  const [home, setHome] = useState<HomeIndex | null>(null);
  const [pickOffset, setPickOffset] = useState(0);
  // 今日推荐偏移：初始=按日轮换，“换一个”+1 循环大IP精选池
  const [heroShift, setHeroShift] = useState(0);
  const [last, setLast] = useState<HistItem | null>(null);
  // 最近播放封面：章节级 path 无专属封面，逐级上溯候选链（onError 退下一级），全失败才兜底色块
  const [lastCoverIdx, setLastCoverIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // 分享卡：真实插画 5:4 卡面（share_cards 图库）
  useShareAppMessage(() => ({
    title: '酷酷儿童故事 — 听故事·唱儿歌·学知识',
    path: '/pages/story/index/index',
    imageUrl: shareCard('E01_动物世界'),
  }));
  // 逐字段独立订阅（对象选择器会因新引用失去意义），仅相关字段变化才重渲染
  const isLogin = useUserStore((s) => s.isLogin);
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const nickname = useUserStore((s) => s.nickname);
  // ★可全站畅听（会员 active || 免费期内）：决定首页入口——!canAccessAll 显免费区，否则显收藏/最近播放
  const canAccessAll = useUserStore((s) => s.canAccessAll);
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
    // ★ weapp: navigateBack 回 tab 页时 custom-tab-bar 延迟重现——微信平台级问题，显式 showTabBar 慢一拍强制触发重渲
    if (process.env.TARO_ENV === 'weapp') Taro.showTabBar?.({ animation: false }).catch(() => {});
    if (isLogin && selectedChildId) {
      api.get<{ list: HistItem[] }>(`/history?child_id=${selectedChildId}`)
        .then((d) => { setLast((d.list || []).find((h) => h.content_type === 'story') || null); setLastCoverIdx(0); })
        .catch((error) => console.warn('继续收听加载失败', error));
    }
  });

  const goSubject = (s: string) => Taro.navigateTo({ url: `/pages/story/subject/index?subject=${encodeURIComponent(s)}` });
  const goWork = (path: string, title: string) => Taro.navigateTo({ url: `/pages/story/work/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}` });
  const goPlayer = (path: string, title: string) => Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}` });
  // 单篇播放也预先入队带封面（故事灯 segments 无 cover_url，靠队列项 coverUrl 展示大幅封面）
  const playSingle = (path: string, title: string, cover?: string) => {
    usePlayerStore.getState().setQueue([{ type: 'story' as const, id: path, title, coverUrl: buildCoverUrl(cover) || undefined }], 0);
    goPlayer(path, title);
  };
  const openHot = (h: HomeHot) => (h.type === 'chaptered' ? goWork(h.path, h.title) : playSingle(h.path, h.title, h.cover));

  const chaptered = (home?.chaptered_works ?? []).slice(0, 8);
  const picks = home?.standalone_picks ?? [];
  // ★为你推荐每日不同：窗口起点叠加按日偏移；“换一换”再在当日基础上滑窗
  const dailyBase = picks.length ? (dayOfYear() * PICK_WINDOW) % picks.length : 0;
  const win = picks.length ? Array.from({ length: Math.min(PICK_WINDOW, picks.length) }, (_, i) => picks[(dailyBase + pickOffset + i) % picks.length]) : [];
  const shuffle = () => setPickOffset((o) => (o + PICK_WINDOW) % Math.max(1, picks.length));
  const playPick = (path: string, title: string) => {
    usePlayerStore.getState().setQueue(win.map((p) => ({ type: 'story' as const, id: p.path, title: p.title, coverUrl: buildCoverUrl(p.cover) || undefined })), win.findIndex((p) => p.path === path));
    goPlayer(path, title);
  };
  // ★今日推荐：大IP精选池按日轮换 + 换一个（用户定）
  const hots = home?.hot ?? [];
  const hero = hots.length ? hots[(dayOfYear() + heroShift) % hots.length] : undefined;
  const nextHero = () => setHeroShift((s) => s + 1);

  return (
    <View className={night}>
    <ScrollView scrollY className="page-v4 has-tab" style={{ height: '100vh' }}>
      <StateView
        loading={loading}
        error={loadError}
        empty={!global && !home}
        emptyText="暂无故事内容"
        onRetry={() => void loadIndexes()}
      >
      {/* 问候头 */}
      <View className="greet">
        <Image className="avatar" src={avatarImg} mode="aspectFill" ariaLabel="小听众头像" />
        <View className="flex-1">
          <Text className="hi">{isLogin ? `你好，${nickname || '小听众'} 🌙` : '晚上好，小听众 🌙'}</Text>
          <Text className="big serif">今天想听什么故事呀？</Text>
        </View>
        <View className="sbtn" onClick={toggleSleep} style={{ marginLeft: 'auto' }}>
          {/* 两态图标：夜间模式已开→显日间图（点击回白天）；否则显夜间图 */}
          <Image className="im" src={night ? iconDay : iconNight} mode="aspectFill" ariaLabel={night ? '切回日间模式' : '切到夜间模式'} />
        </View>
        <View className="sbtn" onClick={() => Taro.navigateTo({ url: '/pages/common/search/index?scope=story' })} style={{ marginLeft: '12px' }}>
          <Image className="im" src={iconSearch} mode="aspectFill" ariaLabel="搜索" />
        </View>
      </View>

      {/* ★免费专区（无畅听权限时占据今日推荐位，同尺寸；与今日推荐互斥） */}
      {!canAccessAll && (
        <View>
          <View className="hero" onClick={() => Taro.navigateTo({ url: '/pages/common/free-zone/index?tab=story' })}>
            <Image className="cover" src={iconFreeStory} mode="aspectFill" ariaLabel="免费专区" />
            <View className="shade" />
            <View className="inner">
              <Text className="htag">🎁 免费专区</Text>
              <Text className="h-title serif">精选故事免费听</Text>
              <Text className="h-meta">50 个故事 · 100 首儿歌 · 免费畅听</Text>
            </View>
            <View className="hplay"><Icon name="play" size={42} color="#fff" /></View>
          </View>
        </View>
      )}

      {/* Hero 今日推荐（按日轮换大IP + 换一个）——仅有畅听权限时显示 */}
      {canAccessAll && hero && (
        <View>
          <View className="hero" onClick={() => openHot(hero)}>
            {buildCoverUrl(hero.cover) ? <Image className="cover" webp src={buildCoverUrl(hero.cover)} mode="aspectFill" ariaLabel={`${hero.title}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#FFB067,#FF8C42)' }} />}
            <View className="shade" />
            <View className="inner">
              <Text className="htag">🌟 今日推荐</Text>
              <Text className="h-title serif">{hero.title}</Text>
              <Text className="h-meta">{hero.subject}{hero.type === 'chaptered' ? ` · 共${hero.total_chapters}章` : ''}</Text>
            </View>
            <View className="htag" style={{ position: 'absolute', top: '20px', right: '20px' }} onClick={(e) => { e.stopPropagation(); nextHero(); }}>换一个 ↻</View>
            <View className="hplay"><Icon name="play" size={42} color="#fff" /></View>
          </View>
          {/* 指示点：真实反映当前推荐在池中的位置（原先硬编 3 点且首点恒亮，是死装饰） */}
          {hots.length > 1 && (
            <View className="dots-i">
              {Array.from({ length: Math.min(5, hots.length) }, (_, i) => (
                <Text key={i} className={`d ${i === ((dayOfYear() + heroShift) % Math.min(5, hots.length)) ? 'on' : ''}`} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ★分享拉新：醒目真按钮（open-type=share 直接拉转发面板，配真插画分享卡） */}
      <Button className="share-bar" openType="share">📤 把酷酷分享给小伙伴一起听</Button>

      {/* 最近播放（仅有畅听权限时显示；点击重新播放，非续播）；历史接口无封面字段，按 path 推导，404 回退色块 */}
      {canAccessAll && last && (
        <View>
          <View className="sec-h"><Text className="t">最近播放</Text><Text className="m" onClick={() => Taro.navigateTo({ url: '/pages/common/favorites/index?tab=story' })}>我的收藏 ›</Text></View>
          <View className="cont" style={{ margin: '0 4px' }} onClick={() => playSingle(last.content_id, last.title || '最近播放', guessCoverFromPath(last.content_id))}>
            {(() => {
              const chain = guessCoverChain(last.content_id);
              return chain.length > lastCoverIdx
                ? <Image className="cvr" webp src={chain[lastCoverIdx]} mode="aspectFill" onError={() => setLastCoverIdx((i) => i + 1)} ariaLabel={`${last.title || '最近播放'}封面`} />
                : <View className="cvr" />;
            })()}
            <View className="gr">
              <Text className="nm">{last.title || last.content_id}</Text>
              <Text className="ds">重新播放上次的故事</Text>
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
                {buildCoverUrl(w.cover) ? <Image className="cvr" lazyLoad webp src={buildCoverUrl(w.cover)} mode="aspectFill" ariaLabel={`${w.title}封面`} /> : <View className="cvr" />}
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
              {buildCoverUrl(p.cover) ? <Image className="cvr" lazyLoad webp src={buildCoverUrl(p.cover)} mode="aspectFill" ariaLabel={`${p.title}封面`} /> : <View className="cvr" />}
              <View className="gr">
                <Text className="nm">{p.title}</Text>
                <Text className="ds">{p.subject}</Text>
              </View>
              <View className="cp"><Icon name="play" size={28} color="#fff" /></View>
            </View>
          ))}
        </View>
      )}

      {/* 故事学科 tiles */}
      <View className="sec-h"><Text className="t">故事学科</Text><Text className="m">全部 ›</Text></View>
      <View className="tilegrid">
        {(global?.subjects ?? []).filter((s) => !NON_STORY_SUBJECT_IDS.includes(s.subject_id)).map((s) => (
          <View key={s.subject_id} className="tile" onClick={() => goSubject(s.subject_id)}>
            {buildCoverUrl(s.cover?.cover_image_url) ? <Image className="cover" lazyLoad webp src={buildCoverUrl(s.cover?.cover_image_url)} mode="aspectFill" ariaLabel={`${s.subject_name}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#FFB067,#FF8C42)' }} />}
            <View className="shade" />
            <View className="tt"><Text className="a">{s.subject_name}</Text><Text className="b">{s.total_entries} 个故事</Text></View>
          </View>
        ))}
      </View>
      </StateView>
    </ScrollView>
    {/* ★迷你栏/TabBar 在 ScrollView 外：weapp 下 ScrollView 内 fixed 子元素被裁剪不显示（用户实测退回首页无播放栏根因） */}
    <MiniPlayer />
    {process.env.TARO_ENV === 'h5' && <TabBarV4 />}
    </View>
  );
}
