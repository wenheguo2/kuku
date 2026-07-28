/**
 * custom-tab-bar — Taro weapp 约定目录（app.config tabBar.custom=true 时自动注入 tab 页）。
 * 实现已抽到共享组件 components/TabBarV4（h5 端由各 tab 页直接渲染），此处仅做包装。
 * ⚠️ custom-tab-bar 是独立编译单元，不加载 app 公共样式/common.wxss——样式走本目录 index.scss
 * （内部 sass @import 文本级内联组件样式），确保产出独立 index.wxss。
 */
import TabBarV4 from '@/components/TabBarV4';
import './index.scss';

export default function CustomTabBar() {
  return <TabBarV4 />;
}
