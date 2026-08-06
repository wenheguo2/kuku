export type AppRoute =
  | { name: 'free-zone'; tab?: 'story' | 'song' }
  | { name: 'search'; scope: 'story' | 'song' | 'growth' }
  | { name: 'favorites'; tab?: 'story' | 'song' }
  | { name: 'history' }
  | { name: 'children' }
  | { name: 'settings' }
  | { name: 'membership' }
  | { name: 'lessons'; subject: '识字' | '英语' }
  | { name: 'collection' }
  | { name: 'challenge'; subject: '识字' | '英语'; lesson?: { id: string; text: string; path: string; seq: number } };

export type Navigate = (route: AppRoute) => void;
