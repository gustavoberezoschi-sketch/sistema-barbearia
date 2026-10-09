import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { diaLocal, limitesDoMes, criarDataHora, somarDias } from "./tempo";

type Tx = Prisma.TransactionClient;

export class ErroComanda extends Error {}

/** Assinatura ativa e em dia do cliente, se houver. */
export async function assinaturaVigente(clienteId: string, tx: Tx | typeof db = db) {
  return tx.assinatura.findFirst({
    where: { clienteId, status: "ATIVA", pagoAte: { gte: diaLocal() } },
    include: { plano: { include: { servicos: { select: { id: true } } } } },
  });
}

/** Quantos serviços o cliente já usou do plano no mês atual. */
export async function usosDoPlanoNoMes(clienteId: string, tx: Tx | typeof db = db) {
  const { inicio, fim } = limitesDoMes(diaLocal());
  return tx.comandaItem.count({
    where: {
      cobertoPorPlano: true,
      comanda: {
        clienteId,
        status: { not: "CANCELADA" },
        abertaEm: { gte: criarDataHora(inicio, "00:00"), lt: criarDataHora(somarDias(fim, 1), "00:00") },
      },
    },
  });
}

/** Monta o item de serviço já com comissão e cobertura do plano do cliente. */
async function montarItemServico(tx: Tx, comandaId: string, servicoId: string, barbeiroId: string | null, clienteId: string | null) {
  const servico = await tx.servico.findUniqueOrThrow({ where: { id: servicoId } });
  const barbeiro = barbeiroId ? await tx.barbeiro.findUnique({ where: { id: barbeiroId } }) : null;

  let cobertoPorPlano = false;
  if (clienteId) {
    const assinatura = await assinaturaVigente(clienteId, tx);
    if (assinatura && assinatura.plano.servicos.some((s) => s.id === servicoId)) {
      const limite = assinatura.plano.usosPorMes;
      cobertoPorPlano = limite === null || (await usosDoPlanoNoMes(clienteId, tx)) < limite;
    }
  }

  return tx.comandaItem.create({
    data: {
      comandaId,
      tipo: "SERVICO",
      servicoId,
      barbeiroId,
      descricao: servico.nome,
      precoUnitCentavos: servico.precoCentavos,
      comissaoPct: servico.comissaoPct ?? barbeiro?.comissaoPct ?? 0,
      cobertoPorPlano,
    },
  });
}

/** Abre uma comanda (opcionalmente a partir de um agendamento, já com o serviço). */
export async function abrirComanda(params: {
  barbeariaId: string;
  filialId?: string | null; // obrigatório quando não vem de um agendamento
  clienteId?: string | null;
  barbeiroId?: string | null;
  agendamentoId?: string | null;
}) {
  return db.$transaction(async (tx) => {
    let { clienteId = null, barbeiroId = null, filialId = null } = params;
    let servicos: { servicoId: string; barbeiroId: string }[] = [];

    if (params.agendamentoId) {
      const ag = await tx.agendamento.findFirstOrThrow({
        where: { id: params.agendamentoId, barbeariaId: params.barbeariaId },
      });
      // Vários serviços agendados juntos (grupo) viram uma comanda só.
      const existente = await tx.comanda.findFirst({
        where: {
          status: { not: "CANCELADA" },
          ...(ag.grupo ? { agendamento: { grupo: ag.grupo } } : { agendamentoId: ag.id }),
        },
      });
      if (existente) return existente;
      const doGrupo = ag.grupo
        ? await tx.agendamento.findMany({ where: { grupo: ag.grupo, status: { not: "CANCELADO" } }, orderBy: { inicio: "asc" } })
        : [ag];
      clienteId = ag.clienteId;
      barbeiroId = ag.barbeiroId;
      filialId = ag.filialId;
      servicos = doGrupo.map((a) => ({ servicoId: a.servicoId, barbeiroId: a.barbeiroId }));
    }

    if (!filialId && barbeiroId) filialId = (await tx.barbeiro.findUnique({ where: { id: barbeiroId } }))?.filialId ?? null;
    if (!filialId) throw new ErroComanda("Escolha a unidade da comanda.");
    const caixa = await tx.caixa.findFirst({ where: { filialId, fechadoEm: null } });
    const comanda = await tx.comanda.create({
      data: {
        barbeariaId: params.barbeariaId,
        filialId,
        clienteId,
        barbeiroId,
        agendamentoId: params.agendamentoId ?? null,
        caixaId: caixa?.id ?? null,
      },
    });
    for (const item of servicos) await montarItemServico(tx, comanda.id, item.servicoId, item.barbeiroId, clienteId);
    return comanda;
  });
}

