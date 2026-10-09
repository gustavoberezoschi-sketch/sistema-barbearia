"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/lib/auth";
import { caixaAberto } from "@/lib/caixa";
import { db } from "@/lib/db";
import { filialDoPainel } from "@/lib/filial";
import { FORMAS_PAGAMENTO, lerDinheiro } from "@/lib/formato";
import { diaLocal, somarMeses } from "@/lib/tempo";
import type { Resultado } from "../actions";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export async function salvarPlano(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirGestor();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const preco = lerDinheiro(texto(form, "preco"));
  const usos = texto(form, "usos") ? Number(texto(form, "usos")) : null;
  const servicoIds = form.getAll("servicos").map(String);
  if (!nome) return { erro: "Informe o nome do plano." };
  if (!preco) return { erro: "Informe a mensalidade. Exemplo: 99,90" };
  if (usos !== null && (!Number.isInteger(usos) || usos < 1)) return { erro: "Usos por mês inválido." };
  const servicos = await db.servico.findMany({ where: { barbeariaId, id: { in: servicoIds } }, select: { id: true } });
  if (servicos.length === 0) return { erro: "Marque pelo menos um serviço incluso no plano." };

  const dados = { nome, descricao: texto(form, "descricao") || null, precoCentavos: preco, usosPorMes: usos, exibirOnline: form.get("exibirOnline") === "on" };
  if (id) {
    if (!(await db.plano.findFirst({ where: { id, barbeariaId } }))) return { erro: "Plano não encontrado." };
    await db.plano.update({ where: { id }, data: { ...dados, servicos: { set: servicos } } });
  } else {
    await db.plano.create({ data: { ...dados, barbeariaId, servicos: { connect: servicos } } });
  }
  revalidatePath("/painel", "layout");
  redirect("/painel/assinaturas");
}

export async function alternarPlano(form: FormData) {
  const { barbeariaId } = await exigirGestor();
  const p = await db.plano.findFirst({ where: { id: texto(form, "id"), barbeariaId } });
  if (p) await db.plano.update({ where: { id: p.id }, data: { ativo: !p.ativo } });
  revalidatePath("/painel", "layout");
}

/** Registra a mensalidade; entra no caixa aberto da unidade escolhida no painel (se houver). */
async function registrar(assinaturaId: string, valor: number, forma: string, barbeariaId: string) {
  const { atual } = await filialDoPainel(await exigirGestor());
  const caixa = atual ? await caixaAberto(barbeariaId, atual.id) : null;
  await db.pagamentoAssinatura.create({ data: { assinaturaId, valorCentavos: valor, formaPagamento: forma, caixaId: caixa?.id ?? null } });
}

export async function novaAssinatura(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirGestor();
  const [cliente, plano] = await Promise.all([
    db.cliente.findFirst({ where: { id: texto(form, "clienteId"), barbeariaId } }),
    db.plano.findFirst({ where: { id: texto(form, "planoId"), barbeariaId, ativo: true } }),
  ]);
  const forma = texto(form, "formaPagamento");
  if (!cliente) return { erro: "Escolha o cliente." };
  if (!plano) return { erro: "Escolha o plano." };
  if (!(forma in FORMAS_PAGAMENTO)) return { erro: "Escolha a forma de pagamento." };
  if (await db.assinatura.findFirst({ where: { clienteId: cliente.id, status: "ATIVA" } }))
    return { erro: `${cliente.nome} já tem uma assinatura ativa.` };

  const hoje = diaLocal();
  const assinatura = await db.assinatura.create({
    data: { barbeariaId, clienteId: cliente.id, planoId: plano.id, pagoAte: somarMeses(hoje, 1) },
  });
  await registrar(assinatura.id, plano.precoCentavos, forma, barbeariaId);
  revalidatePath("/painel", "layout");
  return { ok: `${cliente.nome} agora é assinante do ${plano.nome}. Primeira mensalidade registrada.` };
}

export async function pagarMensalidade(form: FormData) {
  const { barbeariaId } = await exigirGestor();
  const a = await db.assinatura.findFirst({ where: { id: texto(form, "id"), barbeariaId, status: "ATIVA" }, include: { plano: true } });
  const forma = texto(form, "formaPagamento");
  if (!a || !(forma in FORMAS_PAGAMENTO)) return;
  const base = a.pagoAte > diaLocal() ? a.pagoAte : diaLocal();
  await db.assinatura.update({ where: { id: a.id }, data: { pagoAte: somarMeses(base, 1) } });
  await registrar(a.id, a.plano.precoCentavos, forma, barbeariaId);
  revalidatePath("/painel", "layout");
}

export async function cancelarAssinatura(form: FormData) {
  const { barbeariaId } = await exigirGestor();
  await db.assinatura.updateMany({ where: { id: texto(form, "id"), barbeariaId }, data: { status: "CANCELADA" } });
  revalidatePath("/painel", "layout");
}
