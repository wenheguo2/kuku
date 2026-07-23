/**
 * pages/growth/challenge — G-04 普通挑战
 * GET /test/quiz/:word_id 取题（不含答案）→ 选答 → POST 提交（服务端判分）→ 展示结果+朋友等级。
 * 未通过给 1 次重试（后端返回 can_retry）。
 */
import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';

interface Question { question_id: string; type: string; stem?: string; options: { option_id: string; text: string }[] }
interface Quiz { test_id: string; word_id: string; questions: Question[] }
interface Result { test_passed: boolean; can_retry: boolean; feedback: string; stage_name: string }

export default function Challenge() {
  const router = useRouter();
  const subject = decodeURIComponent(router.params.subject || '识字');
  const wordId = router.params.word_id || '的_001';
  const wordText = decodeURIComponent(router.params.word_text || '的');
  const { selectedChildId } = useUserStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const night = useNight();

  const loadQuiz = () => {
    setResult(null); setPicks({});
    api.get<Quiz>(`/test/quiz/${encodeURIComponent(wordId)}?child_id=${selectedChildId}&subject=${encodeURIComponent(subject)}&word_text=${encodeURIComponent(wordText)}`)
      .then(setQuiz)
      .catch((error) => console.warn('加载挑战题失败', error));
  };
  useEffect(() => { if (selectedChildId) loadQuiz(); }, [selectedChildId]);

  const submit = async () => {
    if (!quiz) return;
    const answers = quiz.questions.map((q) => ({ question_id: q.question_id, selected_option: picks[q.question_id] || '' }));
    const r = await api.post<Result>(`/test/quiz/${encodeURIComponent(wordId)}`, { child_id: selectedChildId, test_id: quiz.test_id, answers });
    setResult(r);
  };

  if (!selectedChildId) {
    return <View className={`page-container ${night}`}><View className="btn-primary" onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>请先登录</View></View>;
  }

  return (
    <View className={`page-container ${night}`}>
      <Text className="brand-title" style={{ color: '#7FC96A' }}>挑战：{wordText}</Text>
      {!result && quiz?.questions.map((q, qi) => (
        <View key={q.question_id} className="card">
          <Text style={{ fontWeight: 'bold', fontSize: '30px' }}>{qi + 1}. {q.type === 'recognition' ? '听音选字' : q.type === 'pinyin' ? '选拼音' : '选组词'} {q.stem ? `（${q.stem}）` : ''}</Text>
          <View className="sgrid" style={{ marginTop: '16px' }}>
            {q.options.map((o) => (
              <View key={o.option_id} className={`opt-card ${picks[q.question_id] === o.option_id ? 'sel' : ''}`}
                onClick={() => setPicks((p) => ({ ...p, [q.question_id]: o.option_id }))}>
                {o.text}
              </View>
            ))}
          </View>
        </View>
      ))}
      {!result && <View className="btn-green" onClick={submit}>提交答案</View>}

      {result && (
        <View className={`center ${night}`}>
          <Text className="emoji-xl">{result.test_passed ? '🎉' : '💪'}</Text>
          <Text style={{ fontSize: '40px', fontWeight: 800, display: 'block', margin: '8px 0' }}>{result.feedback}</Text>
          <Text className="muted">当前：{result.stage_name}</Text>
          {result.can_retry
            ? <View className="btn-green" style={{ width: '360px', marginTop: '28px' }} onClick={loadQuiz}>再试一次</View>
            : <View className="btn-green" style={{ width: '360px', marginTop: '28px' }} onClick={() => Taro.navigateBack()}>返回</View>}
        </View>
      )}
    </View>
  );
}
