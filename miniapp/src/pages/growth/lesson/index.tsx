/**
 * pages/growth/lesson — G-02/03 课程列表 + 详情
 * 展示该学科字词列表（mock）；每个字有 学习1/2/3（POST /progress/study，驱动 0→1）+ 去挑战入口。
 * ★ 每课显示亲密度级别徽章（来自 GET /progress/:subject 合并），顶部按亲密度级别筛选，方便点击。
 * 真实词库到位后替换字词来源即可（见 开发文档/miniapp）。
 */
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';

// mock 字词（真实来源：教学 segments/词库）
const WORDS: Record<string, { id: string; text: string }[]> = {
  识字: [
    { id: '的_001', text: '的' },
    { id: '是_001', text: '是' },
    { id: '有_001', text: '有' },
  ],
  英语: [{ id: 'apple_001', text: 'apple' }, { id: 'cat_001', text: 'cat' }],
  拼音: [{ id: 'a_001', text: 'ā' }, { id: 'o_001', text: 'ō' }],
};

// 亲密度级别（= current_stage 展示口径，颜色对齐设计令牌 --stage-0/1/2/3）
const STAGES = [
  { v: 0, label: '未遇见', color: 'var(--stage-0)' },
  { v: 1, label: '已相识', color: 'var(--stage-1)' },
  { v: 2, label: '好朋友', color: 'var(--stage-2)' },
  { v: 3, label: '好伙伴', color: 'var(--stage-3)' },
];
const stageMeta = (v: number) => STAGES[v] ?? STAGES[0];

interface ProgWord { word_id: string; word: string | null; current_stage: number; stage_name: string }
interface ProgList { subject: string; total: number; words: ProgWord[] }

export default function Lesson() {
  const router = useRouter();
  const subject = decodeURIComponent(router.params.subject || '识字');
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const membershipStatus = useUserStore((s) => s.membershipStatus);
  const [stages, setStages] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<number | 'all'>('all');
  const night = useNight();

  // 拉该学科已有进度，按 word_id 合并到本地词表；无进度的字视为“未遇见(0)”
  const loadStages = () => {
    if (!selectedChildId) return;
    api.get<ProgList>(`/progress/${encodeURIComponent(subject)}?child_id=${selectedChildId}&page_size=100`)
      .then((d) => {
        const map: Record<string, number> = {};
        d.words.forEach((w) => { map[w.word_id] = w.current_stage; });
        setStages(map);
      })
      .catch((error) => console.warn('加载亲密度进度失败', error));
  };
  useDidShow(loadStages);

  const study = async (wordId: string, wordText: string) => {
    if (!selectedChildId) { Taro.navigateTo({ url: '/pages/common/login/index' }); return; }
    try {
      await api.post('/progress/study', { child_id: selectedChildId, subject, word_id: wordId, word_text: wordText, study_type: 'study1' });
      setStages((s) => ({ ...s, [wordId]: Math.max(1, s[wordId] ?? 0) }));
      Taro.showToast({ title: '已相识 🟡', icon: 'none' });
    } catch (error) {
      console.warn('提交学习失败', error);
      Taro.showToast({ title: '网络开小差了，请重试', icon: 'none' });
    }
  };

  const challenge = (wordId: string, wordText: string) =>
    Taro.navigateTo({ url: `/pages/growth/challenge/index?subject=${encodeURIComponent(subject)}&word_id=${wordId}&word_text=${encodeURIComponent(wordText)}` });

  const play = (wordText: string) =>
    Taro.navigateTo({ url: `/pages/growth/player/index?subject=${encodeURIComponent(subject)}&word=${encodeURIComponent(wordText)}` });
  const openVipStudy = (wordText: string, studyType: 'study2' | 'study3') => {
    if (membershipStatus !== 'active') {
      Taro.navigateTo({ url: '/pages/common/member/index' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/growth/player/index?subject=${encodeURIComponent(subject)}&word=${encodeURIComponent(wordText)}&study_type=${studyType}`,
    });
  };

  const allWords = (WORDS[subject] ?? []).map((w) => ({ ...w, stage: stages[w.id] ?? 0 }));
  const shown = filter === 'all' ? allWords : allWords.filter((w) => w.stage === filter);

  return (
    <ScrollView scrollY className={`page-container ${night}`}>
      <Text className="brand-title" style={{ color: '#7FC96A' }}>{subject} · 课程</Text>

      {/* 按亲密度级别筛选，方便点击 */}
      <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '4px 12px 16px' }}>
        <View className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>全部</View>
        {STAGES.map((s) => (
          <View key={s.v} className={`chip ${filter === s.v ? 'on' : ''}`}
            style={filter === s.v ? { background: s.color, borderColor: s.color } : undefined}
            onClick={() => setFilter(s.v)}>
            {s.label}
          </View>
        ))}
      </View>

      {shown.length === 0 && (
        <Text className="muted" style={{ display: 'block', textAlign: 'center', margin: '24px 0' }}>这个级别还没有朋友，换一个筛选看看～</Text>
      )}

      {shown.map((w) => {
        const meta = stageMeta(w.stage);
        return (
          <View key={w.id} className="card" style={{ padding: '10px 12px 20px' }}>
            <View className="list-row" style={{ background: 'transparent', boxShadow: 'none', marginBottom: '4px' }}>
              <View className="thumb" style={{ background: '#E5F6E0', color: '#7FC96A', fontSize: '48px' }}>{w.text}</View>
              <View className="gr">
                <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text className="nm">{w.text}</Text>
                  {/* 亲密度级别徽章 */}
                  <Text style={{ fontSize: '20px', padding: '2px 12px', borderRadius: '999px', color: '#fff', background: meta.color }}>{meta.label}</Text>
                </View>
                <Text className="ds" style={{ color: w.stage >= 1 ? 'var(--stage-1)' : undefined }} onClick={() => study(w.id, w.text)}>
                  {w.stage >= 1 ? '✓ 学习1 已完成' : '学习1：认读（点击）'}
                </Text>
              </View>
              <View className="play-s" style={{ background: '#E5F6E0', color: '#7FC96A' }} onClick={() => play(w.text)}>▶</View>
            </View>
            <View style={{ display: 'flex', gap: '12px', margin: '0 12px 12px' }}>
              <View className="chip" onClick={() => openVipStudy(w.text, 'study2')}>
                {membershipStatus === 'active' ? '学习2：理解' : '学习2：会员专属'}
              </View>
              <View className="chip" onClick={() => openVipStudy(w.text, 'study3')}>
                {membershipStatus === 'active' ? '学习3：运用' : '学习3：会员专属'}
              </View>
            </View>
            <View className="btn-green" style={{ margin: '0 12px' }} onClick={() => challenge(w.id, w.text)}>去挑战（成为好朋友）</View>
          </View>
        );
      })}
    </ScrollView>
  );
}
