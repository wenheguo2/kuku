/**
 * pages/growth/player — PL-03 教学播放器（v4 横屏三区）
 * 左场景 65%+逐句群像立绘｜右侧：今日生字 + 大字幕(生字金色高亮，用户定：字要大、不要简介)｜底部控制栏。
 * ★真实模式：携 path 进入 → 字幕时间轴优先用 audio/{path}/学习N/timeline.json（合并 full.mp3 时产出的真实轴，含句间静音，
 *   全库 10708 份），取不到才回退 segments 估算时长累计（估算轴会累积漂移致字幕先于配音，实测教训）；
 *   播 audio/{path}/学习N/full.mp3（独立 InnerAudioContext）；上一句/下一句/重播可用。
 * ★场景/立绘精确匹配：顶层 location 选场景图；每句 characters[]{name,pose,emotion} → manifest 键 {name}/{pose}/{emotion}
 *   逐级回退({name}/{pose}/happy → {name}/stand/happy)，说话者高亮。USE_MOCK 或无 path 时回退 mock 时钟演示。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { locateSegment, TimelineSeg } from '@/utils/timeline';
import { buildAssetUrl } from '@/utils/path';
import { resolveStudyDir, studyOptions, EN_LEVEL_STUDIES } from '@/services/lessonCatalog';
import { useUserStore } from '@/stores/userStore';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';

const MOCK_TIMELINE: TimelineSeg[] = [
  { seq: 1, start_ms: 0, end_ms: 3000, duration_ms: 3000, segment_id: 's1', character: '酷酷', text: '这是一个月亮的夜晚' },
  { seq: 2, start_ms: 3000, end_ms: 6000, duration_ms: 3000, segment_id: 's2', character: '桃子', text: '月亮的月，读作 yuè' },
  { seq: 3, start_ms: 6000, end_ms: 9000, duration_ms: 3000, segment_id: 's3', character: '老师', text: '月光、明月，都有月字' },
];

interface CharRef { name?: string; pose?: string; emotion?: string }
interface RawSeg { text?: string; duration_ms?: number; character?: string; characters?: CharRef[] }
interface LessonSegData { synopsis?: string; location?: string; segments?: RawSeg[] }
/** manifest v2：scenes[location]=图列表；characters["角色/pose/emotion"]=单图路径（1668 精确键） */
interface IllustManifest { scenes?: Record<string, string[]>; characters?: Record<string, string> }

/** 插画资产清单模块级缓存（一次拉取全局复用） */
let manifestCache: IllustManifest | null = null;

