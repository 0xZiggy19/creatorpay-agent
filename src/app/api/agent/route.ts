import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };
    if (!Array.isArray(messages) || !messages.length) return NextResponse.json({ error: "messages required" }, { status: 400 });
    return NextResponse.json(await runAgent(messages.slice(-12)));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Agent error" }, { status: 500 });
  }
}