async function comandaAberta(tx: Tx, barbeariaId: string, comandaId: string) {
  const comanda = await tx.comanda.findFirst({ where: { id: comandaId, barbeariaId } });
  if (!comanda) throw new ErroComanda("Comanda não encontrada.");
  if (comanda.status !== "ABERTA") throw new ErroComanda("Essa comanda já foi fechada.");
  return comanda;
}

export async function adicionarServico(barbeariaId: string, comandaId: string, servicoId: string, barbeiroId: string | null) {
  return db.$transaction(async (tx) => {
    const comanda = await comandaAberta(tx, barbeariaId, comandaId);
    const servico = await tx.servico.findFirst({ where: { id: servicoId, barbeariaId } });
    if (!servico) throw new ErroComanda("Serviço não encontrado.");
    return montarItemServico(tx, comanda.id, servicoId, barbeiroId ?? comanda.barbeiroId, comanda.clienteId);
  });
}

export async function adicionarProduto(
  barbeariaId: string,
  comandaId: string,
  produtoId: string,
  quantidade: number,
  barbeiroId: string | null,
) {
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new ErroComanda("Quantidade inválida.");
  return db.$transaction(async (tx) => {
    const comanda = await comandaAberta(tx, barbeariaId, comandaId);
    const produto = await tx.produto.findFirst({ where: { id: produtoId, barbeariaId, ativo: true } });
    if (!produto) throw new ErroComanda("Produto não encontrado.");
    const vendedorId = barbeiroId ?? comanda.barbeiroId;
    const vendedor = vendedorId ? await tx.barbeiro.findUnique({ where: { id: vendedorId } }) : null;
    return tx.comandaItem.create({
      data: {
        comandaId,
        tipo: "PRODUTO",
        produtoId,
        barbeiroId: vendedorId,
        descricao: produto.nome,
        quantidade,
        precoUnitCentavos: produto.precoCentavos,
        comissaoPct: vendedor?.comissaoProdutoPct ?? 0,
      },
    });
  });
}

export async function removerItem(barbeariaId: string, itemId: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.comandaItem.findFirst({ where: { id: itemId, comanda: { barbeariaId } } });
    if (!item) throw new ErroComanda("Item não encontrado.");
    await comandaAberta(tx, barbeariaId, item.comandaId);
    await tx.comandaItem.delete({ where: { id: itemId } });
  });
}

/** O agendamento da comanda e os outros do mesmo grupo (vários serviços agendados juntos). */
async function filtroDoAtendimento(tx: Tx, agendamentoId: string) {
  const ag = await tx.agendamento.findUniqueOrThrow({ where: { id: agendamentoId }, select: { id: true, grupo: true } });
  return ag.grupo ? { grupo: ag.grupo, status: { not: "CANCELADO" } } : { id: ag.id };
}

export function subtotalDosItens(itens: { quantidade: number; precoUnitCentavos: number; cobertoPorPlano: boolean }[]) {
  return itens.reduce((s, i) => s + (i.cobertoPorPlano ? 0 : i.quantidade * i.precoUnitCentavos), 0);
}

