import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CONFIG } from '@/config';
import { api } from '@/services/api';
import { useSession } from '@/state/SessionContext';
import { colors, Loading, PrimaryButton, StatusPill } from '@/components/Ui';
import { Icon } from '@/components/Icon';
import { embeddedImages } from '@/assets/embeddedImages';
import type { Navigate } from '@/navigation';

interface Weekly { weekly_stats: { new_acquainted: number; new_friends: number; new_buddies: number } }

const FEATURES = [
  { image: embeddedImages.favorite, label: '收藏管理', detail: '我的收藏' },
  { image: embeddedImages.history, label: '播放历史', detail: '最近 100 条' },
  { image: embeddedImages.children, label: '孩子档案', detail: '管理' },
  { image: embeddedImages.settings, label: '账号设置', detail: '外观与播放' },
  { image: embeddedImages.privacy, label: '隐私与账号注销', detail: '管理' },
] as const;

export function ParentScreen({ onNavigate }: { onNavigate: Navigate }) {
  const session = useSession();
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const [legalVisible, setLegalVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session.loggedIn || !session.childId) { setWeekly(null); return; }
    void api<Weekly>(`/parent/progress/weekly?child_id=${encodeURIComponent(session.childId)}`).then(setWeekly).catch(() => setWeekly(null));
  }, [session.childId, session.loggedIn]);

  if (session.loading) return <Loading label="恢复会话中…" />;
  const membershipActive = session.profile?.membership.status === 'active';
  const hasAccess = session.profile?.can_access_all === true;
  const end = session.profile?.entitlement_until;
  const days = end ? Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)) : 0;
  const statusLabel = membershipActive ? '鎏金会员' : hasAccess ? '免费体验中' : session.loggedIn ? '非权益用户' : '未登录';

  const login = async () => {
    if (!agreed) { Alert.alert('请先阅读并同意协议'); return; }
    setSubmitting(true);
    try { await session.login(); setLoginVisible(false); setAgreed(false); }
    catch (e) { Alert.alert('登录失败', e instanceof Error ? e.message : '请稍后重试'); }
    finally { setSubmitting(false); }
  };

  const openFeature = (label: string) => {
    if (!session.loggedIn) { setLoginVisible(true); return; }
    if (label === '收藏管理') onNavigate({ name: 'favorites' });
    else if (label === '播放历史') onNavigate({ name: 'history' });
    else if (label === '孩子档案') onNavigate({ name: 'children' });
    else if (label === '账号设置') onNavigate({ name: 'settings' });
    else if (label === '隐私与账号注销') confirmDelete();
  };

  const confirmDelete = () => Alert.alert('永久注销账号？', '孩子档案、历史、成长记录、收藏和会员数据将删除且无法恢复。', [
    { text: '取消', style: 'cancel' },
    { text: '永久删除', style: 'destructive', onPress: () => void session.deleteAccount().catch((e) => Alert.alert('注销失败', e instanceof Error ? e.message : '请稍后重试')) },
  ]);

  return <>
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>家长中心</Text>
      <View style={styles.kidCard}>
        <View style={styles.avatar}><Text style={styles.avatarEmoji}>👦🏻</Text></View>
        <View style={styles.kidMeta}><Text style={styles.kidName}>{session.loggedIn ? (session.profile?.nickname ?? '宝宝家长') : '宝宝家长'}</Text><Text style={styles.kidSub}>{session.loggedIn ? '陪伴成长中' : '登录后同步成长记录'}</Text><View style={styles.statusGap}><StatusPill tone={membershipActive ? 'gold' : hasAccess ? 'green' : 'orange'}>{statusLabel}</StatusPill></View></View>
        <Pressable onPress={() => session.loggedIn ? onNavigate({ name: 'children' }) : setLoginVisible(true)}><Text style={styles.manage}>{session.loggedIn ? '管理 ›' : '登录 ›'}</Text></Pressable>
      </View>

      <View style={styles.stats}><Metric value={weekly?.weekly_stats.new_acquainted ?? 0} label="新相识" color="#E0B91F" /><Metric value={weekly?.weekly_stats.new_friends ?? 0} label="新好朋友" color={colors.blue} /><Metric value={weekly?.weekly_stats.new_buddies ?? 0} label="新好伙伴" color={colors.green} /></View>

      {!session.loggedIn ? <View style={styles.loginCard}><Text style={styles.loginTitle}>监护人登录</Text><Text style={styles.loginBody}>App 使用独立设备会话，不读取微信小程序身份。登录后可按活动规则领取体验期。</Text><PrimaryButton title="登录 App" onPress={() => setLoginVisible(true)} /></View> : null}

      {FEATURES.map((item) => <Pressable key={item.label} onPress={() => openFeature(item.label)} style={({ pressed }) => [styles.feature, pressed && { opacity: .72 }]}>
        <View style={styles.featureIcon}><Image source={{ uri: item.image }} resizeMode="contain" style={styles.featureImage} /></View><Text style={styles.featureLabel}>{item.label}</Text><Text style={styles.featureDetail}>{session.loggedIn ? item.detail : '登录后可用'} ›</Text>
      </Pressable>)}

      <Pressable onPress={() => onNavigate({ name: 'membership' })} style={styles.goldCard}>
        <View style={[styles.featureIcon, styles.goldIcon]}><Image source={{ uri: embeddedImages.member }} resizeMode="contain" style={styles.featureImage} /></View><View style={{ flex: 1 }}><Text style={styles.goldTitle}>鎏金故事书匣</Text><Text style={styles.goldSub}>{membershipActive ? '全馆故事与儿歌畅听' : hasAccess ? '活动体验权益已生效' : '固定免费池可用'}</Text></View><Text style={styles.goldRight}>{hasAccess ? `还剩 ${days} 天 ›` : '了解权益 ›'}</Text>
      </Pressable>

      <View style={styles.shareBar}><Text style={styles.shareText}>📤 把酷酷推荐给其他家长</Text></View>
      {session.loggedIn ? <Pressable onPress={() => void session.logout()} style={styles.logout}><Text style={styles.logoutText}>退出登录</Text></Pressable> : null}
      <Pressable onPress={() => setLegalVisible(true)}><Text style={styles.version}>App 0.1.0 · Android / iOS · 用户协议与隐私政策</Text></Pressable>
    </ScrollView>

    <Modal visible={loginVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLoginVisible(false)}>
      <View style={styles.modal}><Text style={styles.modalTitle}>监护人确认</Text><Text style={styles.body}>请由监护人完成确认。协议不会默认勾选，同意记录会连同版本号写入服务端。</Text><Pressable onPress={() => setLegalVisible(true)} style={styles.legalLink}><Text style={styles.legalText}>查看用户协议、隐私政策与儿童个人信息保护规则</Text></Pressable><View style={styles.consentRow}><Switch value={agreed} onValueChange={setAgreed} trackColor={{ true: colors.orange }} /><Text style={styles.consentText}>我已阅读并同意三份协议，且确认我是监护人</Text></View><PrimaryButton disabled={!agreed || submitting} title={submitting ? '登录中…' : '同意并登录'} onPress={() => void login()} /><Pressable onPress={() => { setLoginVisible(false); setAgreed(false); }} style={styles.cancel}><Text style={styles.cancelText}>取消</Text></Pressable></View>
    </Modal>

    <Modal visible={legalVisible} animationType="fade" onRequestClose={() => setLegalVisible(false)}>
      <ScrollView style={styles.legalPage} contentContainerStyle={styles.legalContent}><Text style={styles.modalTitle}>协议说明</Text><Text style={styles.legalBadge}>{CONFIG.agreements.user_agreement_version.includes('draft') ? '开发草案 · 不可用于正式上线' : `正式版本 ${CONFIG.agreements.user_agreement_version}`}</Text><Text style={styles.legalHeading}>用户协议</Text><Text style={styles.body}>本 App 为儿童故事与启蒙内容服务。监护人负责账号使用、孩子档案管理及内容选择。正式主体信息、联系方式、争议处理条款须以法务定稿正文替换。</Text><Text style={styles.legalHeading}>隐私政策</Text><Text style={styles.body}>App 仅在提供登录、档案、播放记录与成长功能所必需的范围内处理信息；设备安装标识保存在系统安全存储，服务端仅保存不可逆 HMAC 派生身份。</Text><Text style={styles.legalHeading}>儿童个人信息保护规则</Text><Text style={styles.body}>儿童信息仅由监护人创建和管理。监护人可以撤回同意、删除孩子档案或永久注销账号。正式版须经法务及合规负责人确认。</Text><PrimaryButton title="返回" onPress={() => setLegalVisible(false)} /></ScrollView>
    </Modal>
  </>;
}

