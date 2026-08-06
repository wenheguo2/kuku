/**
 * pages/growth/index — G-01 成长首页（v4 朋友收集册：进度条 + 四级图例 + 三学科统计）
 * 数据 GET /progress/summary（四级朋友统计）。徽章墙个体在收集册页展开。
 * ★首屏直给字词：“和字交朋友”（识字前 12 课）+“和单词交朋友”（英语前 8 词）宫格，点字/词直达教学播放器；+三学科全部课程入口，不依赖搜索（对小朋友友好）。
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { loadLessonEntries, LessonEntry, isFreeLesson } from '@/services/lessonCatalog';
import { useUserStore } from '@/stores/userStore';
import MiniPlayer from '@/components/MiniPlayer';
import TabBarV4 from '@/components/TabBarV4';
import ShareBar from '@/components/ShareBar';
import Icon from '@/components/Icon';
import iconSearch from '@/assets/icon_search.png';
import iconFriendCollection from '@/assets/icon_friend_collection.jpg';
import iconFriendTest from '@/assets/icon_friend_test.jpg';
import { useNight } from '@/hooks/useNight';
import { useShareCard } from '@/hooks/useShareCard';
import { useTabStore } from '@/stores/tabStore';

interface Summary {
  overall_stats: { total_words_learned: number; total_words_mastered: number; total_words_friends?: number };
  subject_progress: { subject: string; learned: number; tested: number; mastered: number }[];
}
interface ProgList { words: { word_id: string; current_stage: number }[] }

const SUBJECTS = [
  { name: '识字', color: 'var(--color-primary)' },
  { name: '英语', color: 'var(--color-blue)' },
];

export default function GrowthHome() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [wordPreview, setWordPreview] = useState<LessonEntry[]>([]);
  const [enPreview, setEnPreview] = useState<LessonEntry[]>([]);
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const isLogin = useUserStore((s) => s.isLogin);
  const canAccessAll = useUserStore((s) => s.canAccessAll);
  const night = useNight();
  // ★前10课门控：seq<10 或权益期内(canAccessAll)放行；否则引导开通。对齐词表页 guardLesson，防首屏宫格直达绕过。
  const openWord = (subject: string, w: LessonEntry) => {
    if (!(isFreeLesson(w.seq) || canAccessAll)) {
      Taro.showToast({ title: '这里需要爸爸妈妈帮忙打开哦', icon: 'none' });
      setTimeout(() => Taro.navigateTo({ url: '/pages/common/member/index' }), 600);
      return;
    }
    Taro.navigateTo({ url: `/pages/growth/player/index?subject=${encodeURIComponent(subject)}&word=${encodeURIComponent(w.text)}&path=${encodeURIComponent(w.path)}&study_type=study1&seq=${w.seq}` });
  };

  // 首屏字词宫格（用户定：展示最靠前的“还没交过朋友”的字/词，按课序从早到晚）：
  // 登录时拉学科进度过滤已学(stage>=1)，未登录/拉取失败回退前 N 课
  useEffect(() => {
    const fill = async (subject: string, take: number, setter: (l: LessonEntry[]) => void) => {
      const all = await loadLessonEntries(subject);
      let learned = new Set<string>();
      if (isLogin && selectedChildId) {
        try {
          const d = await api.get<ProgList>(`/progress/${encodeURIComponent(subject)}?child_id=${selectedChildId}&page_size=500`);
          learned = new Set((d.words ?? []).filter((w) => w.current_stage >= 1).map((w) => w.word_id));
        } catch (error) { console.warn(`拉取${subject}进度失败，宫格退回前N课`, error); }
      }
      setter(all.filter((w) => !learned.has(w.id)).slice(0, take));
    };
    fill('识字', 12, setWordPreview).catch((error) => console.warn('加载字词预览失败', error));
    fill('英语', 8, setEnPreview).catch((error) => console.warn('加载单词预览失败', error));
  }, [isLogin, selectedChildId]);

  const load = () => {
    if (!isLogin || !selectedChildId) return;
    api.get<Summary>(`/progress/summary?child_id=${selectedChildId}`)
      .then(setSum)
      .catch((error) => console.warn('加载成长概览失败', error));
  };
  useEffect(load, [selectedChildId, isLogin]);
  useDidShow(() => { useTabStore.getState().setTab('growth'); load(); });

  const learned = sum?.overall_stats.total_words_learned ?? 0; // 累计 >=1
  const friends = sum?.overall_stats.total_words_friends ?? 0; // 累计 >=2
  const mastered = sum?.overall_stats.total_words_mastered ?? 0; // 累计 >=3
  const total = learned; // 已遇见朋友总数（stage>=1 即全部），不再相加致重复计数
  // 各等级“独占”数量用于进度条分段（不重叠，和为 total）
  const acquaintedOnly = Math.max(0, learned - friends);
  const friendOnly = Math.max(0, friends - mastered);
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '0%');

  return (
    <View className={night}>
    <ScrollView scrollY className="page-v4 has-tab" style={{ height: '100vh' }}>
      <View style={{ textAlign: 'center', padding: '10px 20px 4px' }}>
        <Text style={{ fontSize: '20px', letterSpacing: '4px', color: 'var(--color-text-secondary)', fontWeight: 800, display: 'block' }}>FRIENDS COLLECTION</Text>
        <Text className="serif" style={{ fontSize: '38px', fontWeight: 800, marginTop: '8px', display: 'block', color: 'var(--color-text)' }}>我的朋友收集册</Text>
      </View>

      {!isLogin && (
        <View className="frow" style={{ marginTop: '12px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>
          <Text style={{ color: 'var(--color-primary)' }}>登录后记录你的朋友收集进度 →</Text>
        </View>
      )}

      {/* 四级进度卡 */}
      <View className="gcard" style={{ marginTop: '12px' }}>
        <Text style={{ fontSize: '26px', fontWeight: 800, display: 'block', color: 'var(--color-text)' }}>
          已遇见 <Text style={{ color: 'var(--color-primary)' }}>{total}</Text> 位朋友 · 其中 <Text style={{ color: '#57B83E' }}>{mastered}</Text> 位好伙伴
        </Text>
        <View className="gbar">
          <View style={{ width: pct(acquaintedOnly), background: 'var(--stage-1)' }} />
          <View style={{ width: pct(friendOnly), background: 'var(--stage-2)' }} />
          <View style={{ width: pct(mastered), background: 'var(--stage-3)' }} />
        </View>
        <View className="glegend">
          <Text><Text className="dot" style={{ background: 'var(--stage-1)' }} />已相识 {acquaintedOnly}</Text>
          <Text><Text className="dot" style={{ background: 'var(--stage-2)' }} />好朋友 {friendOnly}</Text>
          <Text><Text className="dot" style={{ background: 'var(--stage-3)' }} />好伙伴 {mastered}</Text>
        </View>
      </View>

      {/* ★和字交朋友：直给字词宫格，点字直达教学播放器（不用搜索） */}
      {wordPreview.length > 0 && (
        <View style={{ margin: '18px 0 6px' }}>
          <View className="sec-h"><Text className="t">🌱 和字交朋友</Text><Text className="m" onClick={() => Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent('识字')}` })}>全部字词 ›</Text></View>
          <View className="wgrid">
            {wordPreview.map((w) => (
              <View key={w.id} className="wcell" onClick={() => openWord('识字', w)}>
                {w.text}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ★和单词交朋友：英语单词宫格（单词长→两列宽卡小字），点词直达教学播放器 */}
      {enPreview.length > 0 && (
        <View style={{ margin: '18px 0 6px' }}>
          <View className="sec-h"><Text className="t">🌈 和单词交朋友</Text><Text className="m" onClick={() => Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent('英语')}` })}>全部单词 ›</Text></View>
          <View className="wgrid en">
            {enPreview.map((w) => (
              <View key={w.id} className="wcell" onClick={() => openWord('英语', w)}>
                {w.text}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 三学科课程直达（点学科进完整词表） */}
      <View className="grow3" style={{ margin: '14px 0' }}>
        {SUBJECTS.map((s) => {
          const p = sum?.subject_progress.find((x) => x.subject === s.name);
          const c = p?.learned ?? 0; // 累计口径：learned(>=1) 即该学科已遇见总数，不再相加
          return (
            <View key={s.name} className="gstat" onClick={() => Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent(s.name)}` })}>
              <Text className="v" style={{ color: s.color }}>{c}</Text>
              <Text className="k">{s.name} ›</Text>
            </View>
          );
        })}
      </View>

      {/* ★分享拉新：成长线也要能分享（家长爱晒孩子学习成果，拉新转化高） */}
      <ShareBar text="🌱 把孩子的成长与朋友圈分享" />

      {/* 入口 */}
      <View className="frow" onClick={() => Taro.navigateTo({ url: '/pages/common/search/index?scope=growth' })}>
        <View className="fi"><Image className="im" src={iconSearch} mode="aspectFill" ariaLabel="搜字词图标" /></View>搜字/词<Text className="rt">识字 / 英语 ›</Text>
      </View>
      <View className="frow" onClick={() => Taro.navigateTo({ url: '/pages/growth/collection/index' })}>
        <View className="fi"><Image className="im" src={iconFriendCollection} mode="aspectFill" ariaLabel="朋友收集册图标" /></View>朋友收集册<Text className="rt">查看全部 ›</Text>
      </View>
      <View className="frow" onClick={() => Taro.navigateTo({ url: '/pages/growth/comprehensive/index?subject=识字' })}>
        <View className="fi"><Image className="im" src={iconFriendTest} mode="aspectFill" ariaLabel="友情大考验图标" /></View>友情大考验<Text className="rt">攒满 10 好朋友 → 好伙伴 ›</Text>
      </View>
    </ScrollView>
    {/* ★迷你栏/TabBar 在 ScrollView 外：weapp 下 ScrollView 内 fixed 子元素被裁剪不显示 */}
    <MiniPlayer />
    {process.env.TARO_ENV === 'h5' && <TabBarV4 />}
    </View>
  );
}
