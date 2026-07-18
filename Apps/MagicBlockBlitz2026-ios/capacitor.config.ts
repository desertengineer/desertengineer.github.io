import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bekeiratapps.magicblockblitz2026',
  appName: 'Magic Block Blitz 2026',
  webDir: 'www',
  bundledWebRuntime: false,

  ios: {
    contentInset: 'automatic'
  }
};

export default config;