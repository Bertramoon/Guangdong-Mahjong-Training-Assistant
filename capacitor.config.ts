import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bertramoon.mahjong',
  appName: '广东麻将训练助手',
  webDir: 'dist',
  android: { allowMixedContent: true },
  plugins: {
    CapacitorHttp: { enabled: true },
    SystemBars: { insetsHandling: 'disable' },
  },
};

export default config;
