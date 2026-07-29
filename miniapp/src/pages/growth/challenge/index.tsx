/**
 * pages/growth/challenge — G-04 普通挑战
 * GET /test/quiz/:word_id 取题（不含答案）→ 一题一屏作答 → POST 提交（服务端判分）→ 逐题正误 + 朋友等级。
 * ★ 无惩罚·可无限重试：未通过始终可“再试一次”（后端返回 can_retry=!passed）。
 * ★ 一题一屏（UX-10）：分步作答，当前题未选禁用“下一题/提交”。
 */
import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';

interface Question { question_id: string; type: string; stem?: string; options: { option_id: string; text: string }[] }
interface Quiz { test_id: string; word_id: string; questions: Question[] }
interface Result {
  test_passed: boolean;
  can_retry: boolean;
  feedback: string;
  stage_name: string;
  results?: { question_id: string; is_correct: boolean }[];
}

/** 题型标签（覆盖当前占位题型；Phase 2 真实题型接入后可继续补充） */
const TYPE_LABEL: Record<string, string> = {
  recognition: '听音选字',
  pinyin: '选拼音',
  word_formation: '选组词',
  sound_to_char: '听句子选字',
  char_to_sound: '这个字怎么读',
  char_to_word: '选正确组词',
  word_to_meaning: '选中文意思',
  word_to_sound: '听发音选单词',
  sentence_fill: '完型填空',
};

export default function Challenge() {
  const router = useRouter();
  const subject = decodeURIComponent(router.params.subject || '识字');
  const wordId = decodeURIComponent(router.params.word_id || '的_001');
  const wordText = decodeURIComponent(router.params.word_text || '的');
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const night = useNight();

  const loadQuiz = () => {
    setResult(null); setPicks({}); setStep(0); setError(false);
    api.get<Quiz>(`/test/quiz/${encodeURIComponent(wordId)}?child_id=${selectedChildId}&subject=${encodeURIComponent(subject)}&word_text=${encodeURIComponent(wordText)}`)
      .then(setQuiz)
      .catch((err) => { console.warn('加载挑战题失败', err); setError(true); });
  };
  useEffect(() => { if (selectedChildId) loadQuiz(); }, [selectedChildId]);

  const submit = async () => {
    if (!quiz) return;
    if (quiz.questions.some((q) => !picks[q.question_id])) {
      Taro.showToast({ title: '请先完成全部题目', icon: 'none' });
      return;
    }
    const answers = quiz.questions.map((q) => ({ question_id: q.question_id, selected_option: picks[q.question_id] || '' }));
    try {
      const r = await api.post<Result>(`/test/quiz/${encodeURIComponent(wordId)}`, { child_id: selectedChildId, test_id: quiz.test_id, answers });
      setResult(r);
    } catch (error) {
      console.warn('提交挑战失败', error);
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
    }
  };

  if (!selectedChildId) {
    return <View className={`page-container ${night}`}><View className="btn-primary" onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>请先登录</View></View>;
  }

  if (error) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">😶‍🌫️</Text>
        <Text style={{ fontSize: '34px', fontWeight: 800, display: 'block', margin: '8px 0', color: 'var(--color-text)' }}>加载失败了</Text>
        <Text className="muted" style={{ marginBottom: '28px' }}>网络开小差了，稍后再试试吧</Text>
        <View className="btn-primary" style={{ width: '360px' }} onClick={loadQuiz}>重试</View>
      </View>
    );
  }

  if (!quiz) return <View className={`page-container ${night}`}><Text className="muted">加载中…</Text></View>;

  const total = quiz?.questions.length ?? 0;
  const cur = quiz?.questions[step];
  const answeredCur = !!(cur && picks[cur.question_id]);
  const isLast = step >= total - 1;

  return (
    <View className={`page-container ${night}`}>
      <Text className="brand-title" style={{ color: '#7FC96A' }}>挑战：{wordText}</Text>

      {!result && cur && (
        <>
          <Text className="muted" style={{ display: 'block', textAlign: 'center', marginBottom: '12px' }}>第 {step + 1} / {total} 题</Text>
          <View className="card">
            <Text style={{ fontWeight: 'bold', fontSize: '30px', color: 'var(--color-text)' }}>{TYPE_LABEL[cur.type] || '选一选'} {cur.stem ? `（${cur.stem}）` : ''}</Text>
            <View className="sgrid" style={{ marginTop: '16px' }}>
              {cur.options.map((o) => (
                <View key={o.option_id} className={`opt-card ${picks[cur.question_id] === o.option_id ? 'sel' : ''}`}
                  onClick={() => setPicks((p) => ({ ...p, [cur.question_id]: o.option_id }))}>
                  {o.text}
                </View>
              ))}
            </View>
          </View>
          <View className="row" style={{ gap: '16px', marginTop: '8px' }}>
            {step > 0 && <View className="btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>上一题</View>}
            {!isLast
              ? <View className={`btn-green flex-1 ${answeredCur ? '' : 'disabled'}`} onClick={() => answeredCur && setStep((s) => s + 1)}>下一题</View>
              : <View className={`btn-green flex-1 ${answeredCur ? '' : 'disabled'}`} onClick={() => answeredCur && submit()}>提交答案</View>}
          </View>
        </>
      )}

      {result && (
        <View className={`center ${night}`}>
          <Text className="emoji-xl">{result.test_passed ? '🎉' : '💪'}</Text>
          <Text style={{ fontSize: '40px', fontWeight: 800, display: 'block', margin: '8px 0', color: 'var(--color-text)' }}>{result.feedback}</Text>
          <Text className="muted">当前：{result.stage_name}</Text>
          {result.results && result.results.length > 0 && (
            <View className="card" style={{ width: '100%', marginTop: '20px' }}>
              {result.results.map((r, i) => (
                <View key={r.question_id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                  <Text className="nm">第 {i + 1} 题</Text>
                  <Text style={{ fontWeight: 800, color: r.is_correct ? '#7FC96A' : '#E4572E' }}>{r.is_correct ? '✓ 答对' : '✗ 答错'}</Text>
                </View>
              ))}
            </View>
          )}
          {!result.test_passed
            ? <View className="btn-green" style={{ width: '360px', marginTop: '28px' }} onClick={loadQuiz}>再试一次</View>
            : <View className="btn-green" style={{ width: '360px', marginTop: '28px' }} onClick={() => Taro.navigateBack()}>返回</View>}
        </View>
      )}
    </View>
  );
}