function Metric({ value, label, color }: { value: number; label: string; color: string }) { return <View style={styles.metric}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FBF7F2' }, content: { paddingBottom: 30 }, title: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'center', marginVertical: 20 }, kidCard: { marginHorizontal: 16, padding: 18, borderRadius: 26, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE1D5' }, avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#E9E2FF', alignItems: 'center', justifyContent: 'center' }, avatarEmoji: { fontSize: 34 }, kidMeta: { flex: 1, marginLeft: 14 }, kidName: { color: colors.ink, fontSize: 24, fontWeight: '900' }, kidSub: { color: colors.muted, marginTop: 4 }, statusGap: { marginTop: 8 }, manage: { color: colors.orange, fontWeight: '900', fontSize: 16 },
  stats: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 14, gap: 10 }, metric: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 17, alignItems: 'center', borderWidth: 1, borderColor: '#EEE1D5' }, metricValue: { fontSize: 24, fontWeight: '900' }, metricLabel: { color: colors.muted, marginTop: 5, fontSize: 12 },
  loginCard: { marginHorizontal: 16, marginBottom: 12, padding: 18, borderRadius: 22, backgroundColor: '#FFF1E6' }, loginTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' }, loginBody: { color: colors.muted, lineHeight: 20, marginVertical: 10, fontSize: 13 },
  feature: { minHeight: 72, marginHorizontal: 16, marginBottom: 10, borderRadius: 20, backgroundColor: '#fff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE1D5' }, featureIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF0E5', alignItems: 'center', justifyContent: 'center' }, featureImage: { width: 34, height: 34 }, featureEmoji: { fontSize: 23 }, featureLabel: { color: colors.ink, fontSize: 16, fontWeight: '800', marginLeft: 12 }, featureDetail: { color: colors.muted, fontSize: 12, marginLeft: 'auto' },
  goldCard: { minHeight: 82, marginHorizontal: 16, marginTop: 2, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1C9', borderWidth: 1, borderColor: '#F1CC6D' }, goldIcon: { backgroundColor: '#FFE199' }, goldTitle: { color: '#6F4B09', fontSize: 17, fontWeight: '900', marginLeft: 12 }, goldSub: { color: '#967028', fontSize: 12, marginLeft: 12, marginTop: 4 }, goldRight: { color: '#A97408', fontSize: 12, fontWeight: '800' }, shareBar: { marginHorizontal: 44, marginTop: 16, minHeight: 50, borderRadius: 25, backgroundColor: '#FFA25E', alignItems: 'center', justifyContent: 'center' }, shareText: { color: '#fff', fontWeight: '900' }, logout: { minHeight: 52, alignItems: 'center', justifyContent: 'center' }, logoutText: { color: '#B42318', fontWeight: '800' }, version: { color: colors.muted, textAlign: 'center', marginTop: 10, fontSize: 12 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 }, modal: { flex: 1, backgroundColor: '#FFF9F0', paddingHorizontal: 24, paddingTop: 70 }, modalTitle: { color: colors.ink, fontSize: 28, fontWeight: '900', marginBottom: 18 }, legalLink: { minHeight: 54, justifyContent: 'center', marginVertical: 16 }, legalText: { color: colors.purple, lineHeight: 22, fontWeight: '800' }, consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 }, consentText: { flex: 1, color: colors.ink, lineHeight: 21 }, cancel: { minHeight: 52, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.muted, fontWeight: '700' }, legalPage: { flex: 1, backgroundColor: '#FFF9F0' }, legalContent: { padding: 24, paddingTop: 60, paddingBottom: 60 }, legalBadge: { color: '#B42318', backgroundColor: '#FEE4E2', padding: 10, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }, legalHeading: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 18, marginBottom: 8 },
});
