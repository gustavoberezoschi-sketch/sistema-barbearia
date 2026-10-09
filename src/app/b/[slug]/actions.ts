"use server";

import { revalidatePath } from "next/cache";
import { ErroAgendamento, horariosDisponiveis, reservarOnline } from "@/lib/agenda";
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

async function servicoOnline(barbeariaId: string, servicoId: string) {
  return db.servico.findFirst({ where: { id: servicoId, barbeariaId, ativo: true, exibirOnline: true } });
}

export async function buscarHorarios(slug: string, servicoId: string, barbeiroId: string | null, dia: string) {
  const barbearia = await carregarBarbearia(slug);
  if (!barbearia || !diaPermitido(dia, barbearia.antecedenciaDias)) return [];
  if (!(await servicoOnline(barbearia.id, servicoId))) return [];
  const horarios = await horariosDisponiveis({ barbeariaId: barbearia.id, servicoId, barbeiroId, dia });
  return horarios.map((h) => h.hora);
}

export type Confirmacao =
  | { ok: true; token: string; resumo: { barbeiro: string; servico: string; dia: string; hora: string; inicioISO: string; fimISO: string } }
  | { ok: false; erro: string; horarioOcupado?: boolean };

export async function agendar(
  slug: string,
  dados: { servicoId: string; barbeiroId: string | null; dia: string; hora: string; nome: string; telefone: string },
): Promise<Confirmacao> {
  const barbearia = await carregarBarbearia(slug);
  if (!barbearia) return { ok: false, erro: "Barbearia não encontrada." };

  const nome = dados.nome.trim().slice(0, 80);
  const telefone = somenteDigitos(dados.telefone);
  if (!nome) return { ok: false, erro: "Informe seu nome." };
  if (telefone.length < 10 || telefone.length > 11) return { ok: false, erro: "Informe seu WhatsApp com DDD." };
  if (!diaPermitido(dados.dia, barbearia.antecedenciaDias) || !/^\d{2}:\d{2}$/.test(dados.hora))
    return { ok: false, erro: "Data ou horário inválido." };
  if (!(await servicoOnline(barbearia.id, dados.servicoId))) return { ok: false, erro: "Serviço indisponível." };

  try {
    const ag = await reservarOnline({ ...dados, nome, telefone, barbeariaId: barbearia.id });
    revalidatePath("/painel", "layout");
    return {
      ok: true,
      token: ag.token,
      resumo: {
        barbeiro: ag.barbeiro.nome,
        servico: ag.servico.nome,
        dia: formatarDiaExtenso(dados.dia),
        hora: horaLocal(ag.inicio),
        inicioISO: ag.inicio.toISOString(),
        fimISO: ag.fim.toISOString(),
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
    return { ok: false, erro: `O cancelamento pelo link vai até ${ag.barbearia.cancelamentoHoras}h antes. Fale com a barbearia pelo WhatsApp.` };
  await db.agendamento.update({ where: { id: ag.id }, data: { status: "CANCELADO", observacao: [ag.observacao, "Cancelado pelo cliente"].filter(Boolean).join(" · ") } });
  revalidatePath(`/b/${slug}`, "layout");
  revalidatePath("/painel", "layout");
  return { ok: true };
}
