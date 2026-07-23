/**
 * wechat.service.ts — 微信开放接口封装（登录 code2session）
 * 职责：把 wx.login 的 code 换成 openid。
 *  - WX_LOGIN_MODE=mock：不请求微信，按 code 派生一个稳定的伪 openid（本地免 AppID 联调）。
 *  - WX_LOGIN_MODE=real：调 https://api.weixin.qq.com/sns/jscode2session（需 WX_APPID/WX_SECRET）。
 * ⚠️ AppID/Secret 未申请，当前默认 mock。到位后见 开发文档/待办-外部凭据清单.md 切换。
 */
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { envFlag } from '../../config/environment.validation';

export interface WxSession {
  openid: string;
  unionId?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger('WechatService');

  constructor(private readonly config: ConfigService) {}

  /**
   * code 换 openid
   * @param code wx.login 返回的临时登录凭证
   * @returns { openid, unionId? }
   */
  async code2session(code?: string): Promise<WxSession> {
    const isRelease = this.config.get<string>('NODE_ENV') === 'production'
      || envFlag(this.config.get<string>('RELEASE_MODE'));
    const mode = this.config.get<string>('WX_LOGIN_MODE', isRelease ? 'real' : 'mock');

    if (mode === 'mock') {
      const allowed = envFlag(this.config.get<string>('ALLOW_MOCK_LOGIN'), !isRelease);
      if (!allowed) {
        throw new HttpException('当前环境禁止 mock 登录', HttpStatus.SERVICE_UNAVAILABLE);
      }
      // 用 code 派生稳定 openid，保证同一 code 多次登录命中同一用户；无 code 给固定测试账号
      const seed = code && code.length > 0 ? code : 'default_test_user';
      const hash = createHash('md5').update(seed).digest('hex').slice(0, 24);
      return { openid: `mock_${hash}` };
    }

    // real 模式
    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_SECRET');
    if (!appid || !secret) {
      throw new HttpException('微信登录未配置 AppID/Secret（见 开发文档/待办-外部凭据清单.md）', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!code) {
      throw new HttpException('缺少微信登录 code', HttpStatus.BAD_REQUEST);
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const data = (await resp.json()) as { openid?: string; unionid?: string; errcode?: number; errmsg?: string };
    if (!data.openid) {
      this.logger.error(`code2session failed: ${JSON.stringify(data)}`);
      throw new HttpException(`微信登录失败: ${data.errmsg ?? 'unknown'}`, HttpStatus.BAD_REQUEST);
    }
    return { openid: data.openid, unionId: data.unionid };
  }
}
