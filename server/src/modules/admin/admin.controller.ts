import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminService } from './admin.service';

class AdminLoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Public()
  @Post('auth/login')
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto.username, dto.password);
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Get('stats')
  stats() {
    return this.admin.stats();
  }
}
