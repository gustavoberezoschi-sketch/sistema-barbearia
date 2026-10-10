import { NextResponse } from "next/server";
import { limparVariavel } from "@/lib/env";
import { enviarLembretesDeAmanha } from "@/lib/push";

export const dynamic = "force-dynamic";

// Chamado pela Vercel todo dia às 18h de Brasília (vercel.json → crons).
// Se CRON_SECRET estiver configurada, a Vercel manda "Authorization: Bearer <CRON_SECRET>".
// Sem ela a rota continua segura de repetir: cada atendimento recebe o lembrete uma vez só.
export async function GET(req: Request) {
  const segredo = limparVariavel(process.env.CRON_SECRET);
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const r = await enviarLembretesDeAmanha();
  return NextResponse.json({ ok: true, ...r });
}
