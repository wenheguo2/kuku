/**
 * TabBarV4 — v4 自定义底部 Tab 栏（真实插画图标：故事卷轴/歌曲/成长/家长），跨端共享实现
 * weapp：由 src/custom-tab-bar/（Taro 约定目录）包装注入；h5：四个 tab 页直接渲染（内置文字 tabbar 已隐藏）。
 * 高亮读 tabStore；图标为彩色插画（96px 压缩产物）：未选中降透明度，选中原彩+放大；点击 switchTab 跳转。
 */
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useTabStore, TabKey } from '@/stores/tabStore';
import { useSettingsStore } from '@/stores/settingsStore';
import tabStory from '@/assets/tab_story.png';
import tabSong from '@/assets/tab_song.png';
import tabGrowth from '@/assets/tab_growth.png';
import tabParent from '@/assets/tab_parent.png';
import './index.scss';

const TABS: { key: TabKey; img: string; text: string; url: string }[] = [
  { key: 'story', img: tabStory, text: '故事', url: '/pages/story/index/index' },
  { key: 'song', img: tabSong, text: '歌曲', url: '/pages/song/index/index' },
  { key: 'growth', img: tabGrowth, text: '成长', url: '/pages/growth/index/index' },
  { key: 'parent', img: tabParent, text: '家长', url: '/pages/parent/index/index' },
];

export default function TabBarV4() {
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
            <Image className={`timg ${on ? 'on' : ''}`} src={t.img} mode="aspectFit" ariaLabel={`${t.text}标签`} />
            <Text className="lbl" style={{ color: on ? active : inactive }}>{t.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
