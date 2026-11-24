import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.loopec.campus",
  appName: "LOOPEC",
  webDir: "public",
  appendUserAgent: "LOOPEC-App",
  server: {
    // Primary production endpoint on Vercel
    url: process.env.CAPACITOR_SERVER_URL || "https://loopec-2w2s.vercel.app",
    cleartext: true,
    androidScheme: "https",
    // Keep all campus processes, authentication, payments, and custom domains strictly inside the app WebView
    allowNavigation: [
      "loopec-2w2s.vercel.app",
      "loopec-2w2s-the-restarters.vercel.app",
      "loopec.in",
      "www.loopec.in",
      "*.vercel.app",
      "*.supabase.co",
      "*.razorpay.com",
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
    backgroundColor: "#eee9e2",
    appendUserAgent: "LOOPEC-App",
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
    appendUserAgent: "LOOPEC-App",
  },
};

export default config;
