/**
 * pages/common/children — A-02 孩子档案管理
 * GET/POST/PUT/DELETE /children；切换 selectedChildId（4 Tab 共用，成长/历史随之联动）。
 */
import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';
import Icon from '@/components/Icon';

interface Child { child_id: string; child_name: string }

export default function Children() {
  const isLogin = useUserStore((s) => s.isLogin);
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const setSelectedChild = useUserStore((s) => s.setSelectedChild);
  const [list, setList] = useState<Child[]>([]);
  const night = useNight();

  const load = () => {
    if (isLogin) {
      api.get<Child[]>('/children')
        .then(setList)
        .catch((error) => console.warn('加载儿童档案失败', error));
    }
  };
  useDidShow(load);

  /** 跨端昵称输入：weapp 用 showModal editable(基础库 2.17.1+)；h5 的 showModal 不支持输入框(实测确认)，退 window.prompt */
  const promptName = async (title: string, initial: string): Promise<string | null> => {
    if (process.env.TARO_ENV === 'h5') {
      const v = window.prompt(title, initial);
      return v && v.trim() ? v.trim() : null;
    }
    // editable/content 为微信 wx.showModal 运行期支持，Taro 类型未含，做安全转型
    const res: any = await Taro.showModal({ title, editable: true, content: initial, placeholderText: '孩子昵称' } as any);
    return res.confirm && res.content && String(res.content).trim() ? String(res.content).trim() : null;
  };

  const add = async () => {
    const name = await promptName('添加孩子', '');
    if (name) {
      try {
        await api.post('/children', { child_name: name });
        load();
      } catch (error) {
        console.warn('添加孩子失败', error);
        Taro.showToast({ title: '添加失败，请重试', icon: 'none' });
      }
    }
  };
  const rename = async (c: Child) => {
    const name = await promptName('修改昵称', c.child_name);
    if (name) {
      try {
        await api.put(`/children/${c.child_id}`, { child_name: name });
        load();
      } catch (error) {
        console.warn('修改昵称失败', error);
        Taro.showToast({ title: '修改失败，请重试', icon: 'none' });
      }
    }
  };
  const remove = async (c: Child) => {
    const res = await Taro.showModal({ title: '删除档案', content: `确定删除「${c.child_name}」？其成长进度/播放历史将一并清除。` });
    if (!res.confirm) return;
    try {
      await api.del(`/children/${c.child_id}`);
      // ★ 若删的是当前选中档案，自动切到剩余首个，避免 selectedChildId 悬空导致全局数据变 0
      if (selectedChildId === c.child_id) {
        const next = list.find((x) => x.child_id !== c.child_id);
        if (next) setSelectedChild(next.child_id);
      }
      load();
    } catch (error) {
      console.warn('删除档案失败', error);
      Taro.showToast({ title: '删除失败，请重试', icon: 'none' });
    }
  };

  if (!isLogin) return (
    <View className={`center ${night}`}>
      <Icon name="family" size={112} color="#FF8C42" />
      <Text className="muted" style={{ marginBottom: '28px' }}>登录后管理孩子档案</Text>
      <View className="btn-primary" style={{ width: '360px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>去登录</View>
    </View>
  );

  return (
    <View className={`page-container ${night}`}>
      <View style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Icon name="family" size={48} color="#FF8C42" />
        <Text className="brand-title">孩子档案</Text>
      </View>
      {list.map((c) => (
        <View key={c.child_id} className="list-row">
          <View className="thumb" style={{ borderRadius: '50%', background: selectedChildId === c.child_id ? 'var(--color-primary)' : 'var(--color-primary-soft)', color: selectedChildId === c.child_id ? '#fff' : 'var(--color-primary)' }} onClick={() => setSelectedChild(c.child_id)}>
            <Icon name="family" size={42} color={selectedChildId === c.child_id ? '#fff' : '#FF8C42'} />
          </View>
          <View className="gr" onClick={() => setSelectedChild(c.child_id)}>
            <Text className="nm">{c.child_name}</Text>
            <Text className="ds">{selectedChildId === c.child_id ? '当前档案' : '点击切换'}</Text>
          </View>
          <Text className="chip" onClick={() => rename(c)}>改名</Text>
          {list.length > 1 && <Text className="chip" style={{ color: '#E4572E', borderColor: '#F3C6BC' }} onClick={() => remove(c)}>删除</Text>}
        </View>
      ))}
      <View className="btn-primary" style={{ marginTop: '12px' }} onClick={add}>+ 添加孩子</View>
    </View>
  );
}
