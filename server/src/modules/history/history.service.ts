/**
 * history.service.ts — 播放历史业务（★ 按 child_id 隔离）
 * 复播时按 (child_id, content_type, content_id) UPSERT：更新进度/次数/时间。
 * 保留最近 100 条（md/05 决策 C-03）。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentType } from '../../entities/favorite.entity';
import { PlayHistory } from '../../entities/play-history.entity';

const MAX_HISTORY = 100;

export interface SaveHistoryDto {
  child_id: string;
  content_type: ContentType;
  content_id: string;
  content_title?: string;
  subject_id?: string;
  last_position_ms?: number;
  last_segment?: number;
  duration_ms?: number;
}

@Injectable()
export class HistoryService {
  constructor(@InjectRepository(PlayHistory) private readonly repo: Repository<PlayHistory>) {}

  /** 记录/更新一条历史 */
  async save(userId: string, dto: SaveHistoryDto) {
    let row = await this.repo.findOne({
      where: { childId: dto.child_id, contentType: dto.content_type, contentId: dto.content_id },
    });
    if (row) {
      row.lastPositionMs = dto.last_position_ms ?? row.lastPositionMs;
      row.lastSegment = dto.last_segment ?? row.lastSegment;
      row.durationMs = dto.duration_ms ?? row.durationMs;
      row.playedCount += 1;
      await this.repo.save(row);
    } else {
      row = await this.repo.save(
        this.repo.create({
          userId,
          childId: dto.child_id,
          contentType: dto.content_type,
          contentId: dto.content_id,
          contentTitle: dto.content_title ?? null,
          subjectId: dto.subject_id ?? null,
          lastPositionMs: dto.last_position_ms ?? 0,
          lastSegment: dto.last_segment ?? null,
          durationMs: dto.duration_ms ?? 0,
        }),
      );
      await this.trim(dto.child_id);
    }
    return { history_id: row.id, saved: true };
  }

  /** 查询某孩子历史（倒序，最多 100） */
  async list(childId: string) {
    const rows = await this.repo.find({
      where: { childId },
      order: { updatedAt: 'DESC' },
      take: MAX_HISTORY,
    });
    return {
      total: rows.length,
      list: rows.map((h) => ({
        history_id: h.id,
        content_type: h.contentType,
        content_id: h.contentId,
        title: h.contentTitle,
        last_position_ms: h.lastPositionMs,
        played_at: h.updatedAt,
      })),
    };
  }

  /** 删除单条（校验归属；不存在/非本人统一 404，不泄露存在性） */
  async remove(userId: string, id: string) {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('未找到该历史');
    }
    await this.repo.delete(id);
    return { success: true };
  }

  /** 清空某孩子历史 */
  async clear(childId: string) {
    const r = await this.repo.delete({ childId });
    return { success: true, deleted_count: r.affected ?? 0 };
  }

  /** 超出 100 条时删最旧：单条 DELETE 子查询（按更新时间倒序跳过最新 100，删其余），避免 count→find→remove 三次往返 */
  private async trim(childId: string) {
    await this.repo.query(
      `DELETE FROM play_history WHERE id IN (
         SELECT id FROM play_history WHERE child_id = $1
         ORDER BY updated_at DESC
         OFFSET $2
       )`,
      [childId, MAX_HISTORY],
    );
  }
}
