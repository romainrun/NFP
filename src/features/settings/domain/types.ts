export type ThemePreference = 'system' | 'light' | 'dark';

export type AppSettings = {
  storeName: string;
  themePreference: ThemePreference;
  idleLogoutMinutes: number;
};
