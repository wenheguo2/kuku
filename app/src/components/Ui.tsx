import { PropsWithChildren } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';

export const colors = {
  orange: '#FF8C42',
  cream: '#FFF9F0',
  ink: '#2D3142',
  muted: '#6E7080',
  line: '#F0D8C5',
  white: '#FFFFFF',
  purple: '#7259B8',
  teal: '#35BDB4',
  green: '#65B95B',
  blue: '#58B8E8',
  gold: '#C88A16',
};

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.titleWrap}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}

export function StatusPill({ children, tone = 'orange' }: PropsWithChildren<{ tone?: 'orange' | 'green' | 'gold' | 'purple' }>) {
  const bg = tone === 'green' ? '#E7F6E4' : tone === 'gold' ? '#FFF3CE' : tone === 'purple' ? '#EEE8FF' : '#FFF0E5';
  const fg = tone === 'green' ? '#367A35' : tone === 'gold' ? '#986608' : tone === 'purple' ? colors.purple : '#C85E1D';
  return <View style={[styles.pill, { backgroundColor: bg }]}><Text style={[styles.pillText, { color: fg }]}>{children}</Text></View>;
}

export function HeroCard({ image, eyebrow, title, subtitle, color = colors.orange, onPress }: { image?: string; eyebrow: string; title: string; subtitle: string; color?: string; onPress: () => void }) {
  const inner = <><View style={styles.heroShade} /><View style={styles.heroText}><Text style={styles.heroEyebrow}>{eyebrow}</Text><Text numberOfLines={2} style={styles.heroTitle}>{title}</Text><Text style={styles.heroSubtitle}>{subtitle}</Text></View><View style={[styles.heroPlay, { backgroundColor: color }]}><Icon name="play" size={23} color="#fff" /></View></>;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.hero, { backgroundColor: color }, pressed && { opacity: 0.85 }]}>{image ? <ImageBackground source={{ uri: image }} resizeMode="cover" style={styles.heroImage}>{inner}</ImageBackground> : inner}</Pressable>;
}

export function PrimaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonMuted]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

export function Cover({ uri, size = 72 }: { uri?: string; size?: number }) {
  if (!uri) return <View style={[styles.coverFallback, { width: size, height: size }]}><Text style={styles.coverEmoji}>📖</Text></View>;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 16, backgroundColor: '#FFE8D5' }} resizeMode="cover" />;
}

export function Loading({ label = '加载中…' }: { label?: string }) { return <View style={styles.center}><ActivityIndicator color={colors.orange} /><Text style={styles.subtitle}>{label}</Text></View>; }
export function Empty({ text }: { text: string }) { return <View style={styles.center}><Text style={styles.emptyEmoji}>🌙</Text><Text style={styles.subtitle}>{text}</Text></View>; }

const styles = StyleSheet.create({
  titleWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.white, marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.line },
  sectionHeader: { minHeight: 46, paddingHorizontal: 18, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' }, sectionAction: { color: colors.orange, fontSize: 14, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }, pillText: { fontSize: 12, fontWeight: '800' },
  hero: { height: 238, marginHorizontal: 16, marginBottom: 10, borderRadius: 28, overflow: 'hidden' }, heroImage: { flex: 1, justifyContent: 'flex-end' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(20,17,24,0.25)' },
  heroText: { flex: 1, justifyContent: 'flex-end', padding: 22, paddingRight: 76 }, heroEyebrow: { color: '#fff', fontSize: 13, fontWeight: '900', marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '900' }, heroSubtitle: { color: '#fff', fontSize: 13, marginTop: 8, fontWeight: '700' },
  heroPlay: { position: 'absolute', right: 18, bottom: 20, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }, heroPlayIcon: { color: '#fff', fontSize: 21, marginLeft: 3 },
  button: { minHeight: 48, borderRadius: 24, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange },
  buttonMuted: { opacity: 0.55 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  coverFallback: { borderRadius: 16, backgroundColor: '#FFE8D5', alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 28 },
  center: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
});
