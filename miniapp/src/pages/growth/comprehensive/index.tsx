/**
 * pages/growth/comprehensive — G-05 综合挑战 + G-06 结果
 * GET /test/comprehensive/auto 查是否攒满 10 个好朋友并取服务端题目 → 逐题作答
 * → POST 仅提交选项，由服务端判分（8/10 通过→好伙伴）。
 * ★ 只升不降：答错的字保持原等级（不回落），答对才晋升好伙伴。
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
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const [auto, setAuto] = useState<AutoResp | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<CompResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    if (!selectedChildId) return;
    setError(false);
    api.get<AutoResp>(`/test/comprehensive/auto?child_id=${selectedChildId}&subject=${encodeURIComponent(subject)}`)
      .then((d) => { setAuto(d); setStep(0); })
      .catch((e: { code?: number }) => {
        if (e?.code === 403) setLocked(true);
        else { console.warn('加载综合挑战失败', e); setError(true); }
      });
  };
  useEffect(load, [selectedChildId, subject]);

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
    try {
      const r = await api.post<CompResult>('/test/comprehensive/auto', {
        child_id: selectedChildId,
        subject,
        test_id: auto.test_id,
        answers: payload,
      });
      setResult(r);
    } catch (error) {
      console.warn('提交综合挑战失败', error);
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
    }
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

  if (error) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">😶‍🌫️</Text>
        <Text style={{ fontSize: '34px', fontWeight: 800, display: 'block', margin: '8px 0' }}>加载失败了</Text>
        <Text className="muted" style={{ marginBottom: '28px' }}>网络开小差了，稍后再试试吧</Text>
        <View className="btn-primary" style={{ width: '360px' }} onClick={load}>重试</View>
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
      {!result && auto.questions[step] && (() => {
        const total = auto.questions.length;
        const { word_id, question } = auto.questions[step];
        const word = auto.words.find((item) => item.word_id === word_id);
        const answeredCur = !!answers[question.question_id];
        const isLast = step >= total - 1;
        return (
          <>
            <Text className="brand-title" style={{ color: '#7FC96A' }}>综合挑战 · {subject}</Text>
            <Text className="muted" style={{ display: 'block', textAlign: 'center', marginBottom: '12px' }}>第 {step + 1} / {total} 题 · 答对 8 题升好伙伴</Text>
            <View className="card">
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
            <View className="row" style={{ gap: '16px', marginTop: '8px' }}>
              {step > 0 && <View className="btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>上一题</View>}
              {!isLast
                ? <View className={`btn-green flex-1 ${answeredCur ? '' : 'disabled'}`} onClick={() => answeredCur && setStep((s) => s + 1)}>下一题</View>
                : <View className={`btn-green flex-1 ${answeredCur ? '' : 'disabled'}`} onClick={() => answeredCur && submit()}>提交综合挑战</View>}
            </View>
          </>
        );
      })()}
      {result && (
        <View className="center">
          <Text className="emoji-xl">{result.passed ? '🏆' : '🌱'}</Text>
          <Text style={{ fontSize: '40px', fontWeight: 800, display: 'block', margin: '8px 0' }}>{result.passed ? '恭喜！升级好伙伴！' : '继续努力！'}</Text>
          <Text style={{ fontSize: '56px', fontWeight: 800, color: '#7FC96A', display: 'block', margin: '10px 0' }}>{result.correct_count}<Text style={{ fontSize: '30px', color: 'var(--color-text-secondary)' }}>/{result.total}</Text></Text>
          <Text className="muted">答对的字就成为好伙伴啦，答错也不掉级，下次再来！</Text>
          <View className="card" style={{ width: '100%', marginTop: '20px' }}>
            {result.per_char_results.map((r) => {
              const w = auto.words.find((item) => item.word_id === r.word_id);
              return (
                <View key={r.word_id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                  <Text className="nm">{w?.word || r.word_id}</Text>
                  <Text style={{ fontWeight: 800, color: r.passed ? '#7FC96A' : '#E4572E' }}>{r.passed ? '✓ 好伙伴' : '✗ 未通过'}</Text>
                </View>
              );
            })}
          </View>
          <View className="btn-green" style={{ width: '360px', marginTop: '28px' }} onClick={() => Taro.navigateBack()}>返回</View>
        </View>
      )}
    </View>
  );
}
