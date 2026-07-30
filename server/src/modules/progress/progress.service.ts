/**
 * progress.service.ts — 成长/学习进度业务（四级朋友养成核心）
 * 权威口径：md/02 §3、md/11 §5、md/13。★ 判分全在服务端；题目不下发答案。
 *
 * 朋友等级 current_stage：0 未遇见 / 1 已相识 / 2 好朋友 / 3 好伙伴（层级覆盖）。
 * 晋级：学习/听→1；普通挑战通过→2；综合挑战通过→3。
 * ★ 只升不降·无惩罚：普通挑战未过可无限重试；综合挑战答错不回落、答对才晋升好伙伴。
 * 已下线间隔复习/久别重逢机制。
 */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'path';
import { In, Repository } from 'typeorm';
import { ComprehensiveTest, TriggerType } from '../../entities/comprehensive-test.entity';
import { LearningProgress, StudyType, Subject } from '../../entities/learning-progress.entity';
import { TestStore } from './test-store';
import { MembershipAccessService } from '../membership-access/membership-access.service';
import { loadRealQuiz } from './real-quiz';
import {
  generateNormalQuiz,
  isNormalPassed,
  judgeAnswers,
  toPublic,
} from './quiz.util';

const STAGE_NAMES = ['未遇见', '已相识', '好朋友', '好伙伴'];
const SUBJECTS: readonly Subject[] = ['识字', '英语', '拼音'];
const COMPREHENSIVE_SIZE = 10;
const COMPREHENSIVE_PASS = 8;

@Injectable()
export class ProgressService {
  /** 内容库根（真实题库读取）：与 main.ts 静态服务同源 STATIC_ROOT */
  private readonly contentRoot: string;

  constructor(
    @InjectRepository(LearningProgress) private readonly progress: Repository<LearningProgress>,
    @InjectRepository(ComprehensiveTest) private readonly compTests: Repository<ComprehensiveTest>,
    private readonly testStore: TestStore,
    private readonly membership: MembershipAccessService,
    config: ConfigService,
  ) {
    this.contentRoot = join(process.cwd(), config.get<string>('STATIC_ROOT', '../production'));
  }

  private stageName(stage: number): string {
    return STAGE_NAMES[stage] ?? '未遇见';
  }

  /** 校验 subject 在白名单内，非法值以 400 拒绝（避免非法学科下传到写库撞 CHECK 约束返回 500） */
  private assertSubject(subject: Subject) {
    if (!SUBJECTS.includes(subject)) throw new BadRequestException('学科参数不合法');
  }

  /** 取或建一条 word 进度（并发首次学习/挑战用 orIgnore 处理 UNIQUE(child_id,word_id) 竞态，冲突后重查，避免 500） */
  private async getOrCreate(userId: string, childId: string, subject: Subject, wordId: string, wordText?: string) {
    const found = await this.progress.findOne({ where: { childId, wordId } });
    if (found) return found;
    await this.progress
      .createQueryBuilder()
      .insert()
      .values({ userId, childId, subject, wordId, wordText: wordText ?? null, currentStage: 0 })
      .orIgnore()
      .execute();
    return (await this.progress.findOne({ where: { childId, wordId } }))!;
  }

