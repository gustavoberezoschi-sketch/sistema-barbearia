"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { ErroAgendamento, horariosDisponiveis, reservarOnline } from "@/lib/agenda";
import { clienteLogado, entrarComoCliente } from "@/lib/clienteAuth";
import { db } from "@/lib/db";
import { somenteDigitos } from "@/lib/formato";
import { diaLocal, diaValido, formatarDiaExtenso, horaLocal, somarDias } from "@/lib/tempo";

async function carregarBarbearia(slug: string) {
  return db.barbearia.findUnique({ where: { slug } });
}

function diaPermitido(dia: string, antecedenciaDias: number) {
  const hoje = diaLocal();
  return diaValido(dia) && dia >= hoje && dia <= somarDias(hoje, antecedenciaDias);
}

async function servicosOnline(barbeariaId: string, servicoIds: string[]) {
  if (servicoIds.length === 0 || servicoIds.length > 6) return false;
  const n = await db.servico.count({ where: { id: { in: servicoIds }, barbeariaId, ativo: true, exibirOnline: true } });
  return n === new Set(servicoIds).size;
}

export async function buscarHorarios(slug: string, servicoIds: string[], barbeiroId: string | null, dia: string) {
  const barbearia = await carregarBarbearia(slug);
  if (!barbearia || !diaPermitido(dia, barbearia.antecedenciaDias)) return [];
  if (!(await servicosOnline(barbearia.id, servicoIds))) return [];
  const horarios = await horariosDisponiveis({ barbeariaId: barbearia.id, servicoIds, barbeiroId, dia });
  return horarios.map((h) => h.hora);
}

export type Confirmacao =
  | {
      ok: true;
      token: string;
      contaCriada: boolean;
      resumo: { barbeiro: string; servicos: string; dia: string; hora: string; inicioISO: string; fimISO: string };
    }
  | { ok: false; erro: string; horarioOcupado?: boolean };

export async function agendar(
  slug: string,
  dados: { servicoIds: string[]; barbeiroId: string | null; dia: string; hora: string; nome?: string; telefone?: string; senha?: string },
): Promise<Confirmacao> {
  const barbearia = await carregarBarbearia(slug);
  if (!barbearia) return { ok: false, erro: "Barbearia não encontrada." };
  if (!diaPermitido(dados.dia, barbearia.antecedenciaDias) || !/^\d{2}:\d{2}$/.test(dados.hora))
    return { ok: false, erro: "Data ou horário inválido." };
  if (!(await servicosOnline(barbearia.id, dados.servicoIds))) return { ok: false, erro: "Serviço indisponível." };

  const logado = await clienteLogado(slug);
  let cliente: { id: string } | { nome: string; telefone: string };
  if (logado) {
    cliente = { id: logado.id };
  } else {
    const nome = (dados.nome ?? "").trim().slice(0, 80);
    const telefone = somenteDigitos(dados.telefone ?? "");
    if (!nome) return { ok: false, erro: "Informe seu nome." };
    if (telefone.length < 10 || telefone.length > 11) return { ok: false, erro: "Informe seu WhatsApp com DDD." };
    if (dados.senha && dados.senha.length < 6) return { ok: false, erro: "A senha precisa ter pelo menos 6 caracteres." };
    cliente = { nome, telefone };
  }

  try {
    const criados = await reservarOnline({ ...dados, barbeariaId: barbearia.id, cliente });
    const primeiro = criados[0];
    const ultimo = criados[criados.length - 1];

    // Cria o acesso à área do cliente, se ele pediu e ainda não tinha senha.
    let contaCriada = false;
    if (!logado && dados.senha) {
      const c = await db.cliente.findUniqueOrThrow({ where: { id: primeiro.clienteId } });
      if (!c.senhaHash) {
        await db.cliente.update({ where: { id: c.id }, data: { senhaHash: await bcrypt.hash(dados.senha, 10) } });
        await entrarComoCliente(slug, c.id);
        contaCriada = true;
      }
    }
    revalidatePath("/painel", "layout");
    return {
      ok: true,
      token: primeiro.token,
      contaCriada,
      resumo: {
        barbeiro: primeiro.barbeiro.nome,
        servicos: criados.map((a) => a.servico.nome).join(" + "),
        dia: formatarDiaExtenso(dados.dia),
        hora: horaLocal(primeiro.inicio),
        inicioISO: primeiro.inicio.toISOString(),
        fimISO: ultimo.fim.toISOString(),
      },
    };
  } catch (e) {
    if (e instanceof ErroAgendamento) return { ok: false, erro: e.message, horarioOcupado: true };
    throw e;
  }
}

export async function cancelarPeloCliente(slug: string, token: string): Promise<{ ok: boolean; erro?: string }> {
  const ag = await db.agendamento.findFirst({ where: { token, barbearia: { slug } }, include: { barbearia: true } });
  if (!ag) return { ok: false, erro: "Agendamento não encontrado." };
  if (ag.status !== "AGENDADO" && ag.status !== "CONFIRMADO") return { ok: false, erro: "Este agendamento não pode mais ser cancelado." };
  if (ag.inicio.getTime() - Date.now() < ag.barbearia.cancelamentoHoras * 3600_000)
    return { ok: false, erro: `O cancelamento pelo site vai até ${ag.barbearia.cancelamentoHoras}h antes. Fale com a barbearia pelo WhatsApp.` };
  await db.agendamento.updateMany({
    where: ag.grupo ? { grupo: ag.grupo, status: { in: ["AGENDADO", "CONFIRMADO"] } } : { id: ag.id },
    data: { status: "CANCELADO" },
  });
  revalidatePath(`/b/${slug}`, "layout");
  revalidatePath("/painel", "layout");
  return { ok: true };
}
