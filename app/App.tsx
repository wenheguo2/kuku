import { Component, PropsWithChildren, ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, PrimaryButton } from '@/components/Ui';
import { embeddedImages } from '@/assets/embeddedImages';
import { PlayerBar } from '@/components/PlayerBar';
import { GrowthScreen } from '@/screens/GrowthScreen';
import { ParentScreen } from '@/screens/ParentScreen';
import { SongScreen } from '@/screens/SongScreen';
import { StoryScreen } from '@/screens/StoryScreen';
import { CommonScreen } from '@/screens/CommonScreens';
import { PlayerProvider } from '@/state/PlayerContext';
import { SessionProvider } from '@/state/SessionContext';
import type { AppRoute } from '@/navigation';

type Tab = 'story' | 'song' | 'growth' | 'parent';
const TABS: Array<{ key: Tab; label: string; image: string }> = [
  { key: 'story', label: '故事', image: embeddedImages.tabStory },
  { key: 'song', label: '歌曲', image: embeddedImages.tabSong },
  { key: 'growth', label: '成长', image: embeddedImages.tabGrowth },
  { key: 'parent', label: '家长', image: embeddedImages.tabParent },
];

class ErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('[App ErrorBoundary]', error); }
  render(): ReactNode {
    if (this.state.failed) return <View style={styles.errorPage}><Text style={styles.errorEmoji}>🌙</Text><Text style={styles.errorTitle}>呀，出了点小状况</Text><Text style={styles.errorBody}>请回到首页继续听故事。</Text><PrimaryButton title="回到首页" onPress={() => this.setState({ failed: false })} /></View>;
    return this.props.children;
  }
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('story');
  const [route, setRoute] = useState<AppRoute | null>(null);
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
    <View style={styles.screen}>
      {route ? <CommonScreen route={route} onBack={() => setRoute(null)} /> : <>
        {tab === 'story' ? <StoryScreen onNavigate={setRoute} /> : null}
        {tab === 'song' ? <SongScreen onNavigate={setRoute} /> : null}
        {tab === 'growth' ? <GrowthScreen onNavigate={setRoute} /> : null}
        {tab === 'parent' ? <ParentScreen onNavigate={setRoute} /> : null}
      </>}
    </View>
    <PlayerBar />
    {!route ? <View style={styles.tabs}>
      {TABS.map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={styles.tab}>
        {tab === item.key ? <View style={styles.activeLine} /> : null}
        <View style={[styles.iconWrap, tab === item.key && styles.iconWrapActive]}><Image source={{ uri: item.image }} resizeMode="contain" style={[styles.tabImage, tab !== item.key && styles.tabImageIdle]} /></View>
        <Text style={[styles.label, tab === item.key && styles.selected]}>{item.label}</Text>
      </Pressable>)}
    </View> : null}
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><ErrorBoundary><SessionProvider><PlayerProvider><AppShell /></PlayerProvider></SessionProvider></ErrorBoundary></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream }, screen: { flex: 1 }, tabs: { minHeight: 64, flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  tab: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', position: 'relative' }, activeLine: { position: 'absolute', top: 0, width: 30, height: 3, borderRadius: 2, backgroundColor: colors.orange }, iconWrap: { width: 42, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, iconWrapActive: { backgroundColor: '#FFF0E5' }, tabImage: { width: 30, height: 30 }, tabImageIdle: { opacity: .62, transform: [{ scale: .94 }] }, label: { fontSize: 12, color: colors.muted, marginTop: 1, fontWeight: '700' }, selected: { color: colors.orange },
  errorPage: { flex: 1, padding: 36, justifyContent: 'center', backgroundColor: colors.cream }, errorEmoji: { fontSize: 54, textAlign: 'center' }, errorTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 18 }, errorBody: { color: colors.muted, textAlign: 'center', marginVertical: 18 },
});
