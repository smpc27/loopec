import { initBotId } from "botid/client/core";

try {
  initBotId({
    protect: [
      { path: "/listings/new", method: "POST" },
      { path: "/checkout", method: "POST" },
      { path: "/feedback", method: "POST" },
      { path: "/auth/sign-in", method: "POST" },
      { path: "/auth/sign-up", method: "POST" },
      { path: "/auth/forgot-password", method: "POST" },
    ],
  });
} catch {
  // Never block client interactivity if BotID fails to initialize
}
