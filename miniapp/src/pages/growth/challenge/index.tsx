/**
 * pages/growth/challenge — G-04 普通挑战
 * GET /test/quiz/:word_id 取题（不含答案）→ 一题一屏作答 → POST 提交（服务端判分）→ 逐题正误 + 朋友等级。
 * ★ 无惩罚·可无限重试：未通过始终可"再试一次"（后端返回 can_retry=!passed）。
 * ★ 一题一屏（UX-10）：分步作答，当前题未选禁用"下一题/提交"。
 * ★ 按题型差异化渲染（2026-07-30 修正，对齐真题库字段）：
 *   - 听力题（sound_to_char/word_to_sound/char_to_sound/recognition）：不显 stem，只给大播放按钮
 *   - 完型填空（sentence_fill）：**展示真句子**（sentence_blank，____ 渲染为下划线）**+ 句子朗读按钮**
 *   - 看题选答（word_to_meaning 等）：大字展示目标词 word + 题干，有音频则附发音按钮
 *   - 结果页：逐题正误 + **讲解文字与讲解配音**（explanation / explanation_audio_url）
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';
import { CONFIG } from '@/services/config';
import Icon from '@/components/Icon';

interface Question { question_id: string; type: string; stem?: string; word?: string; audio_url?: string; options: { option_id: string; text: string }[] }
interface Quiz { test_id: string; word_id: string; questions: Question[] }
interface Result {
  test_passed: boolean;
  can_retry: boolean;
  feedback: string;
  stage_name: string;
  results?: { question_id: string; is_correct: boolean; explanation?: string; explanation_audio_url?: string }[];
}

/** 题型标签 */
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

/**
 * 听力题型（只能听）：stem 是给 TTS 的原文，展示就泄题，只给播放按钮
 * ★ char_to_sound（看字选拼音）不在此列：它必须把字展示出来（2026-07-30 修正）
 */
