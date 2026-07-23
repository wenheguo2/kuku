/**
 * pagination.dto.ts — 分页查询通用 DTO（对齐 md/11 §0.5）
 * page 默认 1，page_size 默认 20。返回结构 { total, page, page_size, list }。
 */
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size = 20;
}

/** 分页返回包装 */
export function paginated<T>(list: T[], total: number, page: number, pageSize: number) {
  return { total, page, page_size: pageSize, list };
}
