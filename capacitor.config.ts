import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.loopec.campus",
  appName: "LOOPEC",
  webDir: "public",
  server: {
    // When packaged as an Android APK or iOS app, points to your hosted web app.
    // In local dev on physical devices or emulators, this can be set via CAPACITOR_SERVER_URL.
    url: process.env.CAPACITOR_SERVER_URL || "https://loopec-2w2s-the-restarters.vercel.app",
    cleartext: true,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
