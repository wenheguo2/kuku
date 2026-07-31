/**
 * membershipGate.ts — 播放前会员门控（池外内容拦截）
 * 判定：可全站畅听（会员 active || 免费期内）→ 放行；否则内容在免费池 → 放行；都不满足 → 弹开通引导并返回。
 * ★ 口径：仅对「已登录」用户在到期后拦截（付费漏斗）；未登录用户放行（拉新漏斗，注册即得免费期）。
 * ★ 免费专区点播走「锁定队列」，调用方传 locked=true 直接放行（本就是池内）。
 * 注：音频为静态直出，此为「入口级」软门控（家长产品足够）；强防需签名 URL，另行评估。
 */
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/userStore';
import { loadFreePool, isFreeStory, isFreeSong } from '@/services/freePool';

async function guard(kind: 'story' | 'song', id: string, locked: boolean): Promise<boolean> {
  if (locked) return true; // 免费专区锁定队列：本就是池内，放行
  const u = useUserStore.getState();
  if (u.canAccessAll) return true; // 会员 active 或免费期内：放行
  // 非畅听（含未登录，因 canAccessAll 默认 false）→ 仅免费池放行
  const pool = await loadFreePool();
  const inPool = kind === 'story' ? isFreeStory(pool, id) : isFreeSong(pool, id);
  if (inPool) return true;
  // 拦截：未登录→引导登录（领免费）；已登录但无畅听→引导开通会员
  if (!u.isLogin) {
    const res = await Taro.showModal({
      title: '需要登录',
      content: '登录即可免费畅听 3 天；或先到「免费专区」听精选内容。',
      confirmText: '去登录',
      cancelText: '返回',
    });
    if (res.confirm) await Taro.navigateTo({ url: '/pages/common/login/index' });
    else await Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/story/index/index' }));
    return false;
  }
  const res = await Taro.showModal({
    title: '这是会员内容',
    content: '你的免费畅听已结束，需成为会员才可播放。开通会员畅听全部故事与儿歌，或到「免费专区」继续免费听～',
    confirmText: '开通会员',
    cancelText: '返回',
  });
  if (res.confirm) {
    await Taro.navigateTo({ url: '/pages/common/member/index' });
  } else {
    await Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/story/index/index' }));
  }
  return false;
}

/** 故事播放前门控：返回 true 放行，false 已处理（弹窗+跳转） */
export function guardStoryPlay(path: string, locked: boolean): Promise<boolean> {
  return guard('story', path, locked);
}

/** 歌曲播放前门控：返回 true 放行，false 已处理 */
export function guardSongPlay(id: string, locked: boolean): Promise<boolean> {
  return guard('song', id, locked);
}