const AUDIO_TYPES = new Set(['recognition', 'sound_to_char', 'word_to_sound']);

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
  const audioCtx = useRef<Taro.InnerAudioContext | null>(null);

  const loadQuiz = () => {
    setResult(null); setPicks({}); setStep(0); setError(false);
    api.get<Quiz>(`/test/quiz/${encodeURIComponent(wordId)}?child_id=${selectedChildId}&subject=${encodeURIComponent(subject)}&word_text=${encodeURIComponent(wordText)}`)
      .then(setQuiz)
      .catch((err) => { console.warn('加载挑战题失败', err); setError(true); });
  };
  useEffect(() => { if (selectedChildId) loadQuiz(); }, [selectedChildId]);
  useEffect(() => () => { audioCtx.current?.destroy(); }, []);

  /** 播放任意音频（题目发音/句子朗读/讲解配音）；相对路径自动补服务器域名 */
  const playUrl = (url?: string) => {
    if (!url) {
      Taro.showToast({ title: '这题暂无配音，看选项选答案吧', icon: 'none' });
      return;
    }
    if (audioCtx.current) audioCtx.current.destroy();
    const ctx = Taro.createInnerAudioContext();
    // 后端下发的是 `/static/audio/…`（已逐段编码）；staticBaseUrl 自带 /static 后缀，去重后拼 origin
    ctx.src = /^https?:\/\//.test(url) ? url : `${CONFIG.staticBaseUrl.replace(/\/static\/?$/, '')}${url}`;
    ctx.onError((e) => { console.warn('题目音频播放失败', e, ctx.src); Taro.showToast({ title: '音频加载失败', icon: 'none' }); });
    ctx.play();
    audioCtx.current = ctx;
  };

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
    } catch (err) {
      console.warn('提交挑战失败', err);
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
    }
  };

  if (!selectedChildId) {
    return <View className={`page-container ${night}`}><View className="pill-orange" onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>请先登录</View></View>;
  }
  if (error) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">😶‍🌫️</Text>
        <Text style={{ fontSize: '34px', fontWeight: 800, display: 'block', margin: '8px 0', color: 'var(--color-text)' }}>加载失败了</Text>
        <Text className="muted" style={{ marginBottom: '28px' }}>网络开小差了，稍后再试试吧</Text>
        <View className="pill-orange" onClick={loadQuiz}>重试</View>
      </View>
    );
  }
  if (!quiz) return <View className={`page-container ${night}`}><Text className="muted">加载中…</Text></View>;

  const total = quiz.questions.length;
  const cur = quiz.questions[step];
  const answeredCur = !!(cur && picks[cur.question_id]);
  const isLast = step >= total - 1;
  const isAudio = cur && AUDIO_TYPES.has(cur.type);
  const isFill = cur && cur.type === 'sentence_fill';

  /** 大圆播放按钮（听力题主体 / 句子朗读） */
  const PlayBtn = ({ url, size = 120, label }: { url?: string; size?: number; label?: string }) => (
    <View style={{ textAlign: 'center', padding: '12px 0' }}>
      <View style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFB067, #FF8C42)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 20px rgba(255,140,66,.4)' }}
        onClick={() => playUrl(url)}>
        <Icon name="play" size={Math.round(size * 0.46)} color="#fff" />
      </View>
      {label ? <Text style={{ display: 'block', marginTop: '14px', fontSize: '26px', color: 'var(--color-text-secondary)' }}>{label}</Text> : null}
    </View>
  );

  /** 完型句子：____ 渲染为下划线空位 */
  const renderBlankSentence = (sentence: string) => {
    const parts = sentence.split(/_{2,}/);
    return (
      <Text style={{ fontSize: '30px', fontWeight: 700, color: 'var(--color-text)', lineHeight: '1.9' }}>
        {parts.map((p, i) => (
          <Text key={i}>
            {p}
            {i < parts.length - 1 && <Text style={{ color: 'var(--color-primary)', fontWeight: 800 }}> ____ </Text>}
          </Text>
        ))}
      </Text>
    );
  };

  /** 渲染题面区域 */
  const renderStem = () => {
    if (!cur) return null;
    if (isAudio) {
      // 听力题：大播放按钮 + 提示文字，不泄露 stem
      return <PlayBtn url={cur.audio_url} label="点击播放，听完选答案" />;
    }
    if (isFill) {
      // ★完型填空：先展示真句子（后端现下发 sentence_blank），再给句子朗读按钮
      return (
        <View>
          {cur.stem ? renderBlankSentence(cur.stem) : null}
          {cur.audio_url ? <PlayBtn url={cur.audio_url} size={92} label="听一遍句子" /> : null}
        </View>
      );
    }
    // 看字/看词选答：目标字大字置顶（否则“这个字怎么读”无指代）+ 题干 + 可选发音
    // 字号：单字/短词给大字（识字题靠字形辨认），长单词适当缩小避免溢出
    const w = cur.word || '';
    const wordSize = w.length <= 2 ? 96 : w.length <= 6 ? 60 : 44;
    return (
      <View>
        {w ? (
          <Text className="serif" style={{ display: 'block', textAlign: 'center', fontSize: `${wordSize}px`, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '2px', lineHeight: 1.2, padding: '10px 0' }}>{w}</Text>
        ) : null}
        {cur.stem ? (
          <Text style={{ display: 'block', textAlign: w ? 'center' : 'left', marginTop: w ? '8px' : 0, fontSize: '28px', fontWeight: 700, color: w ? 'var(--color-text-secondary)' : 'var(--color-text)' }}>{cur.stem}</Text>
        ) : null}
        {cur.audio_url ? <PlayBtn url={cur.audio_url} size={84} label="听发音" /> : null}
      </View>
    );
  };

  return (
    <View className={`page-container ${night}`}>
      {/* ★标题不写目标字：听音选字题的答案就是它，写在标题里等于直接送答案（实测反馈） */}
      <Text className="brand-title" style={{ color: '#7FC96A' }}>{subject}挑战</Text>

      {!result && cur && (
        <>
          <Text className="muted" style={{ display: 'block', textAlign: 'center', marginBottom: '12px' }}>第 {step + 1} / {total} 题</Text>
          <View className="card">
            <Text style={{ fontSize: '24px', color: 'var(--color-text-secondary)', marginBottom: '12px', display: 'block' }}>{TYPE_LABEL[cur.type] || '选一选'}</Text>
            {renderStem()}
            <View className="sgrid" style={{ marginTop: '16px' }}>
              {cur.options.map((o) => (
                <View key={o.option_id} className={`opt-card ${picks[cur.question_id] === o.option_id ? 'sel' : ''}`}
                  onClick={() => setPicks((p) => ({ ...p, [cur.question_id]: o.option_id }))}>
                  {o.text}
                </View>
              ))}
            </View>
          </View>
          <View style={{ display: 'flex', gap: '12px', marginTop: '14px', justifyContent: 'center', padding: '0 8px' }}>
            {step > 0 && <View className="pill-ghost" style={{ flex: 1, margin: 0, minWidth: 0 }} onClick={() => setStep((s) => s - 1)}>上一题</View>}
            {!isLast
              ? <View className={`pill-green ${answeredCur ? '' : 'disabled'}`} style={{ flex: 1, margin: 0, minWidth: 0 }} onClick={() => answeredCur && setStep((s) => s + 1)}>下一题</View>
              : <View className={`pill-green ${answeredCur ? '' : 'disabled'}`} style={{ flex: 1, margin: 0, minWidth: 0 }} onClick={() => answeredCur && submit()}>提交答案</View>}
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
                <View key={r.question_id} style={{ padding: '10px 0', borderBottom: i < result.results!.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <View className="row" style={{ justifyContent: 'space-between' }}>
                    <Text className="nm">第 {i + 1} 题</Text>
                    <Text style={{ fontWeight: 800, color: r.is_correct ? '#7FC96A' : '#E4572E' }}>{r.is_correct ? '✓ 答对' : '✗ 答错'}</Text>
                  </View>
                  {/* ★讲解：答错才是学习的开始——展示“为什么”与讲解配音（后端判分后才下发） */}
                  {r.explanation ? (
                    <View style={{ marginTop: '8px', background: 'var(--color-primary-soft)', borderRadius: '18px', padding: '16px 18px' }}>
                      <Text style={{ fontSize: '25px', lineHeight: '1.7', color: 'var(--color-text)', display: 'block', textAlign: 'left' }}>{r.explanation}</Text>
                      {r.explanation_audio_url ? (
                        <Text style={{ display: 'inline-block', marginTop: '12px', fontSize: '25px', fontWeight: 800, color: 'var(--color-primary)' }}
                          onClick={() => playUrl(r.explanation_audio_url)}>🔊 听讲解</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {!result.test_passed
            ? <View className="pill-green" style={{ marginTop: '28px' }} onClick={loadQuiz}>再试一次</View>
            : <View className="pill-green" style={{ marginTop: '28px' }} onClick={() => Taro.navigateBack()}>返回</View>}
        </View>
      )}
    </View>
  );
}
