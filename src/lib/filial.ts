import { cookies } from "next/headers";
import type { Sessao } from "./auth";
import { db } from "./db";

const nomeCookie = (barbeariaId: string) => `filial_${barbeariaId}`;

export type ContextoFilial = {
  filiais: { id: string; nome: string; endereco: string | null; ativo: boolean }[];
  /** Unidade escolhida no painel; null = "Todas as unidades". */
  atual: { id: string; nome: string } | null;
};

/**
 * Unidade em que o painel está trabalhando. Com uma unidade só, é sempre ela.
 * O barbeiro fica preso à unidade dele.
 */
export async function filialDoPainel(sessao: Sessao): Promise<ContextoFilial> {
  const filiais = await db.filial.findMany({
    where: { barbeariaId: sessao.barbeariaId },
    orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { criadoEm: "asc" }],
    select: { id: true, nome: true, endereco: true, ativo: true },
  });
  const ativas = filiais.filter((f) => f.ativo);

  if (sessao.barbeiroId) {
    const b = await db.barbeiro.findUnique({ where: { id: sessao.barbeiroId }, select: { filialId: true } });
    return { filiais, atual: filiais.find((f) => f.id === b?.filialId) ?? null };
  }
  if (ativas.length <= 1) return { filiais, atual: ativas[0] ?? filiais[0] ?? null };

  const escolhida = (await cookies()).get(nomeCookie(sessao.barbeariaId))?.value;
  return { filiais, atual: ativas.find((f) => f.id === escolhida) ?? null };
}

export async function escolherFilial(barbeariaId: string, filialId: string | null) {
  const c = await cookies();
  if (filialId) c.set(nomeCookie(barbeariaId), filialId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 365 * 86400 });
  else c.delete(nomeCookie(barbeariaId));
}

/** Filtro Prisma para registros que têm filialId (agendamentos, comandas, barbeiros...). */
export function naFilial(ctx: ContextoFilial) {
  return ctx.atual ? { filialId: ctx.atual.id } : {};
}

/** Primeira unidade ativa (para cadastros que precisam de uma). */
export async function filialPadrao(barbeariaId: string) {
  return db.filial.findFirstOrThrow({ where: { barbeariaId }, orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { criadoEm: "asc" }] });
}
