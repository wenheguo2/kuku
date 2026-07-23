/**
 * custom-tab-bar — v4 自定义 SVG 底部 Tab 栏（书/音符/嫩芽/家庭）
 * Taro 约定：位于 src/custom-tab-bar/index.tsx，app.config tabBar.custom=true 时自动注入 tab 页。
 * 高亮读 tabStore；随睡前夜间模式即时换色；点击 switchTab 跳转。
 */
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon, { IconName } from '@/components/Icon';
import { useTabStore, TabKey } from '@/stores/tabStore';
import { useSettingsStore } from '@/stores/settingsStore';
import './index.scss';

const TABS: { key: TabKey; icon: IconName; text: string; url: string }[] = [
  { key: 'story', icon: 'book', text: '故事', url: '/pages/story/index/index' },
  { key: 'song', icon: 'music', text: '歌曲', url: '/pages/song/index/index' },
  { key: 'growth', icon: 'sprout', text: '成长', url: '/pages/growth/index/index' },
  { key: 'parent', icon: 'family', text: '家长', url: '/pages/parent/index/index' },
];

export default function CustomTabBar() {
  const tab = useTabStore((s) => s.tab);
  const isNight = useSettingsStore((s) => s.isNight);
  const active = isNight ? '#FFC98F' : '#FF8C42';
  const inactive = isNight ? '#8A93B8' : '#8B8D9E';

  const go = (t: (typeof TABS)[number]) => {
    useTabStore.getState().setTab(t.key);
    Taro.switchTab({ url: t.url });
  };

  return (
    <View className={`tabbar-v4 ${isNight ? 'night' : ''}`}>
      {TABS.map((t) => {
        const on = tab === t.key;
        return (
          <View key={t.key} className={`tbi ${on ? 'on' : ''}`} onClick={() => go(t)}>
            {on && <View className="ind" />}
            <Icon name={t.icon} size={44} color={on ? active : inactive} />
            <Text className="lbl" style={{ color: on ? active : inactive }}>{t.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
