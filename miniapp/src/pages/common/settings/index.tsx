/**
 * pages/common/settings — C-06 设置（v4：外观主题 + 睡前模式 + 睡眠定时）
 * 睡前模式=全局夜间（settingsStore.isNight，所有页面生效）：定时触发(20:00~6:00) 或 手动开关。
 * 主题落 settingsStore + 本地缓存；登录时同步 PUT /parent/settings。
 */
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { useSettingsStore, ThemeMode, SleepMode } from '@/stores/settingsStore';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';
import Icon from '@/components/Icon';
import iconDay from '@/assets/icon_day.png';
import iconNight from '@/assets/icon_night.png';
import iconLoop from '@/assets/icon_loop.png';

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
  { key: 'system', label: '跟随' },
];
const SLEEPS: { key: SleepMode; label: string }[] = [
  { key: 'timed', label: '定时触发' },
  { key: 'manual', label: '手动' },
];
const TIMERS = [0, 15, 30, 45, 60, 90];

export default function Settings() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const timerMinutes = useSettingsStore((s) => s.timerMinutes);
  const setTimer = useSettingsStore((s) => s.setTimer);
  const sleepMode = useSettingsStore((s) => s.sleepMode);
  const setSleepMode = useSettingsStore((s) => s.setSleepMode);
  const sleepManualOn = useSettingsStore((s) => s.sleepManualOn);
  const toggleSleep = useSettingsStore((s) => s.toggleSleep);
  const isLogin = useUserStore((s) => s.isLogin);
  const night = useNight();

  const chooseTheme = (t: ThemeMode) => {
    setTheme(t);
    if (isLogin) {
      api.put('/parent/settings', { settings: { theme: t } })
        .catch((error) => console.warn('同步主题设置失败', error));
    }
  };
  const chooseTimer = (m: number) => {
    setTimer(m);
    if (isLogin) {
      api.put('/parent/settings', { timer_minutes: m })
        .catch((error) => console.warn('同步定时设置失败', error));
    }
  };

  const Seg = ({ items, active, onPick }: { items: { key: string; label: string }[]; active: string; onPick: (k: any) => void }) => (
    <View className="seg" style={{ maxWidth: '360px' }}>
      {items.map((it) => (
        <Text key={it.key} className={`s ${active === it.key ? 'on' : ''}`} onClick={() => onPick(it.key)}>{it.label}</Text>
      ))}
    </View>
  );

  return (
    <ScrollView scrollY className={`page-container ${night}`}>
      <View className="sec-h"><Text className="t">🎨 外观</Text></View>
      <View className="frow">
        <View className="fi"><Image className="im" src={iconDay} mode="aspectFill" ariaLabel="主题模式图标" /></View>主题模式
        <View style={{ marginLeft: 'auto' }}><Seg items={THEMES} active={theme} onPick={chooseTheme} /></View>
      </View>
      <View className="frow">
        <View className="fi"><Image className="im" src={iconNight} mode="aspectFill" ariaLabel="睡前模式图标" /></View>睡前模式
        <View style={{ marginLeft: 'auto' }}><Seg items={SLEEPS} active={sleepMode} onPick={setSleepMode} /></View>
      </View>
      {sleepMode === 'manual' && (
        <View className="frow">
          <View className="fi" style={{ background: '#171D33' }}><Icon name="moon" size={32} color="#FFC98F" /></View>故事灯（夜间）
          <View style={{ marginLeft: 'auto' }}>
            <Seg items={[{ key: 'on', label: '开' }, { key: 'off', label: '关' }]} active={sleepManualOn ? 'on' : 'off'} onPick={(k) => { if ((k === 'on') !== sleepManualOn) toggleSleep(); }} />
          </View>
        </View>
      )}

      <View className="sec-h"><Text className="t">⏰ 播放</Text></View>
      <View className="frow"><View className="fi"><Image className="im" src={iconLoop} mode="aspectFill" ariaLabel="睡眠定时图标" /></View>睡眠定时</View>
      <View style={{ padding: '0 4px 8px' }}>
        {TIMERS.map((m) => (
          <Text key={m} className={`chip ${timerMinutes === m ? 'on' : ''}`} onClick={() => chooseTimer(m)}>
            {m === 0 ? '关闭' : `${m} 分`}
          </Text>
        ))}
      </View>

      <View className="sec-h"><Text className="t">通用</Text></View>
      <View className="frow"><View className="fi" style={{ background: '#F0E6D8' }}><Icon name="gear" size={32} color="#8B8D9E" /></View>关于酷酷<Text className="rt">v4.0.0 ›</Text></View>
    </ScrollView>
  );
}
