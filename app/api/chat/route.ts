// Alias route. TeKAI's chat endpoint is implemented once in
// app/lib/ai/handler.ts; both /api/chat and /api/tekai serve it.
// NOTE: runtime/dynamic must be declared locally (Next.js forbids re-exporting them).
import { handleChatGET, handleChatPOST } from "../../lib/ai/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleChatGET();
}

export async function POST(request: Request) {
  return handleChatPOST(request);
}
