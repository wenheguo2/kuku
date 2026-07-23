/**
 * progress.service.ts — 成长/学习进度业务（四级朋友养成核心）
 * 权威口径：md/02 §3、md/11 §5、md/13。★ 判分全在服务端；题目不下发答案。
 *
 * 朋友等级 current_stage：0 未遇见 / 1 已相识 / 2 好朋友 / 3 好伙伴（层级覆盖）。
 * 晋级：学习/听→1；普通挑战通过→2；综合挑战通过→3。
 * 重试：普通挑战未通过给 1 次重试。
 * 回落：综合挑战只回落答错且原为好伙伴(3→2)的字，答对保持好伙伴。
 * 间隔重复：好伙伴超 review_interval_days（默认 14）未再见 → needs_review=true。
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ComprehensiveTest, TriggerType } from '../../entities/comprehensive-test.entity';
import { LearningProgress, StudyType, Subject } from '../../entities/learning-progress.entity';
import { TestStore } from './test-store';
import {
  generateNormalQuiz,
  isNormalPassed,
  judgeAnswers,
  toPublic,
} from './quiz.util';

const STAGE_NAMES = ['未遇见', '已相识', '好朋友', '好伙伴'];
const COMPREHENSIVE_SIZE = 10;
const COMPREHENSIVE_PASS = 8;
const REVIEW_INTERVAL_DAYS = 14;

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LearningProgress) private readonly progress: Repository<LearningProgress>,
    @InjectRepository(ComprehensiveTest) private readonly compTests: Repository<ComprehensiveTest>,
    private readonly testStore: TestStore,
  ) {}

  private stageName(stage: number): string {
    return STAGE_NAMES[stage] ?? '未遇见';
  }

  /** 取或建一条 word 进度 */
  private async getOrCreate(userId: string, childId: string, subject: Subject, wordId: string, wordText?: string) {
    let row = await this.progress.findOne({ where: { childId, wordId } });
    if (!row) {
      row = this.progress.create({ userId, childId, subject, wordId, wordText: wordText ?? null, currentStage: 0 });
      row = await this.progress.save(row);
    }
    return row;
  }

  /** 学科朋友等级列表（可按 stage 筛选，分页） */
  async listBySubject(childId: string, subject: Subject, stage: number | undefined, page: number, pageSize: number) {
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
    const row = await this.getOrCreate(userId, childId, subject, wordId, wordText);
    if (studyType === 'study1') row.study1Completed = true;
    if (studyType === 'study2') row.study2Completed = true;
    if (studyType === 'study3') row.study3Completed = true;
    row.lastStudyType = studyType;
    if (row.currentStage < 1) row.currentStage = 1; // 层级覆盖：至少已相识
    await this.progress.save(row);
    return { success: true, current_stage: row.currentStage, stage_name: this.stageName(row.currentStage) };
  }

  /** 取普通挑战题目：生成 4 题并暂存答案（不下发正确项） */
  async getQuiz(childId: string, subject: Subject, wordId: string, wordText: string) {
    if (subject === '拼音') throw new BadRequestException('拼音无普通挑战习题');
    // ★ 每次新挑战重置重试计数（对齐 md/02 学习进度字段说明 / PRD ED-028）
    await this.progress.update({ childId, wordId }, { retryUsed: 0, lastTestFailed: false });
    const questions = generateNormalQuiz(wordId, wordText || wordId);
    const testId = `t_${wordId}_${Date.now()}`;
    await this.testStore.put(testId, { kind: 'normal', childId, subject, wordId, questions });
    return { test_id: testId, word_id: wordId, questions: toPublic(questions) };
  }

  /** 提交普通挑战：服务端判分；通过→好朋友(2)；未通过→记失败+重试计数 */
  async submitQuiz(userId: string, childId: string, testId: string, answers: { question_id: string; selected_option: string }[]) {
    const stored = await this.testStore.get(testId);
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
      row.lastTestFailed = false;
      row.retryUsed = 0;
      row.study1Completed = true; // ★ 直接挑战通过等价补齐"已相识"（PRD 3.2/ED-268），保证"是否收听过"一致
      row.lastStudyType = 'test';
      if (row.currentStage < 2) row.currentStage = 2; // 好朋友（层级覆盖）
    } else {
      row.lastTestFailed = true;
    }
    await this.progress.save(row);
    await this.testStore.del(testId);

    const canRetry = !passed && row.retryUsed < 1;
    if (canRetry) {
      row.retryUsed += 1;
      await this.progress.save(row);
    }

    return {
      test_passed: passed,
      score: Math.round((judged.filter((j) => j.is_correct).length / judged.length) * 100),
      results: judged.map((j) => ({ question_id: j.question_id, is_correct: j.is_correct })),
      can_retry: canRetry,
      feedback: passed ? '太棒了！你答对了！' : canRetry ? '差一点点，再试一次吧！' : '没关系，下次一定行！',
      current_stage: row.currentStage,
      stage_name: this.stageName(row.currentStage),
    };
  }

  /** 检查可否自动触发综合挑战：返回攒满 10 个好朋友(stage=2)的字 */
  async comprehensiveAuto(childId: string, subject: Subject) {
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

    // 每个字生成一道服务端保存正确项的识别题；真实题库到位后仅替换题源。
    const questions = words.map((word) => generateNormalQuiz(word.wordId, word.wordText || word.wordId)[0]);
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
    const rowMap = new Map(rows.map((row) => [row.wordId, row]));
    const ordered = wordIds.map((wordId) => rowMap.get(wordId)!);
    const questions = ordered.map((word) => generateNormalQuiz(word.wordId, word.wordText || word.wordId)[0]);
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
    const stored = await this.testStore.get(testId);
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
        row.lastReviewedAt = new Date();
        row.reviewDueAt = new Date(Date.now() + REVIEW_INTERVAL_DAYS * 86400_000);
        row.needsReview = false;
      } else {
        // 只回落答错且原为好伙伴的字（3→2）；原为好朋友的保持 2
        if (row.currentStage === 3) row.currentStage = 2;
      }
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
    await this.testStore.del(testId);

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

  /** 需复习的字（好伙伴且 needs_review=true） */
  async reviewDue(childId: string) {
    const now = new Date();
    const legacyCutoff = new Date(now.getTime() - REVIEW_INTERVAL_DAYS * 86400_000);
    // 读时回填，避免依赖单机定时任务；多实例下同一 UPDATE 仍保持幂等。
    await this.progress
      .createQueryBuilder()
      .update(LearningProgress)
      .set({ needsReview: true })
      .where('child_id = :childId', { childId })
      .andWhere('current_stage = 3')
      .andWhere('needs_review = FALSE')
      .andWhere(
        '((review_due_at IS NOT NULL AND review_due_at <= :now) OR '
        + '(review_due_at IS NULL AND last_reviewed_at IS NOT NULL AND last_reviewed_at <= :legacyCutoff))',
        { now, legacyCutoff },
      )
      .execute();
    const rows = await this.progress.find({ where: { childId, needsReview: true } });
    return {
      total: rows.length,
      words: rows.map((r) => ({ word_id: r.wordId, word: r.wordText, subject: r.subject })),
    };
  }

  /** 提交复习：★服务端判分（复用普通挑战题的 TestStore，客户端不自报对错）；通过→刷新到期，未过→回落好朋友(2) */
  async submitReview(childId: string, testId: string, answers: { question_id: string; selected_option: string }[], intervalDays = REVIEW_INTERVAL_DAYS) {
    const stored = await this.testStore.get(testId);
    if (!stored || stored.kind !== 'normal' || stored.childId !== childId || !stored.wordId) {
      throw new NotFoundException('复习已过期，请重新开始');
    }
    const row = await this.progress.findOne({ where: { childId, wordId: stored.wordId } });
    if (!row) throw new NotFoundException('未找到该字进度');
    const judged = judgeAnswers(stored.questions, answers);
    const passed = isNormalPassed(stored.subject as Subject, judged);
    if (passed) {
      row.lastReviewedAt = new Date();
      row.reviewDueAt = new Date(Date.now() + intervalDays * 86400_000);
      row.needsReview = false;
    } else {
      row.currentStage = 2; // 回落好朋友
      row.needsReview = false;
    }
    await this.progress.save(row);
    await this.testStore.del(testId);
    return { success: true, passed, current_stage: row.currentStage, stage_name: this.stageName(row.currentStage) };
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

  /** 成长总览（成长首页/家长用） */
  async summary(childId: string) {
    const all = await this.progress.find({ where: { childId } });
    const bySubject = (subject: Subject) => {
      const rows = all.filter((r) => r.subject === subject);
      return {
        subject,
        learned: rows.filter((r) => r.currentStage >= 1).length,
        tested: rows.filter((r) => r.currentStage >= 2).length,
        mastered: rows.filter((r) => r.currentStage >= 3).length,
      };
    };
    return {
      child_id: childId,
      overall_stats: {
        total_words_learned: all.filter((r) => r.currentStage >= 1).length,
        total_words_mastered: all.filter((r) => r.currentStage >= 3).length,
      },
      subject_progress: [bySubject('识字'), bySubject('英语'), bySubject('拼音')],
    };
  }
}
