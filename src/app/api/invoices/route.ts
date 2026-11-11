import { NextResponse, connection } from "next/server";
import { z } from "zod";
import { createAndSendInvoice, listInvoices, paypalMode } from "@/lib/paypal";


const draftSchema = z.object({
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
  businessName: z.string().optional(),
  currency: z.string().length(3),
  items: z.array(z.object({ name: z.string().min(1), description: z.string().optional(), quantity: z.number().positive(), unitAmount: z.number().nonnegative() })).min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
  memo: z.string().optional(),
});

export async function GET() {
  await connection();
  try {
    return NextResponse.json({ mode: paypalMode(), invoices: await listInvoices() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const parsed = draftSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  try {
    return NextResponse.json({ invoice: await createAndSendInvoice(parsed.data) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}
