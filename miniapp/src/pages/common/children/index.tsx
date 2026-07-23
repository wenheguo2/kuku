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
  const { isLogin, selectedChildId, setSelectedChild } = useUserStore();
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

  const add = async () => {
    // editable/content 为微信 wx.showModal 运行期支持，Taro 类型未含，做安全转型
    const res: any = await Taro.showModal({ title: '添加孩子', editable: true, placeholderText: '孩子昵称' } as any);
    if (res.confirm && res.content) {
      await api.post('/children', { child_name: res.content });
      load();
    }
  };
  const rename = async (c: Child) => {
    const res: any = await Taro.showModal({ title: '修改昵称', editable: true, content: c.child_name } as any);
    if (res.confirm && res.content) {
      await api.put(`/children/${c.child_id}`, { child_name: res.content });
      load();
    }
  };
  const remove = async (c: Child) => {
    const res = await Taro.showModal({ title: '删除档案', content: `确定删除「${c.child_name}」？其学习进度/历史将一并清除。` });
    if (res.confirm) { await api.del(`/children/${c.child_id}`); load(); }
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
