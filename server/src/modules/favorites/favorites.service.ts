/**
 * favorites.service.ts — 收藏业务（★ 按账号 user 共享，不分 child_id）
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentType, Favorite } from '../../entities/favorite.entity';

const MAX_FAVORITES = 500; // 上限，见 md/05 决策 C-04

@Injectable()
export class FavoritesService {
  constructor(@InjectRepository(Favorite) private readonly repo: Repository<Favorite>) {}

  /** 收藏列表（账号维度） */
  async list(userId: string) {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return {
      total: rows.length,
      list: rows.map((f) => ({
        favorite_id: f.id,
        content_type: f.contentType,
        content_id: f.contentId,
        title: f.contentTitle,
        subject_id: f.subjectId,
      })),
    };
  }

  /** 添加收藏（幂等：命中唯一键则返回既有） */
  async add(userId: string, dto: { content_type: ContentType; content_id: string; content_title?: string; subject_id?: string }) {
    const count = await this.repo.count({ where: { userId } });
    if (count >= MAX_FAVORITES) {
      throw new ForbiddenException('收藏已达上限 500');
    }
    let fav = await this.repo.findOne({
      where: { userId, contentType: dto.content_type, contentId: dto.content_id },
    });
    if (!fav) {
      try {
        fav = await this.repo.save(
          this.repo.create({
            userId,
            contentType: dto.content_type,
            contentId: dto.content_id,
            contentTitle: dto.content_title ?? null,
            subjectId: dto.subject_id ?? null,
          }),
        );
      } catch (e) {
        // 并发同一内容重复 insert 撞唯一键 → 重查既有（幂等）
        fav = await this.repo.findOne({ where: { userId, contentType: dto.content_type, contentId: dto.content_id } });
        if (!fav) throw e;
      }
    }
    return { favorite_id: fav.id, saved: true };
  }

  /** 取消收藏（校验归属；不存在/非本人统一 404，不泄露存在性） */
  async remove(userId: string, id: string) {
    const fav = await this.repo.findOne({ where: { id, userId } });
    if (!fav) {
      throw new NotFoundException('未找到该收藏');
    }
    await this.repo.delete(id);
    return { success: true };
  }
}
