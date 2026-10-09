"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/lib/auth";
import { db } from "@/lib/db";
import { lerDinheiro } from "@/lib/formato";
import type { Resultado } from "../actions";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export async function salvarProduto(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirGestor();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const preco = lerDinheiro(texto(form, "preco"));
  const custo = lerDinheiro(texto(form, "custo") || "0");
  const estoqueMinimo = Number(texto(form, "estoqueMinimo") || 0);
  if (!nome) return { erro: "Informe o nome do produto." };
  if (preco === null || custo === null) return { erro: "Preço ou custo inválido. Exemplo: 45,00" };
  if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) return { erro: "Estoque mínimo inválido." };
  const dados = { nome, categoria: texto(form, "categoria") || "Geral", precoCentavos: preco, custoCentavos: custo, estoqueMinimo };

  if (id) {
    const r = await db.produto.updateMany({ where: { id, barbeariaId }, data: dados });
    if (r.count === 0) return { erro: "Produto não encontrado." };
    revalidatePath("/painel", "layout");
    return { ok: "Produto salvo." };
  }
  const inicial = Number(texto(form, "estoqueInicial") || 0);
  if (!Number.isInteger(inicial) || inicial < 0) return { erro: "Estoque inicial inválido." };
  const produto = await db.produto.create({ data: { ...dados, barbeariaId, estoque: inicial } });
  if (inicial > 0)
    await db.movimentoEstoque.create({ data: { produtoId: produto.id, quantidade: inicial, tipo: "ENTRADA", observacao: "Estoque inicial" } });
  revalidatePath("/painel", "layout");
  redirect("/painel/produtos");
}

export async function movimentarEstoque(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirGestor();
  const produto = await db.produto.findFirst({ where: { id: texto(form, "id"), barbeariaId } });
  if (!produto) return { erro: "Produto não encontrado." };
  const tipo = texto(form, "tipo");
  const qtd = Number(texto(form, "quantidade"));
  if (!Number.isInteger(qtd) || qtd === 0) return { erro: "Informe a quantidade." };

  let delta = qtd;
  if (tipo === "ENTRADA") delta = Math.abs(qtd);
  else if (tipo === "SAIDA") delta = -Math.abs(qtd);
  else if (tipo === "AJUSTE") delta = qtd - produto.estoque; // quantidade contada
  else return { erro: "Tipo inválido." };

  await db.$transaction([
    db.produto.update({ where: { id: produto.id }, data: { estoque: { increment: delta } } }),
    db.movimentoEstoque.create({
      data: {
        produtoId: produto.id,
        quantidade: delta,
        tipo: tipo === "SAIDA" ? "AJUSTE" : tipo,
        observacao: texto(form, "observacao") || (tipo === "AJUSTE" ? `Contagem: ${qtd}` : null),
      },
    }),
  ]);
  revalidatePath("/painel", "layout");
  return { ok: "Estoque atualizado." };
}

export async function alternarProduto(form: FormData) {
  const { barbeariaId } = await exigirGestor();
  const p = await db.produto.findFirst({ where: { id: texto(form, "id"), barbeariaId } });
  if (p) await db.produto.update({ where: { id: p.id }, data: { ativo: !p.ativo } });
  revalidatePath("/painel", "layout");
}