export default function TeachingPlayer() {
  const router = useRouter();
  const night = useNight();
  const word = decodeURIComponent(router.params.word || '月');
  const subject = decodeURIComponent(router.params.subject || '识字');
  const lessonPath = decodeURIComponent(router.params.path || '');
  // ★学习挡可切换（用户定：每课有多套内容要体现出来）：识字 学习1/2/3、拼音 1/2、英语 难度(初/中/高阶)×学习1/2
  const [studyType, setStudyType] = useState(router.params.study_type || 'study1');
  const [enLevel, setEnLevel] = useState<1 | 2 | 3>(1);
  const membershipStatus = useUserStore((s) => s.membershipStatus);
  const studyDir = resolveStudyDir(subject, studyType, enLevel);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [realSegs, setRealSegs] = useState<TimelineSeg[] | null>(null);
  const [segChars, setSegChars] = useState<CharRef[][]>([]);
  const [failed, setFailed] = useState(false);
  const [sceneUrl, setSceneUrl] = useState('');
  // 破图兑底：个别立绘物理图 404 时记录并隐藏，避免断图占位（实测：manifest 键在但个别文件缺）
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [manifest, setManifest] = useState<IllustManifest | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useRef(0);
  const audioRef = useRef<Taro.InnerAudioContext | null>(null);

  const isReal = !!lessonPath;

  // 插画清单：场景按课程 location 选图、立绘按说话角色选图
  useEffect(() => {
    if (!isReal) return;
    if (manifestCache) { setManifest(manifestCache); return; }
    Taro.request({ url: buildAssetUrl('illustrations/manifest.json'), dataType: 'json' })
      .then((res) => { if (res.statusCode === 200) { manifestCache = res.data as IllustManifest; setManifest(manifestCache); } })
      .catch(() => {});
  }, [isReal]);

  // 真实模式：并行拉 timeline.json(真实时间轴，首选) + segments.json(立绘 characters/location) + 起播独立音频
  useEffect(() => {
    if (!isReal) return undefined;
    let alive = true;
    // ★切课/切挡先清旧态：防旧字幕/旧立绘/旧场景残留（学习2/3 背景立绘不加载实测根因之一）
    setRealSegs(null); setSegChars([]); setSceneUrl(''); setBroken({});
    // ★时间轴首选合并产出的真实 timeline（含句间静音），否则字幕会先于配音漂移
    type Res = Taro.request.SuccessCallbackResult | null;
    const tlReq: Promise<Res> = Taro.request({ url: buildAssetUrl(`audio/${lessonPath}/${studyDir}/timeline.json`), dataType: 'json' }).catch((): Res => null);
    const segReq: Promise<Res> = Taro.request({ url: buildAssetUrl(`generated_stories/${lessonPath}/${studyDir}/segments.json`), dataType: 'json' }).catch((): Res => null);
    Promise.all([tlReq, segReq]).then(([tl, sg]) => {
      if (!alive) return;
      const tlOk = tl && tl.statusCode === 200 && Array.isArray(tl.data);
      const sgOk = sg && sg.statusCode === 200;
      if (!tlOk && !sgOk) { setFailed(true); return; }
      const d = (sgOk ? sg!.data : {}) as LessonSegData;
      if (tlOk) {
        // timeline 即 TimelineSeg[] 原生形状（seq/start_ms/end_ms/duration_ms/character/text）
        setRealSegs(tl!.data as TimelineSeg[]);
      } else {
        let acc = 0;
        setRealSegs((d.segments ?? []).map((s, i) => {
          const dur = s.duration_ms ?? 3000;
          const seg = { seq: i + 1, start_ms: acc, end_ms: acc + dur, duration_ms: dur, segment_id: `r${i}`, character: s.character || '', text: s.text || '' };
          acc += dur;
          return seg;
        }));
      }
      setSegChars((d.segments ?? []).map((s) => s.characters ?? []));
      setSceneUrl(d.location || '');
    });
    const audio = Taro.createInnerAudioContext();
    audioRef.current = audio;
    audio.src = buildAssetUrl(`audio/${lessonPath}/${studyDir}/full.mp3`);
    audio.autoplay = true;
    audio.onError(() => setFailed(true));
    return () => { alive = false; audio.destroy(); audioRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPath, studyDir]);

  const segsInUse = isReal ? (realSegs ?? []) : MOCK_TIMELINE;
  const totalMs = useMemo(() => (segsInUse.length ? segsInUse[segsInUse.length - 1].end_ms : 0), [segsInUse]);

  // 场景图 URL（sceneUrl 存的是 location 名，结合 manifest 解析）；无匹配时取任意一个场景兼做背景
  const sceneImg = useMemo(() => {
    if (!manifest?.scenes) return '';
    const byLoc = sceneUrl && manifest.scenes[sceneUrl]?.[0];
    if (byLoc) return buildAssetUrl(`illustrations/${byLoc}`);
    const keys = Object.keys(manifest.scenes);
    return keys.length ? buildAssetUrl(`illustrations/${manifest.scenes[keys[0]][0]}`) : '';
  }, [manifest, sceneUrl]);

  // 时间驱动：真实模式读音频 currentTime；mock 模式模拟时钟
  useEffect(() => {
    if (!playing || segsInUse.length === 0) return undefined;
    timer.current = setInterval(() => {
      if (isReal && audioRef.current) {
        t.current = (audioRef.current.currentTime || 0) * 1000;
      } else {
        t.current += 500;
      }
      const ms = totalMs > 0 ? (isReal ? Math.min(t.current, totalMs - 1) : t.current % totalMs) : 0;
      setIdx(Math.max(0, locateSegment(segsInUse, ms)));
    }, 400);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, segsInUse, totalMs, isReal]);

  const toggle = () => {
    if (isReal && audioRef.current) { if (playing) audioRef.current.pause(); else audioRef.current.play(); }
    setPlaying((p) => !p);
  };
  /** 上一句/下一句：跳到相邻段起点；重播：回到 0 */
  const seekSeg = (delta: number) => {
    const target = Math.min(Math.max(idx + delta, 0), segsInUse.length - 1);
    const ms = segsInUse[target]?.start_ms ?? 0;
    t.current = ms;
    setIdx(target);
    if (isReal && audioRef.current) audioRef.current.seek(ms / 1000);
  };
  const replay = () => {
    t.current = 0;
    setIdx(0);
    if (isReal && audioRef.current) { audioRef.current.seek(0); audioRef.current.play(); setPlaying(true); }
  };

  // ★学习挡切换：首挡免费，其余会员（对齐词表页门控，话术家长化）；切换后 studyDir 变化自动重拉重播
  const guardVip = () => {
    if (membershipStatus === 'active') return true;
    Taro.showToast({ title: '这里需要爸爸妈妈帮忙打开哦', icon: 'none' });
    setTimeout(() => Taro.navigateTo({ url: '/pages/common/member/index' }), 600);
    return false;
  };
  const switchStudy = (key: string) => {
    if (key === studyType) return;
    if (key !== 'study1' && !guardVip()) return;
    setIdx(0); t.current = 0; setFailed(false);
    setStudyType(key);
  };
  const switchLevel = (lv: 1 | 2 | 3) => {
    if (lv === enLevel) return;
    if (lv > 1 && !guardVip()) return;
    setIdx(0); t.current = 0; setFailed(false);
    // ★各难度学习挡数不同（初2/中3/高1，实测目录）：当前挡超出新难度范围时回到 学习1
    const maxN = EN_LEVEL_STUDIES[lv];
    if (Number((studyType.match(/\d+/) || ['1'])[0]) > maxN) setStudyType('study1');
    setEnLevel(lv);
  };
  const EN_LEVELS: { lv: 1 | 2 | 3; label: string }[] = [{ lv: 1, label: '初阶' }, { lv: 2, label: '中阶' }, { lv: 3, label: '高阶' }];

  const seg = segsInUse[idx];
  const parts = (seg?.text || '').split(word);
  /** 全课角色固定位次：按首次出场顺序排定，全程不变（用户定：说话不换位，所有角色预留位置） */
  const charOrder = useMemo(() => {
    const order: string[] = [];
    segChars.forEach((list) => list.forEach((c) => { if (c.name && !order.includes(c.name)) order.push(c.name); }));
    return order.slice(0, 4);
  }, [segChars]);
  /** 逐句群像：位次固定；姿势/情绪取当句 characters[]，当句未列出的角色用默认 stand/happy 继续在场；说话者仅提亮不移位 */
  const speakerImgs = useMemo(() => {
    const chars = manifest?.characters;
    if (!chars || charOrder.length === 0) return [] as { name: string; url: string; talking: boolean; rawKey: string }[];
    const cur = segChars[idx] ?? [];
    const talker = seg?.character || '';
    const pick = (name: string) => {
      const c = cur.find((x) => x.name === name);
      return (c && (chars[`${name}/${c.pose}/${c.emotion}`] || chars[`${name}/${c.pose}/happy`])) || chars[`${name}/stand/happy`] || '';
    };
    return charOrder
      .map((name) => ({ name, url: pick(name), talking: name === talker }))
      .filter((x) => x.url && !broken[x.url])
      .map((x) => ({ ...x, url: buildAssetUrl(`illustrations/${x.url}`), rawKey: x.url }));
  }, [charOrder, segChars, idx, seg?.character, manifest, broken]);

  return (
    <View className={`eland ${night}`}>
      <View className="etop">
        {/* 左：场景 + 逐句群像立绘（说话者高亮）；左上角学习挡切换（用户定：多套内容要体现） */}
        <View className="esceneL">
          {sceneImg
            ? <Image className="cover" webp src={sceneImg} mode="aspectFill" ariaLabel="教学场景" />
            : <View className="cover" style={{ background: 'linear-gradient(135deg,#8FD97B,#5FA84C)' }} />}
          {/* ★退出键（用户定：横屏课堂必须能退回）：左上角半透圆钮，无上页时兑底回成长首页 */}
          <View className="eback" onClick={() => Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/growth/index/index' }))}>
            <Icon name="back" size={18} color="#fff" />
          </View>
          {isReal && (
            <View className="elvl">
              {subject === '英语' && EN_LEVELS.map((o) => (
                <Text key={o.lv} className={`c ${enLevel === o.lv ? 'on' : ''}`} onClick={() => switchLevel(o.lv)}>{o.label}{o.lv > 1 && membershipStatus !== 'active' ? ' 🔒' : ''}</Text>
              ))}
              {studyOptions(subject, enLevel).map((o) => (
                <Text key={o.key} className={`c ${studyType === o.key ? 'on' : ''}`} onClick={() => switchStudy(o.key)}>{o.label}{o.key !== 'study1' && membershipStatus !== 'active' ? ' 🔒' : ''}</Text>
              ))}
            </View>
          )}
          {speakerImgs.length > 0 && (
            <View className="espks">
              {speakerImgs.map((s) => (
                <Image key={s.name} className={`spk ${s.talking ? 'talk' : ''}`} webp src={s.url} mode="aspectFit" ariaLabel={s.name}
                  onError={() => setBroken((b) => ({ ...b, [s.rawKey]: true }))} />
              ))}
            </View>
          )}
        </View>
        {/* 右：生字田字格/单词宽卡 + 字幕气泡（用户定：英语是单词不用田字格，长单词必须完整展示） */}
        <View className="ewordR">
          <View className="ehead">
            <Text className="etag">{subject === '英语' ? '今日单词' : '今日生字'}</Text>
            {subject === '英语' ? (
              <View className="wword">
                <Text className={`w ${word.length > 9 ? 'sm' : word.length > 6 ? 'md' : ''}`}>{word}</Text>
              </View>
            ) : (
              <View className="wcard">
                <View className="gx" />
                <View className="gy" />
                <Text className="w serif">{word}</Text>
              </View>
            )}
          </View>
          {isReal ? (
            <>
              <View className="esub-r">
                {seg?.character && seg.character !== '旁白' && <Text className="who">{seg.character}</Text>}
                {/* 字号随句长自适应（用户定：字幕必须显示全）：短句大字、长句缩字，保证任意句长放得下 */}
                <Text className={`txt ${(seg?.text || '').length > 30 ? 'sm' : (seg?.text || '').length > 18 ? 'md' : ''}`}>
                  {failed
                    ? '内容加载失败了，返回重试一下吧'
                    : (seg?.text
                      ? parts.map((p, i) => (
                        <Text key={i}>{p}{i < parts.length - 1 && <Text style={{ color: '#E8A200', fontWeight: 800 }}>{word}</Text>}</Text>
                      ))
                      : `${studyDir} · 加载中…`)}
                </Text>
              </View>
              {/* 句进度区已删（用户定：取消第X/Y句，空间留给字幕） */}
            </>
          ) : (
            <>
              <Text style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>yuè</Text>
              <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>月亮 · 月光 · 明月</Text>
            </>
          )}
        </View>
      </View>

      {/* 控制栏：上一句 / 播放暂停 / 下一句 / 重播（磨砂钮白图标；横屏页物理像素体系，Icon 尺寸同步缩） */}
      <View className="ectrl">
        <View className="ebtn" onClick={() => seekSeg(-1)}><Icon name="prev" size={20} color="#fff" /></View>
        <View className="ebtn main" onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={26} color="#fff" /></View>
        <View className="ebtn" onClick={() => seekSeg(1)}><Icon name="next" size={20} color="#fff" /></View>
        <View className="ebtn" onClick={replay}><Icon name="refresh" size={18} color="#fff" /></View>
      </View>
    </View>
  );
}
