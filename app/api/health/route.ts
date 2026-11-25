export async function GET() {
  return Response.json({ status: "ok", ts: Date.now(), env: process.env.NODE_ENV });
}
