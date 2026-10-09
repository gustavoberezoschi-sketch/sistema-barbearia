import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PLANOS_SISTEMA } from "@/lib/planosSistema";
import { Apresentacao } from "./Apresentacao";

export const metadata: Metadata = {
  title: "Apresentação",
  description: "Conheça o KlarezaBarber: agenda online, clube de assinatura, comandas, caixa e financeiro para barbearias.",
};
export const dynamic = "force-dynamic";

/** Apresentação animada para mostrar o sistema às barbearias. Use ?para=Nome da Barbearia para personalizar. */
export default async function PaginaApresentacao({ searchParams }: { searchParams: Promise<{ para?: string; video?: string }> }) {
  const { para, video } = await searchParams;
  const config = await db.configSistema.findUnique({ where: { id: "geral" } }).catch(() => null);
  const planos = Object.values(PLANOS_SISTEMA).map((p) => ({ ...p }));
  return <Apresentacao para={para?.trim().slice(0, 60) || null} whatsapp={config?.whatsappSuporte ?? null} planos={planos} video={video === "1"} />;
}
