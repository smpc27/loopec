import "server-only";

import { checkBotId } from "botid/server";

/**
 * Verifies the current Server Action / API request via Vercel BotID when running
 * on Vercel production. Fails open with a warning if BotID Firewall / OIDC isn't
 * active yet, while blocking confirmed automated bots.
 */
export async function verifyHumanRequest(): Promise<{ allowed: boolean; isBot: boolean }> {
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
    return { allowed: true, isBot: false };
  }

  try {
    const verification = await checkBotId();
    if (verification.isBot && !verification.isVerifiedBot && !verification.bypassed) {
      return { allowed: false, isBot: true };
    }
    return { allowed: true, isBot: false };
  } catch (err) {
    console.warn("[botid] Verification skipped:", err instanceof Error ? err.message : err);
    return { allowed: true, isBot: false };
  }
}
