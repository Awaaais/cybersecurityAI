import { handleChatGET, handleChatPOST } from "../../lib/ai/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health check: is the configured local model reachable and installed? */
export async function GET() {
  return handleChatGET();
}

export async function POST(request: Request) {
  return handleChatPOST(request);
}
