"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { comTravaDaAgenda, obterOuCriarCliente, temConflito } from "@/lib/agenda";
import { type Sessao, exigirSessao } from "@/lib/auth";
import { abrirComanda } from "@/lib/comandas";
import { db } from "@/lib/db";
import { somenteDigitos } from "@/lib/formato";
import { criarDataHora, diaValido } from "@/lib/tempo";
import type { Resultado } from "../actions";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

/** Barbeiro logado só mexe na própria agenda. */
function escopo(sessao: Sessao) {
  return sessao.papel === "BARBEIRO" && sessao.barbeiroId ? { barbeiroId: sessao.barbeiroId } : {};
}

const MENSAGEM_CONFLITO = {
  agendamento: "já tem atendimento nesse horário",
  bloqueio: "está com esse horário bloqueado (folga/pausa)",
};

export async function criarAgendamento(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  const { barbeariaId } = sessao;
  const dia = texto(form, "dia");
  const hora = texto(form, "hora");
  const encaixe = form.get("encaixe") === "on";
  const barbeiroId = sessao.papel === "BARBEIRO" ? sessao.barbeiroId : texto(form, "barbeiroId");

  const [barbeiro, servico] = await Promise.all([
    db.barbeiro.findFirst({ where: { id: barbeiroId ?? "", barbeariaId, ativo: true } }),
    db.servico.findFirst({ where: { id: texto(form, "servicoId"), barbeariaId, ativo: true } }),
  ]);
  if (!barbeiro) return { erro: "Escolha o barbeiro." };
  if (!servico) return { erro: "Escolha o serviço." };
  if (!diaValido(dia) || !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Informe a data e a hora." };

  let clienteId = texto(form, "clienteId");
  if (clienteId) {
    if (!(await db.cliente.findFirst({ where: { id: clienteId, barbeariaId } }))) return { erro: "Cliente não encontrado." };
  } else {
    const nome = texto(form, "clienteNome");
    const telefone = somenteDigitos(texto(form, "clienteTelefone"));
    if (!nome || telefone.length < 10) return { erro: "Escolha um cliente ou informe nome e WhatsApp com DDD." };
    clienteId = (await obterOuCriarCliente(barbeariaId, nome, telefone)).id;
  }

  const inicio = criarDataHora(dia, hora);
  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
  const conflito = await comTravaDaAgenda(barbeariaId, async (tx) => {
    const c = encaixe ? null : await temConflito(barbeiro.id, inicio, fim, tx);
    if (c) return c;
    await tx.agendamento.create({
      data: {
        barbeariaId,
        filialId: barbeiro.filialId,
        barbeiroId: barbeiro.id,
        servicoId: servico.id,
        clienteId,
        inicio,
        fim,
        precoCentavos: servico.precoCentavos,
        origem: "PAINEL",
        observacao: texto(form, "observacao") || null,
      },
    });
    return null;
  });
  if (conflito)
    return { erro: `${barbeiro.nome} ${MENSAGEM_CONFLITO[conflito]}. Marque "Encaixe" para agendar mesmo assim.` };

  revalidatePath("/painel", "layout");
  redirect(`/painel/agenda?dia=${dia}`);
}

export async function remarcarAgendamento(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  const ag = await db.agendamento.findFirst({
    where: { id: texto(form, "id"), barbeariaId: sessao.barbeariaId, ...escopo(sessao) },
    include: { servico: true },
  });
  if (!ag) return { erro: "Agendamento não encontrado." };
  const dia = texto(form, "dia");
  const hora = texto(form, "hora");
  const barbeiroId = sessao.papel === "BARBEIRO" ? ag.barbeiroId : texto(form, "barbeiroId") || ag.barbeiroId;
  if (!diaValido(dia) || !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Informe a nova data e hora." };
  const barbeiro = await db.barbeiro.findFirst({ where: { id: barbeiroId, barbeariaId: sessao.barbeariaId } });
  if (!barbeiro) return { erro: "Barbeiro não encontrado." };

  const inicio = criarDataHora(dia, hora);
  const fim = new Date(inicio.getTime() + (ag.fim.getTime() - ag.inicio.getTime()));
  const conflito = await comTravaDaAgenda(sessao.barbeariaId, async (tx) => {
    const c = form.get("encaixe") === "on" ? null : await temConflito(barbeiroId, inicio, fim, tx, ag.id);
    if (c) return c;
    await tx.agendamento.update({ where: { id: ag.id }, data: { inicio, fim, barbeiroId, filialId: barbeiro.filialId } });
    return null;
  });
  if (conflito) return { erro: `${barbeiro.nome} ${MENSAGEM_CONFLITO[conflito]}.` };
  revalidatePath("/painel", "layout");
  return { ok: "Horário remarcado." };
}

export async function mudarStatus(form: FormData) {
  const sessao = await exigirSessao();
  const status = texto(form, "status");
  if (!["AGENDADO", "CONFIRMADO", "CANCELADO", "FALTOU"].includes(status)) return;
  await db.agendamento.updateMany({
    where: { id: texto(form, "id"), barbeariaId: sessao.barbeariaId, status: { not: "CONCLUIDO" }, ...escopo(sessao) },
    data: { status },
  });
  revalidatePath("/painel", "layout");
}

export async function iniciarAtendimento(form: FormData) {
  const sessao = await exigirSessao();
  const ag = await db.agendamento.findFirst({
    where: { id: texto(form, "id"), barbeariaId: sessao.barbeariaId, ...escopo(sessao) },
  });
  if (!ag) return;
  const comanda = await abrirComanda({ barbeariaId: sessao.barbeariaId, agendamentoId: ag.id });
  redirect(`/painel/comandas/${comanda.id}`);
}

// ---------- Bloqueios (folga, almoço, férias) ----------

export async function criarBloqueio(_: Resultado, form: FormData): Promise<Resultado> {
  const sessao = await exigirSessao();
  const diaInicio = texto(form, "diaInicio");
  const diaFim = texto(form, "diaFim") || diaInicio;
  const diaInteiro = form.get("diaInteiro") === "on";
  const horaInicio = diaInteiro ? "00:00" : texto(form, "horaInicio");
  const horaFim = diaInteiro ? "23:59" : texto(form, "horaFim");
  // "quem": id do barbeiro, "filial:<id>" (unidade inteira) ou "todas" (todas as unidades)
  const quem = sessao.papel === "BARBEIRO" ? sessao.barbeiroId ?? "" : texto(form, "quem");
  let barbeiroId: string | null = null;
  let filialId: string | null = null;
  if (quem.startsWith("filial:")) {
    const f = await db.filial.findFirst({ where: { id: quem.slice(7), barbeariaId: sessao.barbeariaId } });
    if (!f) return { erro: "Unidade não encontrada." };
    filialId = f.id;
  } else if (quem !== "todas") {
    const b = await db.barbeiro.findFirst({ where: { id: quem, barbeariaId: sessao.barbeariaId } });
    if (!b) return { erro: "Escolha quem fica bloqueado." };
    barbeiroId = b.id;
    filialId = b.filialId;
  }

  if (!diaValido(diaInicio) || !diaValido(diaFim)) return { erro: "Informe as datas." };
  if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaFim)) return { erro: "Informe os horários." };
  const inicio = criarDataHora(diaInicio, horaInicio);
  const fim = criarDataHora(diaFim, horaFim);
  if (fim <= inicio) return { erro: "O fim precisa ser depois do início." };

  await db.bloqueio.create({
    data: { barbeariaId: sessao.barbeariaId, barbeiroId, filialId, inicio, fim, motivo: texto(form, "motivo") || null },
  });
  revalidatePath("/painel", "layout");
  return { ok: "Bloqueio criado. Esses horários não aparecem mais para agendamento." };
}

export async function removerBloqueio(form: FormData) {
  const sessao = await exigirSessao();
  await db.bloqueio.deleteMany({ where: { id: texto(form, "id"), barbeariaId: sessao.barbeariaId, ...escopo(sessao) } });
  revalidatePath("/painel", "layout");
}
