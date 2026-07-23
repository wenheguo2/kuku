/**
 * StateView — U-03/04/05 通用状态视图（加载 / 空 / 错误+重试）
 * 用法：<StateView loading={l} error={e} empty={list.length===0} emptyText="暂无收藏" onRetry={load}>{内容}</StateView>
 * 统一各页的加载态/空态/错误态呈现，替代各处零散的内联判断。
 */
import { PropsWithChildren } from 'react';
import { View, Text } from '@tarojs/components';
import Icon, { IconName } from '@/components/Icon';
import './index.scss';

interface Props {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  loadingText?: string;
  emptyText?: string;
  emptyIcon?: IconName;
  errorText?: string;
  onRetry?: () => void;
}

export default function StateView({
  loading,
  error,
  empty,
  loadingText = '加载中…',
  emptyText = '这里空空的～',
  emptyIcon = 'book',
  errorText = '出错了，点击重试',
  onRetry,
  children,
}: PropsWithChildren<Props>) {
  if (loading) {
    return (
      <View className="state-view">
        <View className="state-spinner" />
        <Text className="state-text">{loadingText}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="state-view">
        <View className="state-icon"><Icon name="refresh" size={56} color="var(--color-text-secondary)" /></View>
        <Text className="state-text">{errorText}</Text>
        {onRetry && <View className="state-btn" onClick={onRetry}>重试</View>}
      </View>
    );
  }
  if (empty) {
    return (
      <View className="state-view">
        <View className="state-icon"><Icon name={emptyIcon} size={56} color="var(--color-text-secondary)" /></View>
        <Text className="state-text">{emptyText}</Text>
      </View>
    );
  }
  return <>{children}</>;
}