  /** 学科朋友等级列表（可按 stage 筛选，分页） */
  async listBySubject(childId: string, subject: Subject, stage: number | undefined, page: number, pageSize: number) {
    this.assertSubject(subject); // 读路径同样校验白名单，与写路径口径一致
    const where: Record<string, unknown> = { childId, subject };
    if (stage !== undefined) where.currentStage = stage;
    const [rows, total] = await this.progress.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      subject,
      total,
      page,
      page_size: pageSize,
      words: rows.map((r) => ({
        word_id: r.wordId,
        word: r.wordText,
        current_stage: r.currentStage,
        stage_name: this.stageName(r.currentStage),
      })),
    };
  }

  /** 提交学习完成（听/学习模块）：驱动 0→1 已相识 */
  async submitStudy(userId: string, childId: string, subject: Subject, wordId: string, studyType: StudyType, wordText?: string) {
    // ★ study2/study3 为会员专属（付费边界 PRD G-03），服务端强制门控，防前端绕过
    if (studyType === 'study2' || studyType === 'study3') {
      const vip = await this.membership.isActive(userId);
      if (!vip) throw new ForbiddenException('学习2/学习3 为会员专属');
    }
    const row = await this.getOrCreate(userId, childId, subject, wordId, wordText);
    if (studyType === 'study1') row.study1Completed = true;
    if (studyType === 'study2') row.study2Completed = true;
    if (studyType === 'study3') row.study3Completed = true;
    row.lastStudyType = studyType;
    if (row.currentStage < 1) row.currentStage = 1; // 层级覆盖：至少已相识
    await this.progress.save(row);
    return { success: true, current_stage: row.currentStage, stage_name: this.stageName(row.currentStage) };
  }

  /** 取普通挑战题目：★真实题库优先（production 习题 verify.json），无题/读失败回退合成题；答案仅存服务端 */
  async getQuiz(childId: string, subject: Subject, wordId: string, wordText: string) {
    this.assertSubject(subject);
    if (subject === '拼音') throw new BadRequestException('拼音无普通挑战习题');
    // 无惩罚·可无限重试：取题不做任何重试计数/失败态处理
    let questions = await loadRealQuiz(this.contentRoot, subject, wordId, 4);
    if (questions.length === 0) questions = generateNormalQuiz(wordId, wordText || wordId);
    const testId = `t_${wordId}_${Date.now()}`;
    await this.testStore.put(testId, { kind: 'normal', childId, subject, wordId, questions });
    return { test_id: testId, word_id: wordId, questions: toPublic(questions) };
  }

  /** 提交普通挑战：服务端判分；通过→好朋友(2，只升不降)；未通过无惩罚，可无限重试 */
  async submitQuiz(userId: string, childId: string, testId: string, answers: { question_id: string; selected_option: string }[]) {
    const stored = await this.testStore.take(testId); // 原子领取即失效，防双提交重复计分
    if (!stored || stored.kind !== 'normal' || stored.childId !== childId || !stored.wordId) {
      throw new NotFoundException('挑战已过期，请重新开始');
    }

    const judged = judgeAnswers(stored.questions, answers);
    const passed = isNormalPassed(stored.subject as Subject, judged);
    const row = await this.getOrCreate(userId, childId, stored.subject as Subject, stored.wordId);

    row.testCount += 1;
    row.lastTestAt = new Date();
    if (passed) {
      row.testPassed = true;
      row.study1Completed = true; // ★ 直接挑战通过等价补齐“已相识”（PRD 3.2/ED-268），保证“是否收听过”一致
      row.lastStudyType = 'test';
      if (row.currentStage < 2) row.currentStage = 2; // 好朋友（层级覆盖，只升不降）
    }
    await this.progress.save(row);

    return {
      test_passed: passed,
      score: Math.round((judged.filter((j) => j.is_correct).length / judged.length) * 100),
      // ★随结果回传讲解文字/配音（出题时不下发以防泄题），结果页逐题展示“为什么”
      results: judged.map((j) => ({
        question_id: j.question_id,
        is_correct: j.is_correct,
        explanation: j.explanation,
        explanation_audio_url: j.explanation_audio_url,
      })),
      can_retry: !passed, // 无惩罚·可无限重试：未通过始终可再试
      feedback: passed ? '太棒了！你答对了！' : '再试一次吧，你可以的！',
      current_stage: row.currentStage,
      stage_name: this.stageName(row.currentStage),
    };
  }

  /** 检查可否自动触发综合挑战：返回攒满 10 个好朋友(stage=2)的字 */
  async comprehensiveAuto(childId: string, subject: Subject) {
    this.assertSubject(subject);
    const words = await this.progress.find({
      where: { childId, subject, currentStage: 2 },
      order: { updatedAt: 'ASC' },
      take: COMPREHENSIVE_SIZE,
    });
    const available = words.length >= COMPREHENSIVE_SIZE;
    if (!available) {
      return {
        available,
        count: words.length,
        test_id: null,
        words: words.map((w) => ({ word_id: w.wordId, word: w.wordText })),
        questions: [],
      };
    }

    // ★每个字取 1 道题：真实题库优先，无题回退合成识别题
    const questions = await Promise.all(words.map(async (word) => {
      const real = await loadRealQuiz(this.contentRoot, subject, word.wordId, 1);
      return real[0] ?? generateNormalQuiz(word.wordId, word.wordText || word.wordId)[0];
    }));
    const testId = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await this.testStore.put(testId, {
      kind: 'comprehensive',
      childId,
      subject,
      wordIds: words.map((w) => w.wordId),
      questions,
    });
    return {
      available,
      count: words.length,
      test_id: testId,
      words: words.map((w) => ({ word_id: w.wordId, word: w.wordText })),
      questions: questions.map((question, index) => ({
        word_id: words[index].wordId,
        question: toPublic([question])[0],
      })),
    };
  }

  /** 主动选择 10 个已有字词开始综合挑战；正确答案只存 TestStore。 */
  async comprehensiveManualStart(childId: string, subject: Subject, wordIds: string[]) {
    if (new Set(wordIds).size !== COMPREHENSIVE_SIZE) {
      throw new BadRequestException(`综合挑战需选择 ${COMPREHENSIVE_SIZE} 个不同字/词`);
    }
    const rows = await this.progress.find({ where: { childId, subject, wordId: In(wordIds) } });
    if (rows.length !== COMPREHENSIVE_SIZE) {
      throw new BadRequestException('所选字词不存在或不属于当前学科');
    }
    // ★ 防跳级：手动综合挑战只能选已达“好朋友”(stage>=2)的字（对齐 auto 路径 currentStage=2 前置）
    if (!rows.every((r) => r.currentStage >= 2)) {
      throw new BadRequestException('只能选择已成为“好朋友”的字/词参加综合挑战');
    }
    const rowMap = new Map(rows.map((row) => [row.wordId, row]));
    const ordered = wordIds.map((wordId) => rowMap.get(wordId)!);
    // ★真实题库优先，无题回退合成识别题（与 auto 路径同源）
    const questions = await Promise.all(ordered.map(async (word) => {
      const real = await loadRealQuiz(this.contentRoot, subject, word.wordId, 1);
      return real[0] ?? generateNormalQuiz(word.wordId, word.wordText || word.wordId)[0];
    }));
    const testId = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await this.testStore.put(testId, {
      kind: 'comprehensive',
      childId,
      subject,
      wordIds,
      questions,
    });
    return {
      test_id: testId,
      words: ordered.map((word) => ({ word_id: word.wordId, word: word.wordText })),
      questions: questions.map((question, index) => ({
        word_id: wordIds[index],
        question: toPublic([question])[0],
      })),
    };
  }

  /**
   * 提交综合挑战：按 TestStore 中的正确项服务端逐题判分，客户端不能自报对错。
   */
  async submitComprehensive(
    userId: string,
    childId: string,
    subject: Subject,
    triggerType: TriggerType,
    testId: string,
    answers: { question_id: string; selected_option: string }[],
  ) {
    const stored = await this.testStore.take(testId); // 原子领取即失效，防双提交重复计分
    if (
      !stored
      || stored.kind !== 'comprehensive'
      || stored.childId !== childId
      || stored.subject !== subject
      || stored.wordIds?.length !== COMPREHENSIVE_SIZE
    ) {
      throw new NotFoundException('综合挑战已过期，请重新开始');
    }
    if (answers.length !== COMPREHENSIVE_SIZE) {
      throw new BadRequestException(`综合挑战需 ${COMPREHENSIVE_SIZE} 个字/词`);
    }
    const wordIds = stored.wordIds;
    const judged = judgeAnswers(stored.questions, answers);
    const rows = await this.progress.find({ where: { childId, wordId: In(wordIds) } });
    const rowMap = new Map(rows.map((r) => [r.wordId, r]));
    if (rows.length !== wordIds.length) throw new BadRequestException('综合挑战字词状态已变化，请重新开始');

    const perCharResults: { word_id: string; passed: boolean; current_stage: number }[] = [];
    let correctCount = 0;

    for (let index = 0; index < wordIds.length; index += 1) {
      const wordId = wordIds[index];
      const row = rowMap.get(wordId)!;
      const itemPassed = judged[index]?.is_correct ?? false;
      row.comprehensiveCount += 1;
      if (itemPassed) {
        correctCount += 1;
        row.comprehensivePassed = true;
        row.currentStage = 3; // 好伙伴
      }
      // 只升不降：答错不回落，保持原级别
      row.lastStudyType = 'comprehensive';
      perCharResults.push({ word_id: wordId, passed: itemPassed, current_stage: row.currentStage });
    }

    const passed = correctCount >= COMPREHENSIVE_PASS;
    await this.progress.save(rows);
    await this.compTests.save(
      this.compTests.create({
        userId,
        childId,
        subject,
        triggerType,
        wordIds,
        questionIds: stored.questions.map((question) => question.question_id),
        answers,
        perCharResults,
        correctCount,
        passed,
      }),
    );

    return { passed, correct_count: correctCount, total: COMPREHENSIVE_SIZE, per_char_results: perCharResults };
  }

  /** 综合挑战历史 */
  async comprehensiveHistory(childId: string) {
    const rows = await this.compTests.find({ where: { childId }, order: { testedAt: 'DESC' }, take: 50 });
    return {
      total: rows.length,
      list: rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        trigger_type: r.triggerType,
        correct_count: r.correctCount,
        passed: r.passed,
        tested_at: r.testedAt,
      })),
    };
  }

  /**
   * 字词详情（课程详情页用，对齐 md/11 §5.2）
   * ⭐ 真实词库/笔画未入库：pinyin/strokes/释义/例句为占位（同 quiz 策略），接入后替换。
   * learning_modules：学习1 免费，学习2/3 会员（付费边界 PRD 2.4.2）。
   */
  async getVocabulary(childId: string, wordId: string) {
    const row = await this.progress.findOne({ where: { childId, wordId } });
    const stage = row?.currentStage ?? 0;
    return {
      word_id: wordId,
      word: row?.wordText ?? wordId,
      pinyin: '',
      current_stage: stage,
      stage_name: this.stageName(stage),
      stroke_count: 0,
      strokes: [], // TODO: 接入笔画数据
      learning_modules: [
        { module_id: 'learn_1', title: '学习1：认读', type: 'recognition', is_vip: false, completed: row?.study1Completed ?? false },
        { module_id: 'learn_2', title: '学习2：组词', type: 'word_formation', is_vip: true, completed: row?.study2Completed ?? false },
        { module_id: 'learn_3', title: '学习3：造句', type: 'sentence_making', is_vip: true, completed: row?.study3Completed ?? false },
      ],
      examples: [], // TODO: 接入例句
      test_available: true,
    };
  }

  /** 成长总览（成长首页/家长用）：★ 用 DB 分组聚合，避免全量加载后内存 filter */
  async summary(childId: string) {
    const raw = await this.progress
      .createQueryBuilder('p')
      .select('p.subject', 'subject')
      .addSelect('SUM(CASE WHEN p.current_stage >= 1 THEN 1 ELSE 0 END)', 'learned')
      .addSelect('SUM(CASE WHEN p.current_stage >= 2 THEN 1 ELSE 0 END)', 'tested')
      .addSelect('SUM(CASE WHEN p.current_stage >= 3 THEN 1 ELSE 0 END)', 'mastered')
      .where('p.child_id = :childId', { childId })
      .groupBy('p.subject')
      .getRawMany<{ subject: Subject; learned: string; tested: string; mastered: string }>();

    const bySubject = (subject: Subject) => {
      const r = raw.find((x) => x.subject === subject);
      return {
        subject,
        learned: Number(r?.learned ?? 0),
        tested: Number(r?.tested ?? 0),
        mastered: Number(r?.mastered ?? 0),
      };
    };
    // 累计口径（learned⊇tested⊇mastered，层级覆盖）；friends=好朋友及以上(>=2)供前端算独占分段
    const totalLearned = raw.reduce((s, r) => s + Number(r.learned), 0);
    const totalFriends = raw.reduce((s, r) => s + Number(r.tested), 0);
    const totalMastered = raw.reduce((s, r) => s + Number(r.mastered), 0);
    return {
      child_id: childId,
      overall_stats: {
        total_words_learned: totalLearned,
        total_words_friends: totalFriends,
        total_words_mastered: totalMastered,
      },
      subject_progress: [bySubject('识字'), bySubject('英语'), bySubject('拼音')],
    };
  }
}
