/**
 * pages/common/agreement — 协议与儿童个人信息规则阅读页
 * 当前为可运行占位文本；正式提审前由法务确认内容、主体信息、联系方式与版本号。
 * 儿童规则页(type=children)登录态提供“撤回监护人同意”入口（POST /user/consent/withdraw，撤回后登出）。
 */
import { useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';
import { AGREEMENT_VERSIONS } from '@/config/agreements';

const CONTENT = {
  user: {
    title: '用户协议',
    version: AGREEMENT_VERSIONS.user_agreement_version,
    sections: [
      '本服务为儿童故事、歌曲与启蒙内容的家庭陪伴工具，由监护人注册和管理账号。',
      '用户不得利用本服务传播违法、有害或侵害他人权益的内容。',
      '会员、支付、退款和自动续费规则将在正式支付能力接入后单独明示。',
    ],
  },
  privacy: {
    title: '隐私政策',
    version: AGREEMENT_VERSIONS.privacy_version,
    sections: [
      '我们仅处理提供服务所必需的家长账号、孩子昵称、播放历史与成长进度，不收集学校、住址或精确位置。',
      '数据用于登录、播放记录、收藏、成长展示与安全审计；未经授权不用于无关目的。',
      '监护人可在家长中心更正、删除孩子档案，或通过账号注销删除账号及关联数据。',
    ],
  },
  children: {
    title: '儿童个人信息保护规则',
    version: AGREEMENT_VERSIONS.children_privacy_version,
    sections: [
      '儿童是指不满十四周岁的未成年人。创建孩子档案前，应由其父母或其他监护人阅读并明确同意本规则。',
      '监护人可以拒绝或撤回同意；拒绝后仍可使用不需要儿童档案的基础内容浏览功能。',
      '儿童数据按账号和 child_id 隔离，并采用访问控制、传输加密和最短必要保存期限。',
    ],
  },
} as const;

export default function Agreement() {
  const router = useRouter();
  const type = (router.params.type || 'user') as keyof typeof CONTENT;
  const doc = CONTENT[type] || CONTENT.user;
  const night = useNight();
  const isLogin = useUserStore((s) => s.isLogin);
  const logout = useUserStore((s) => s.logout);
  const [submitting, setSubmitting] = useState(false);

  // 监护人撤回同意（合规闭环）：二次确认 → 服务端留痕 withdrawn_at → 本地登出，再次登录需重新同意
  const withdrawConsent = async () => {
    if (submitting) return;
    const res = await Taro.showModal({
      title: '撤回监护人同意',
      content: '撤回后将退出登录，孩子档案与成长功能暂停使用；再次登录需重新阅读并同意各项协议。',
      confirmText: '确认撤回',
      cancelText: '再想想',
    });
    if (!res.confirm) return;
    setSubmitting(true);
    try {
      await api.post('/user/consent/withdraw', {});
      logout();
      Taro.showToast({ title: '已撤回同意，已退出登录', icon: 'none' });
      setTimeout(() => Taro.reLaunch({ url: '/pages/story/index/index' }), 600);
    } catch (error) {
      console.warn('撤回同意失败', error);
      Taro.showToast({ title: '撤回失败，请稍后再试', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView scrollY className={`page-container ${night}`}>
      <Text className="brand-title">{doc.title}</Text>
      <Text className="muted" style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>
        草案版本：{doc.version}
      </Text>
      {doc.sections.map((section, index) => (
        <View key={section} className="card" style={{ marginBottom: '16px' }}>
          <Text className="nm" style={{ display: 'block', marginBottom: '8px' }}>{index + 1}</Text>
          <Text className="ds" style={{ lineHeight: 1.8 }}>{section}</Text>
        </View>
      ))}
      {type === 'children' && isLogin && (
        <View className={`btn-ghost ${submitting ? 'disabled' : ''}`} onClick={withdrawConsent} style={{ margin: '8px 4px 0' }}>
          撤回监护人同意
        </View>
      )}
      <Text className="muted" style={{ display: 'block', padding: '20px 0 40px' }}>
        提醒：本文目前是开发联调用草案，正式发布前必须补齐运营主体、联系方式、存储期限、第三方 SDK 清单并经法务确认。
      </Text>
    </ScrollView>
  );
}
