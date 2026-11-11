import { NextResponse, connection } from "next/server";
import { paypalMode } from "@/lib/paypal";
import { getModel } from "@/lib/ai";


export async function GET() {
  await connection();
  const m = getModel();
  return NextResponse.json({ paypalMode: paypalMode(), aiProvider: m?.provider ?? null, aiModel: m?.modelId ?? null });
}
