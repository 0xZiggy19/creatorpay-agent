import { NextResponse } from "next/server";
import { sendReminder } from "@/lib/paypal";


export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { subject, note } = (await req.json()) as { subject?: string; note?: string };
  if (!subject || !note) return NextResponse.json({ error: "subject and note required" }, { status: 400 });
  try {
    await sendReminder(id, subject, note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}
