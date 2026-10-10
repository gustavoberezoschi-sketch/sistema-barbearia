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
import { ErroAsaas } from "@/lib/asaas";
import { db } from "@/lib/db";
import { ErroExtra, lancarNaFatura, retirarDaFatura } from "@/lib/extrasFatura";
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
    if (e instanceof ErroComanda || e instanceof ErroExtra || e instanceof ErroAsaas) return { erro: e.message };
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
  const barbeiro = barbeiroId ? await db.barbeiro.findFirst({ where: { id: barbeiroId, barbeariaId: sessao.barbeariaId } }) : null;
  if (barbeiroId && !barbeiro) return { erro: "Barbeiro não encontrado." };
  const filial = await db.filial.findFirst({
    where: { barbeariaId: sessao.barbeariaId, id: barbeiro?.filialId ?? (texto(form, "filialId") || "-") },
  });
  if (!filial) return { erro: "Escolha a unidade." };
  const comanda = await abrirComanda({ barbeariaId: sessao.barbeariaId, filialId: filial.id, clienteId, barbeiroId });
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
  if (!(forma in FORMAS_PAGAMENTO) && forma !== "FATURA") return { erro: "Escolha a forma de pagamento." };
  if (desconto === null) return { erro: "Desconto inválido. Exemplo: 5,00" };
  let comandaId = "";
  const r = await tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    comandaId = c.id;
    await fecharComanda(sessao.barbeariaId, c.id, {
      formaPagamento: forma,
      descontoCentavos: desconto,
      usarCashback: form.get("usarCashback") === "on",
    });
  }, "Comanda fechada.");
  if (forma !== "FATURA" || r?.erro) return r;
  const extra = await db.extraFatura.findUnique({ where: { comandaId } });
  if (!extra) return r;
  const lancado = await tentar(() => lancarNaFatura(extra.id), "Comanda fechada e lançada na próxima fatura do cliente.");
  if (lancado?.erro) return { erro: `Comanda fechada, mas não deu para lançar na fatura agora: ${lancado.erro} Use "Lançar na fatura" para tentar de novo.` };
  return lancado;
}

/** Tenta de novo lançar no Asaas um extra que falhou. */
export async function relancarExtra(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  return tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    const extra = await db.extraFatura.findUnique({ where: { comandaId: c.id } });
    if (!extra) throw new ErroComanda("Essa comanda não foi para a fatura.");
    await lancarNaFatura(extra.id);
  }, "Lançado na próxima fatura do cliente.");
}

/** Cancela uma comanda fechada; se ela foi para a fatura do clube, tira o valor da cobrança antes. */
export async function estornarFechada(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  if (sessao.papel === "BARBEIRO") return { erro: "Só o dono ou gerente pode estornar." };
  const r = await tentar(async () => {
    const c = await conferir(sessao, texto(form, "comandaId"));
    await retirarDaFatura(c.id);
    await cancelarComanda(sessao.barbeariaId, c.id);
  });
  if (r?.erro) return r;
  redirect("/painel/comandas");
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
