/**
 * favorites.controller.ts — 收藏接口（对齐 md/11 §3.5）
 *  GET    /api/v1/favorites          收藏列表（账号共享）
 *  POST   /api/v1/favorites          添加收藏
 *  DELETE /api/v1/favorites/:id      取消收藏
 */
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentType } from '../../entities/favorite.entity';
import { FavoritesService } from './favorites.service';

class AddFavoriteDto {
  @IsIn(['story', 'song', 'lesson']) content_type: ContentType;
  @IsString() content_id: string;
  @IsOptional() @IsString() content_title?: string;
  @IsOptional() @IsString() subject_id?: string;
}

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.service.list(userId);
  }

  @Post()
  add(@CurrentUser('userId') userId: string, @Body() dto: AddFavoriteDto) {
    return this.service.add(userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
