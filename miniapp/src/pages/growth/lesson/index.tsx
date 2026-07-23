/**
 * pages/growth/lesson — G-02/03 课程列表 + 详情
 * 展示该学科字词列表（mock）；每个字有 学习1/2/3（POST /progress/study，驱动 0→1）+ 去挑战入口。
 * 真实词库到位后替换字词来源即可（见 开发文档/miniapp）。
 */
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
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

export default function Lesson() {
  const router = useRouter();
  const subject = decodeURIComponent(router.params.subject || '识字');
  const { selectedChildId, membershipStatus } = useUserStore();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const night = useNight();

  const study = async (wordId: string, wordText: string) => {
    if (!selectedChildId) { Taro.navigateTo({ url: '/pages/common/login/index' }); return; }
    await api.post('/progress/study', { child_id: selectedChildId, subject, word_id: wordId, word_text: wordText, study_type: 'study1' });
    setDone((d) => ({ ...d, [wordId]: true }));
    Taro.showToast({ title: '已相识 🟡', icon: 'none' });
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

  return (
    <ScrollView scrollY className={`page-container ${night}`}>
      <Text className="brand-title" style={{ color: '#7FC96A' }}>{subject} · 课程</Text>
      {(WORDS[subject] ?? []).map((w) => (
        <View key={w.id} className="card" style={{ padding: '10px 12px 20px' }}>
          <View className="list-row" style={{ background: 'transparent', boxShadow: 'none', marginBottom: '4px' }}>
            <View className="thumb" style={{ background: '#E5F6E0', color: '#7FC96A', fontSize: '48px' }}>{w.text}</View>
            <View className="gr">
              <Text className="nm">{w.text}</Text>
              <Text className="ds" style={{ color: done[w.id] ? 'var(--stage-1)' : undefined }} onClick={() => study(w.id, w.text)}>
                {done[w.id] ? '✓ 学习1 已完成' : '学习1：认读（点击）'}
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
      ))}
    </ScrollView>
  );
}
