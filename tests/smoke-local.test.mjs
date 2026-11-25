import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

const baseUrl = process.env.LOOPEC_BASE_URL || "http://localhost:3000";

async function get(path) {
  const response = await fetch(new URL(path, baseUrl));
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return response;
}

test("public landing page is available", async () => {
  const response = await get("/");
  const html = await response.text();
  assert.match(html, /LOOPEC/);
  assert.match(html, /Find a little more|Good things/);
});

test("developer marketplace preview shows sample listings without a data error", async () => {
  const response = await get("/marketplace");
  const html = await response.text();
  assert.match(html, /Developer preview/);
  assert.match(html, /Scientific calculator/);
  assert.doesNotMatch(html, /Marketplace data is not available/);
});

test("developer marketplace preview search and filters narrow sample listings", async () => {
  const [searchResponse, categoryResponse, priceResponse] = await Promise.all([
    get("/marketplace?q=lamp"),
    get("/marketplace?category=demo-books"),
    get("/marketplace?min=400&max=500"),
  ]);
  const [searchHtml, categoryHtml, priceHtml] = await Promise.all([
    searchResponse.text(),
    categoryResponse.text(),
    priceResponse.text(),
  ]);

  assert.match(searchHtml, /LED study lamp/);
  assert.doesNotMatch(searchHtml, /Scientific calculator/);
  assert.match(categoryHtml, /Engineering mathematics textbooks/);
  assert.doesNotMatch(categoryHtml, /LED study lamp/);
  assert.match(priceHtml, /Engineering mathematics textbooks/);
  assert.doesNotMatch(priceHtml, /Scientific calculator|LED study lamp/);
});

test("developer marketplace preview honors ascending and descending price sorts", async () => {
  const [lowResponse, highResponse] = await Promise.all([
    get("/marketplace?sort=price_low"),
    get("/marketplace?sort=price_high"),
  ]);
  const [lowHtml, highHtml] = await Promise.all([lowResponse.text(), highResponse.text()]);
  const nameOrder = (html) => [
    html.indexOf("LED study lamp"),
    html.indexOf("Engineering mathematics textbooks"),
    html.indexOf("Scientific calculator"),
  ];
  const lowOrder = nameOrder(lowHtml);
  const highOrder = nameOrder(highHtml);

  assert.ok(lowOrder[0] >= 0 && lowOrder[0] < lowOrder[1] && lowOrder[1] < lowOrder[2]);
  assert.ok(highOrder[2] >= 0 && highOrder[2] < highOrder[1] && highOrder[1] < highOrder[0]);
});

test("sign-in page explains the college account flow", async () => {
  const response = await get("/auth/sign-in");
  const html = await response.text();
  assert.match(html, /Sign in to LOOPEC/);
  assert.match(html, /college email/i);
});

test("web manifest includes install-ready any and maskable icons", async () => {
  const response = await get("/manifest.webmanifest");
  const manifest = await response.json();
  assert.equal(manifest.short_name, "LOOPEC");
  assert.ok(manifest.icons.some((icon) => icon.purpose === "any" && icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable" && icon.sizes === "512x512"));
});

test("service worker caches only the offline fallback", async () => {
  const response = await get("/sw.js");
  const script = await response.text();
  assert.match(script, /cache\.add\(OFFLINE_PAGE\)/);
  assert.doesNotMatch(script, /cache\.put\(/);
});

test("offline fallback and PWA image assets are served", async () => {
  const [offline, icon192, icon512, maskable, apple] = await Promise.all([
    get("/offline.html"),
    get("/icon-192.png"),
    get("/icon-512.png"),
    get("/icon-maskable-512.png"),
    get("/apple-touch-icon.png"),
  ]);
  assert.match(await offline.text(), /You’re out of the loop/);
  for (const response of [icon192, icon512, maskable, apple]) {
    assert.match(response.headers.get("content-type") || "", /image\/png/);
  }
});

test("health check API responds cleanly", async () => {
  const response = await get("/api/health");
  const data = await response.json();
  assert.equal(data.status, "ok");
  assert.equal(typeof data.ts, "number");
  assert.equal(typeof data.services?.supabase, "boolean");
  assert.equal(typeof data.services?.firebase, "boolean");
});

test("federated search API handles queries and enforces auth or preview bypass", async () => {
  const response = await fetch(new URL("/api/search?q=calc", baseUrl));
  assert.ok([200, 401].includes(response.status), "search endpoint returns 200 (dev/auth) or 401");
  const data = await response.json();
  if (response.status === 200) {
    assert.ok(Array.isArray(data.results));
    assert.equal(typeof data.total, "number");
  }
});

test("removed Razorpay routes return 404", async () => {
  const responses = await Promise.all([
    fetch(new URL("/api/create-order", baseUrl), { method: "POST" }),
    fetch(new URL("/api/verify-payment", baseUrl), { method: "POST" }),
    fetch(new URL("/api/webhooks/razorpay", baseUrl), { method: "POST" }),
    fetch(new URL("/checkout/razorpay-demo", baseUrl)),
  ]);
  for (const res of responses) {
    assert.equal(res.status, 404);
  }
});

test("platform commission arithmetic and breakdown calculations", () => {
  const calculateCommission = (subtotal, percent = 5) => {
    const num = Math.max(0, Number(subtotal) || 0);
    const comm = Math.round(((num * percent) / 100) * 100) / 100;
    const net = Math.max(0, Math.round((num - comm) * 100) / 100);
    return { subtotal: num, commission: comm, sellerNet: net, total: num };
  };

  const c1 = calculateCommission(1000, 5);
  assert.equal(c1.commission, 50);
  assert.equal(c1.sellerNet, 950);
  assert.equal(c1.total, 1000);

  const c2 = calculateCommission(599, 5);
  assert.equal(c2.commission, 29.95);
  assert.equal(c2.sellerNet, 569.05);
});

test("deterministic campus handover PIN derivation", () => {
  const secret = "loopec-nitc-handover-salt-2026";
  const derivePin = (orderId) => {
    const hash = crypto.createHmac("sha256", secret).update(`handover-pin-${orderId}`).digest("hex");
    return ((parseInt(hash.slice(0, 8), 16) % 9000) + 1000).toString();
  };
  const pinA = derivePin("35b88dad-65f3-4cd6-b44d-c7d2fda7711a");
  const pinB = derivePin("35b88dad-65f3-4cd6-b44d-c7d2fda7711a");
  assert.match(pinA, /^\d{4}$/);
  assert.equal(pinA, pinB);
});

test("WhatsApp direct link and UPI intent URI format generator", () => {
  const formatWaNumber = (phone) => {
    const raw = (phone || "").replace(/\D/g, "");
    return raw.length === 10 ? `91${raw}` : raw;
  };

  assert.equal(formatWaNumber("9876543210"), "919876543210");
  assert.equal(formatWaNumber("+91 98765-43210"), "919876543210");

  const buildWaLink = (phone, text) => `https://wa.me/${formatWaNumber(phone)}?text=${encodeURIComponent(text)}`;
  const wa = buildWaLink("9876543210", "Hello Seller!");
  assert.match(wa, /^https:\/\/wa\.me\/919876543210\?text=Hello%20Seller!$/);

  const buildUpiLink = (upiId, name, amount, orderId) =>
    `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`LOOPEC Order ${orderId}`)}`;
  const upi = buildUpiLink("seller@okaxis", "Student Seller", 450, "ord123");
  assert.equal(upi, "upi://pay?pa=seller%40okaxis&pn=Student%20Seller&am=450&cu=INR&tn=LOOPEC%20Order%20ord123");
});
