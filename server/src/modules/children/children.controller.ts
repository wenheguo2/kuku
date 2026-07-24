/**
 * children.controller.ts — 孩子档案 CRUD（对齐 md/11 §6.4）
 *  GET/POST /api/v1/children ; PUT/DELETE /api/v1/children/:id
 * 归属校验：仅能操作当前 user 名下档案。删除 child 会级联清除其历史/进度/挑战/成就。
 */
import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsString, MaxLength } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChildProfile } from '../../entities/child-profile.entity';
import { ChildOwnershipService } from './child-ownership.service';

class ChildDto {
  @IsString() @MaxLength(32) child_name: string;
}

@Controller('children')
export class ChildrenController {
  constructor(
    @InjectRepository(ChildProfile) private readonly repo: Repository<ChildProfile>,
    private readonly ownership: ChildOwnershipService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async list(@CurrentUser('userId') userId: string) {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return rows.map((c) => ({ child_id: c.id, child_name: c.childName }));
  }

  @Post()
  async create(@CurrentUser('userId') userId: string, @Body() dto: ChildDto) {
    const c = await this.repo.save(this.repo.create({ userId, childName: dto.child_name }));
    return { child_id: c.id, child_name: c.childName };
  }

  @Put(':id')
  async update(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: ChildDto) {
    await this.ownership.assertOwner(userId, id);
    await this.repo.update(id, { childName: dto.child_name });
    return { success: true };
  }

  @Delete(':id')
  async remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    await this.ownership.assertOwner(userId, id);
    await this.dataSource.transaction(async (manager) => {
      // ★ 事务内加锁计数，防并发删不同档案都读到 count>1 而最终删到 0（TOCTOU）
      const siblings = await manager.find(ChildProfile, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (siblings.length <= 1) {
        throw new BadRequestException('至少保留一个孩子档案，无法删除最后一个');
      }
      // 兼容已建库中 events 外键尚未升级为 ON DELETE SET NULL 的情况。
      await manager.query('UPDATE events SET child_id = NULL WHERE child_id = $1', [id]);
      await manager.delete(ChildProfile, id);
    });
    return { success: true };
  }

}
