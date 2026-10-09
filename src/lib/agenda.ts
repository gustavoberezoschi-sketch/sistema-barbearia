import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { criarDataHora, diaDaSemana, horaParaMinutos, minutosParaHora } from "./tempo";

type Cliente = Prisma.TransactionClient | typeof db;

// Status que ocupam o horário do barbeiro.
export const STATUS_OCUPADOS = ["AGENDADO", "CONCLUIDO"];

export type Horario = { hora: string; barbeiroIds: string[] };

/**
 * Lista os horários livres de um dia para um serviço.
 * Se barbeiroId for null, considera qualquer barbeiro ativo ("sem preferência").
 */
export async function horariosDisponiveis(
  params: { barbeariaId: string; servicoId: string; barbeiroId: string | null; dia: string },
  tx: Cliente = db,
): Promise<Horario[]> {
  const { barbeariaId, servicoId, barbeiroId, dia } = params;

  const [barbearia, funcionamento, servico, barbeiros] = await Promise.all([
    tx.barbearia.findUnique({ where: { id: barbeariaId } }),
    tx.horarioFuncionamento.findUnique({
      where: { barbeariaId_diaSemana: { barbeariaId, diaSemana: diaDaSemana(dia) } },
    }),
    tx.servico.findFirst({ where: { id: servicoId, barbeariaId, ativo: true } }),
    tx.barbeiro.findMany({
      where: { barbeariaId, ativo: true, ...(barbeiroId ? { id: barbeiroId } : {}) },
      orderBy: { nome: "asc" },
    }),
  ]);
  if (!barbearia || !funcionamento || !servico || barbeiros.length === 0) return [];

  const abertura = criarDataHora(dia, funcionamento.abre);
  const fechamento = criarDataHora(dia, funcionamento.fecha);
  const ocupados = await tx.agendamento.findMany({
    where: {
      barbeiroId: { in: barbeiros.map((b) => b.id) },
      status: { in: STATUS_OCUPADOS },
      inicio: { lt: fechamento },
      fim: { gt: abertura },
    },
    select: { barbeiroId: true, inicio: true, fim: true },
  });

  const agora = Date.now();
  const duracaoMs = servico.duracaoMin * 60_000;
  const fimDoExpediente = horaParaMinutos(funcionamento.fecha);
  const horarios: Horario[] = [];

  for (
    let min = horaParaMinutos(funcionamento.abre);
    min + servico.duracaoMin <= fimDoExpediente;
    min += barbearia.intervaloMin
  ) {
    const hora = minutosParaHora(min);
    const inicio = criarDataHora(dia, hora).getTime();
    if (inicio <= agora) continue;
    const fim = inicio + duracaoMs;
    const livres = barbeiros
      .filter(
        (b) =>
          !ocupados.some(
            (a) => a.barbeiroId === b.id && a.inicio.getTime() < fim && a.fim.getTime() > inicio,
          ),
      )
      .map((b) => b.id);
    if (livres.length > 0) horarios.push({ hora, barbeiroIds: livres });
  }
  return horarios;
}

/** Verifica se o barbeiro tem algum agendamento que se sobrepõe ao intervalo. */
export async function temConflito(
  barbeiroId: string,
  inicio: Date,
  fim: Date,
  tx: Cliente = db,
  ignorarId?: string,
): Promise<boolean> {
  const conflito = await tx.agendamento.findFirst({
    where: {
      barbeiroId,
      status: { in: STATUS_OCUPADOS },
      inicio: { lt: fim },
      fim: { gt: inicio },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { id: true },
  });
  return conflito !== null;
}

/** Encontra o cliente pelo telefone ou cria um novo. */
export async function obterOuCriarCliente(
  barbeariaId: string,
  nome: string,
  telefone: string,
  tx: Cliente = db,
) {
  return tx.cliente.upsert({
    where: { barbeariaId_telefone: { barbeariaId, telefone } },
    update: {},
    create: { barbeariaId, nome, telefone },
  });
}

export class ErroAgendamento extends Error {}

/** Agendamento feito pelo cliente na página pública. Revalida o horário dentro da transação. */
export async function reservarOnline(params: {
  barbeariaId: string;
  servicoId: string;
  barbeiroId: string | null;
  dia: string;
  hora: string;
  nome: string;
  telefone: string;
}) {
  return db.$transaction(async (tx) => {
    const horarios = await horariosDisponiveis(params, tx);
    const escolhido = horarios.find((h) => h.hora === params.hora);
    if (!escolhido) throw new ErroAgendamento("Esse horário acabou de ser ocupado. Escolha outro.");

    const servico = await tx.servico.findUniqueOrThrow({ where: { id: params.servicoId } });
    const cliente = await obterOuCriarCliente(params.barbeariaId, params.nome, params.telefone, tx);
    const inicio = criarDataHora(params.dia, params.hora);

    return tx.agendamento.create({
      data: {
        barbeariaId: params.barbeariaId,
        barbeiroId: escolhido.barbeiroIds[0],
        servicoId: servico.id,
        clienteId: cliente.id,
        inicio,
        fim: new Date(inicio.getTime() + servico.duracaoMin * 60_000),
        precoCentavos: servico.precoCentavos,
        origem: "ONLINE",
      },
      include: { barbeiro: true, servico: true },
    });
  });
}
