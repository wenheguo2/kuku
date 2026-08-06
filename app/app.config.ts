import type { ConfigContext, ExpoConfig } from 'expo/config';

const release = process.env.EXPO_PUBLIC_APP_RELEASE === 'true';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const staticBaseUrl = process.env.EXPO_PUBLIC_STATIC_BASE_URL ?? 'http://localhost:3000/static';

if (release) {
  const errors: string[] = [];
  if (!apiBaseUrl.startsWith('https://') || apiBaseUrl.includes('example.com')) errors.push('API 必须是真实 HTTPS 地址');
  if (!staticBaseUrl.startsWith('https://') || staticBaseUrl.includes('example.com')) errors.push('静态资源必须是真实 HTTPS 地址');
  if (process.env.EXPO_PUBLIC_AGREEMENTS_FINAL !== 'true') errors.push('协议尚未定稿');
  for (const key of ['EXPO_PUBLIC_USER_AGREEMENT_VERSION', 'EXPO_PUBLIC_PRIVACY_VERSION', 'EXPO_PUBLIC_CHILDREN_PRIVACY_VERSION']) {
    const value = process.env[key] ?? '';
    if (!value || value.toLowerCase().includes('draft')) errors.push(`${key} 必须是正式版本`);
  }
  if (errors.length) throw new Error(`App release 配置校验失败：${errors.join('；')}`);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '酷酷儿童故事',
  slug: 'kuku-stories-app',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  scheme: 'kukustory',
  ios: {
    bundleIdentifier: 'com.kukustory.app',
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: 'com.kukustory.app',
    versionCode: 1,
    adaptiveIcon: { backgroundColor: '#FFF3E8' },
  },
  plugins: [
    ['expo-audio', { enableBackgroundPlayback: true, enableBackgroundRecording: false, recordAudioAndroid: false, microphonePermission: false }],
    ['expo-secure-store', { configureAndroidBackup: true, faceIDPermission: false }],
  ],
  extra: { client: 'native-app', release },
});
