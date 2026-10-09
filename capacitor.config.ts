import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL = 'https://finsage-ai-omega.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.finsage.ai',
  appName: 'FinSage AI',
  webDir: '.next/standalone',
  server: {
    // The app is a WebView client for the hosted Next.js application.
    // All auth, AI and data features are server-side /api routes, so the
    // WebView must load the production site rather than local static files.
    url: PRODUCTION_URL,
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
    },
  },
};

export default config;
