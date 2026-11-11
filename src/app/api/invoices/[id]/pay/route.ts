import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/paypal";


/** Demo helper: records an external payment on the invoice (PayPal "record payment" endpoint). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ invoice: await recordPayment(id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}
