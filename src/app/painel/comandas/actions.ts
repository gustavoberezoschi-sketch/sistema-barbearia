"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSessao, type Sessao } from "@/lib/auth";
import {
  ErroComanda,
  abrirComanda,
  adicionarProduto,
  adicionarServico,
  cancelarComanda,
  fecharComanda,
  removerItem,
} from "@/lib/comandas";
import { db } from "@/lib/db";
import { FORMAS_PAGAMENTO, lerDinheiro } from "@/lib/formato";
import type { Resultado } from "../actions";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

/** Garante que a comanda é da barbearia (e do barbeiro, se for um barbeiro logado). */
async function conferir(sessao: Sessao, comandaId: string) {
  const comanda = await db.comanda.findFirst({
    where: { id: comandaId, barbeariaId: sessao.barbeariaId, ...(sessao.barbeiroId ? { barbeiroId: sessao.barbeiroId } : {}) },
  });
  if (!comanda) throw new ErroComanda("Comanda não encontrada.");
  return comanda;
}

async function tentar(fn: () => Promise<unknown>, ok?: string): Promise<Resultado> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ErroComanda) return { erro: e.message };
    throw e;
  }
  revalidatePath("/painel", "layout");
  return ok ? { ok } : null;
}

export async function novaComanda(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  const clienteId = texto(form, "clienteId") || null;
  const barbeiroId = sessao.barbeiroId ?? (texto(form, "barbeiroId") || null);
  if (clienteId && !(await db.cliente.findFirst({ where: { id: clienteId, barbeariaId: sessao.barbeariaId } })))
    return { erro: "Cliente não encontrado." };
  if (barbeiroId && !(await db.barbeiro.findFirst({ where: { id: barbeiroId, barbeariaId: sessao.barbeariaId } })))
    return { erro: "Barbeiro não encontrado." };
  const comanda = await abrirComanda({ barbeariaId: sessao.barbeariaId, clienteId, barbeiroId });
  redirect(`/painel/comandas/${comanda.id}`);
}

export async function incluirServico(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  return tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    await adicionarServico(sessao.barbeariaId, c.id, texto(form, "servicoId"), sessao.barbeiroId ?? (texto(form, "barbeiroId") || null));
  });
}

export async function incluirProduto(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  return tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    await adicionarProduto(
      sessao.barbeariaId,
      c.id,
      texto(form, "produtoId"),
      Number(texto(form, "quantidade") || 1),
      sessao.barbeiroId ?? (texto(form, "barbeiroId") || null),
    );
  });
}

export async function excluirItem(form: FormData) {
  const sessao = await exigirSessao();
  await tentar(async () => {
    await conferir(sessao, texto(form, "comandaId"));
    await removerItem(sessao.barbeariaId, texto(form, "itemId"));
  });
}

export async function finalizarComanda(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  const forma = texto(form, "formaPagamento");
  const desconto = texto(form, "desconto") ? lerDinheiro(texto(form, "desconto")) : 0;
  if (!(forma in FORMAS_PAGAMENTO)) return { erro: "Escolha a forma de pagamento." };
  if (desconto === null) return { erro: "Desconto inválido. Exemplo: 5,00" };
  return tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    await fecharComanda(sessao.barbeariaId, c.id, {
      formaPagamento: forma,
      descontoCentavos: desconto,
      usarCashback: form.get("usarCashback") === "on",
    });
  }, "Comanda fechada.");
}

export async function estornarComanda(form: FormData) {
  const sessao = await exigirSessao();
  if (sessao.papel === "BARBEIRO") return;
  await tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    await cancelarComanda(sessao.barbeariaId, c.id);
  });
  redirect("/painel/comandas");
}
