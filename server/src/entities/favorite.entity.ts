/**
 * favorite.entity.ts — 收藏表实体（对应 DDL: favorites）
 * 职责：用户收藏的故事/歌曲/课程。★ 按账号(user_id)共享，不分 child_id。
 * 唯一约束：(user_id, content_type, content_id)。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type ContentType = 'story' | 'song' | 'lesson';

@Entity('favorites')
@Unique(['userId', 'contentType', 'contentId'])
@Index('idx_fav_user_type', ['userId', 'contentType'])
export class Favorite {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'content_type', type: 'varchar', length: 16 })
  contentType: ContentType;

  @Column({ name: 'content_id', type: 'varchar', length: 256 })
  contentId: string;

  @Column({ name: 'content_title', type: 'varchar', length: 256, nullable: true })
  contentTitle: string | null;

  @Column({ name: 'subject_id', type: 'varchar', length: 64, nullable: true })
  subjectId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
