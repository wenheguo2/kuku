/**
 * pages/growth/comprehensive — G-05 综合挑战 + G-06 结果
 * GET /test/comprehensive/auto 查是否攒满 10 个好朋友并取服务端题目 → 逐题作答
 * → POST 仅提交选项，由服务端判分（8/10 通过→好伙伴）。
 * 未通过只回落答错且原为好伙伴的字（后端处理）。
 */
import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';

interface Question {
  question_id: string;
  type: string;
  stem?: string;
  options: { option_id: string; text: string }[];
}
interface AutoResp {
  available: boolean;
  count: number;
  test_id: string | null;
  words: { word_id: string; word: string | null }[];
  questions: { word_id: string; question: Question }[];
}
interface CompResult { passed: boolean; correct_count: number; total: number; per_char_results: { word_id: string; passed: boolean; current_stage: number }[] }

export default function Comprehensive() {
  const router = useRouter();
  const subject = decodeURIComponent(router.params.subject || '识字');
  const { selectedChildId } = useUserStore();
  const [auto, setAuto] = useState<AutoResp | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CompResult | null>(null);
  const [locked, setLocked] = useState(false);
  const night = useNight();

  useEffect(() => {
    if (selectedChildId) {
      api.get<AutoResp>(`/test/comprehensive/auto?child_id=${selectedChildId}&subject=${encodeURIComponent(subject)}`)
        .then(setAuto)
        .catch((e: { code?: number }) => { if (e?.code === 403) setLocked(true); });
    }
  }, [selectedChildId]);

  const submit = async () => {
    if (!auto?.test_id) return;
    if (auto.questions.some(({ question }) => !answers[question.question_id])) {
      Taro.showToast({ title: '请先完成全部挑战', icon: 'none' });
      return;
    }
    const payload = auto.questions.map(({ question }) => ({
      question_id: question.question_id,
      selected_option: answers[question.question_id],
    }));
    const r = await api.post<CompResult>('/test/comprehensive/auto', {
      child_id: selectedChildId,
      subject,
      test_id: auto.test_id,
      answers: payload,
    });
    setResult(r);
  };

  if (locked) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">👑</Text>
        <Text style={{ fontSize: '38px', fontWeight: 800, display: 'block', margin: '8px 0' }}>综合挑战是会员专属</Text>
        <Text className="muted" style={{ marginBottom: '28px' }}>开通会员解锁综合挑战，升级“好伙伴”</Text>
        <View className="btn-primary" style={{ width: '360px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/member/index' })}>去开通会员</View>
      </View>
    );
  }

  if (!auto) return <View className={`page-container ${night}`}><Text className="muted">加载中…</Text></View>;

  if (!auto.available && !result) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">🌟</Text>
        <Text style={{ fontSize: '36px', fontWeight: 800, display: 'block', margin: '8px 0' }}>还没攒够 10 个好朋友</Text>
        <Text className="muted">当前 {auto.count}/10，继续加油和字词交朋友吧！</Text>
      </View>
    );
  }

  return (
    <View className={`page-container ${night}`}>
      {!result && (
        <>
          <Text className="brand-title" style={{ color: '#7FC96A' }}>综合挑战 · {subject}</Text>
          <Text className="muted" style={{ display: 'block', marginBottom: '16px', textAlign: 'center' }}>10 个好朋友的大考验，答对 8 个就能升级好伙伴！</Text>
          {auto.questions.map(({ word_id, question }) => {
            const word = auto.words.find((item) => item.word_id === word_id);
            return (
              <View key={question.question_id} className="card" style={{ marginBottom: '16px' }}>
                <Text className="nm" style={{ display: 'block', marginBottom: '12px' }}>
                  请选择你听到/看到的字词：{question.stem || word?.word || ''}
                </Text>
                <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {question.options.map((option) => (
                    <Text
                      key={option.option_id}
                      className={`chip ${answers[question.question_id] === option.option_id ? 'on' : ''}`}
                      onClick={() => setAnswers((state) => ({ ...state, [question.question_id]: option.option_id }))}
                    >
                      {option.text}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
          <View className="btn-green" onClick={submit}>提交综合挑战</View>
        </>
      )}
      {result && (
        <View className="center">
          <Text className="emoji-xl">{result.passed ? '🏆' : '🌱'}</Text>
          <Text style={{ fontSize: '40px', fontWeight: 800, display: 'block', margin: '8px 0' }}>{result.passed ? '恭喜！升级好伙伴！' : '继续努力！'}</Text>
          <Text style={{ fontSize: '56px', fontWeight: 800, color: '#7FC96A', display: 'block', margin: '10px 0' }}>{result.correct_count}<Text style={{ fontSize: '30px', color: 'var(--color-text-secondary)' }}>/{result.total}</Text></Text>
          <Text className="muted">（未通过只回落答错且原为好伙伴的字）</Text>
          <View className="btn-green" style={{ width: '360px', marginTop: '28px' }} onClick={() => Taro.navigateBack()}>返回</View>
        </View>
      )}
    </View>
  );
}
