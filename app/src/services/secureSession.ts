import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'kuku_app_token';
const INSTALLATION_KEY = 'kuku_app_installation_id';
const CHILD_KEY = 'kuku_app_child_id';

const webStore = {
  get: async (key: string) => typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
  set: async (key: string, value: string) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); },
  remove: async (key: string) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); },
};

const getItem = (key: string) => Platform.OS === 'web' ? webStore.get(key) : SecureStore.getItemAsync(key);
const setItem = (key: string, value: string) => Platform.OS === 'web' ? webStore.set(key, value) : SecureStore.setItemAsync(key, value);
const removeItem = (key: string) => Platform.OS === 'web' ? webStore.remove(key) : SecureStore.deleteItemAsync(key);

function bytesToUuid(bytes: Uint8Array): string {
  const value = new Uint8Array(bytes);
  value[6] = ((value[6] ?? 0) & 0x0f) | 0x40;
  value[8] = ((value[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(value, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const secureSession = {
  token: () => getItem(TOKEN_KEY),
  childId: () => getItem(CHILD_KEY),
  async installationId(): Promise<string> {
    const existing = await getItem(INSTALLATION_KEY);
    if (existing) return existing;
    const created = bytesToUuid(Crypto.getRandomBytes(16));
    await setItem(INSTALLATION_KEY, created);
    return created;
  },
  async save(token: string, childId: string): Promise<void> {
    await Promise.all([
      setItem(TOKEN_KEY, token),
      setItem(CHILD_KEY, childId),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([
      removeItem(TOKEN_KEY),
      removeItem(CHILD_KEY),
    ]);
  },
};