/** Fecha a comanda: aplica desconto e cashback, baixa estoque e conclui o agendamento. */
export async function fecharComanda(
  barbeariaId: string,
  comandaId: string,
  opcoes: { formaPagamento: string; descontoCentavos: number; usarCashback: boolean },
) {
  return db.$transaction(async (tx) => {
    const comanda = await comandaAberta(tx, barbeariaId, comandaId);
    const [itens, barbearia, cliente] = await Promise.all([
      tx.comandaItem.findMany({ where: { comandaId } }),
      tx.barbearia.findUniqueOrThrow({ where: { id: barbeariaId } }),
      comanda.clienteId ? tx.cliente.findUnique({ where: { id: comanda.clienteId } }) : null,
    ]);
    if (itens.length === 0) throw new ErroComanda("Adicione pelo menos um item.");

    const subtotal = subtotalDosItens(itens);
    const desconto = Math.min(Math.max(0, opcoes.descontoCentavos), subtotal);
    const cashbackUsado =
      opcoes.usarCashback && cliente ? Math.min(cliente.saldoCashbackCentavos, subtotal - desconto) : 0;
    const total = subtotal - desconto - cashbackUsado;
    const cashbackGerado = cliente ? Math.floor((total * barbearia.cashbackPct) / 100) : 0;

    for (const item of itens) {
      if (item.tipo !== "PRODUTO" || !item.produtoId) continue;
      await tx.produto.update({ where: { id: item.produtoId }, data: { estoque: { decrement: item.quantidade } } });
      await tx.movimentoEstoque.create({
        data: { produtoId: item.produtoId, quantidade: -item.quantidade, tipo: "VENDA", observacao: `Comanda #${comanda.numero}` },
      });
    }
    if (cliente && (cashbackUsado || cashbackGerado)) {
      await tx.cliente.update({
        where: { id: cliente.id },
        data: { saldoCashbackCentavos: { increment: cashbackGerado - cashbackUsado } },
      });
    }
    if (comanda.agendamentoId) {
      await tx.agendamento.updateMany({
        where: await filtroDoAtendimento(tx, comanda.agendamentoId),
        data: { status: "CONCLUIDO", formaPagamento: total > 0 ? opcoes.formaPagamento : null },
      });
    }
    const caixa = await tx.caixa.findFirst({ where: { filialId: comanda.filialId, fechadoEm: null } });
    return tx.comanda.update({
      where: { id: comandaId },
      data: {
        status: "FECHADA",
        fechadaEm: new Date(),
        descontoCentavos: desconto,
        cashbackUsadoCentavos: cashbackUsado,
        cashbackGeradoCentavos: cashbackGerado,
        totalCentavos: total,
        formaPagamento: total > 0 ? opcoes.formaPagamento : "SEM_COBRANCA",
        caixaId: caixa?.id ?? comanda.caixaId,
      },
    });
  });
}

/** Cancela a comanda. Se já estava fechada, devolve estoque e cashback. */
export async function cancelarComanda(barbeariaId: string, comandaId: string) {
  return db.$transaction(async (tx) => {
    const comanda = await tx.comanda.findFirst({ where: { id: comandaId, barbeariaId }, include: { itens: true } });
    if (!comanda || comanda.status === "CANCELADA") throw new ErroComanda("Comanda não encontrada.");

    if (comanda.status === "FECHADA") {
      for (const item of comanda.itens) {
        if (item.tipo !== "PRODUTO" || !item.produtoId) continue;
        await tx.produto.update({ where: { id: item.produtoId }, data: { estoque: { increment: item.quantidade } } });
        await tx.movimentoEstoque.create({
          data: { produtoId: item.produtoId, quantidade: item.quantidade, tipo: "ESTORNO", observacao: `Comanda #${comanda.numero} cancelada` },
        });
      }
      if (comanda.clienteId && (comanda.cashbackUsadoCentavos || comanda.cashbackGeradoCentavos)) {
        await tx.cliente.update({
          where: { id: comanda.clienteId },
          data: { saldoCashbackCentavos: { increment: comanda.cashbackUsadoCentavos - comanda.cashbackGeradoCentavos } },
        });
      }
    }
    if (comanda.agendamentoId) {
      await tx.agendamento.updateMany({
        where: await filtroDoAtendimento(tx, comanda.agendamentoId),
        data: { status: "AGENDADO", formaPagamento: null },
      });
    }
    await tx.comanda.update({ where: { id: comandaId }, data: { status: "CANCELADA", agendamentoId: null } });
  });
}
