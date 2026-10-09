"use server";

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

export async function buscarHorarios(slug: string, servicoId: string, barbeiroId: string | null, dia: string) {
  const barbearia = await carregarBarbearia(slug);
  if (!barbearia || !diaPermitido(dia, barbearia.antecedenciaDias)) return [];
  const horarios = await horariosDisponiveis({ barbeariaId: barbearia.id, servicoId, barbeiroId, dia });
  return horarios.map((h) => h.hora);
}

export type Confirmacao =
  | { ok: true; resumo: { barbeiro: string; servico: string; dia: string; hora: string } }
  | { ok: false; erro: string };

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

  try {
    const ag = await reservarOnline({ ...dados, nome, telefone, barbeariaId: barbearia.id });
    return {
      ok: true,
      resumo: {
        barbeiro: ag.barbeiro.nome,
        servico: ag.servico.nome,
        dia: formatarDiaExtenso(dados.dia),
        hora: horaLocal(ag.inicio),
      },
    };
  } catch (e) {
    if (e instanceof ErroAgendamento) return { ok: false, erro: e.message };
    throw e;
  }
}
