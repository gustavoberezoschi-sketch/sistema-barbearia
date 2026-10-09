import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { criarDataHora, diaDaSemana, horaParaMinutos, minutosParaHora } from "./tempo";

type Cliente = Prisma.TransactionClient | typeof db;

// Status que ocupam o horário do barbeiro.
export const STATUS_OCUPADOS = ["AGENDADO", "CONFIRMADO", "CONCLUIDO"];

export type Horario = { hora: string; barbeiroIds: string[] };

/**
 * Serviços escolhidos e barbeiros ativos que fazem TODOS eles
 * (serviço sem barbeiros definidos = todos fazem).
 */
export async function barbeirosQueFazem(
  barbeariaId: string,
  servicoIds: string[],
  tx: Cliente = db,
  barbeiroId?: string | null,
) {
  const servicos = await tx.servico.findMany({
    where: { id: { in: servicoIds }, barbeariaId, ativo: true },
    include: { barbeiros: { select: { id: true } } },
  });
  if (servicos.length === 0 || servicos.length !== new Set(servicoIds).size) return { servicos: [], barbeiros: [] };
  const todos = await tx.barbeiro.findMany({
    where: { barbeariaId, ativo: true, ...(barbeiroId ? { id: barbeiroId } : {}) },
    orderBy: { nome: "asc" },
  });
  const barbeiros = todos.filter((b) => servicos.every((s) => s.barbeiros.length === 0 || s.barbeiros.some((x) => x.id === b.id)));
  // mantém a ordem escolhida pelo cliente
  const ordenados = servicoIds.map((id) => servicos.find((s) => s.id === id)!);
  return { servicos: ordenados, barbeiros };
}

/**
 * Lista os horários livres de um dia para um ou mais serviços feitos em sequência.
 * Se barbeiroId for null, considera qualquer barbeiro que faça os serviços ("sem preferência").
 */
export async function horariosDisponiveis(
  params: { barbeariaId: string; servicoIds: string[]; barbeiroId: string | null; dia: string },
  tx: Cliente = db,
): Promise<Horario[]> {
  const { barbeariaId, servicoIds, barbeiroId, dia } = params;

  const [barbearia, funcionamento, { servicos, barbeiros }] = await Promise.all([
    tx.barbearia.findUnique({ where: { id: barbeariaId } }),
    tx.horarioFuncionamento.findUnique({
      where: { barbeariaId_diaSemana: { barbeariaId, diaSemana: diaDaSemana(dia) } },
    }),
    barbeirosQueFazem(barbeariaId, servicoIds, tx, barbeiroId),
  ]);
  if (!barbearia || !funcionamento || servicos.length === 0 || barbeiros.length === 0) return [];
  const duracaoMin = servicos.reduce((s, x) => s + x.duracaoMin, 0);

  const abertura = criarDataHora(dia, funcionamento.abre);
  const fechamento = criarDataHora(dia, funcionamento.fecha);
  const ids = barbeiros.map((b) => b.id);
  const [ocupados, bloqueios] = await Promise.all([
    tx.agendamento.findMany({
      where: { barbeiroId: { in: ids }, status: { in: STATUS_OCUPADOS }, inicio: { lt: fechamento }, fim: { gt: abertura } },
      select: { barbeiroId: true, inicio: true, fim: true },
    }),
    tx.bloqueio.findMany({
      where: {
        barbeariaId,
        OR: [{ barbeiroId: null }, { barbeiroId: { in: ids } }],
        inicio: { lt: fechamento },
        fim: { gt: abertura },
      },
      select: { barbeiroId: true, inicio: true, fim: true },
    }),
  ]);

  const agora = Date.now();
  const duracaoMs = duracaoMin * 60_000;
  const fimDoExpediente = horaParaMinutos(funcionamento.fecha);
  const horarios: Horario[] = [];

  for (let min = horaParaMinutos(funcionamento.abre); min + duracaoMin <= fimDoExpediente; min += barbearia.intervaloMin) {
    const hora = minutosParaHora(min);
    const inicio = criarDataHora(dia, hora).getTime();
    if (inicio <= agora) continue;
    const fim = inicio + duracaoMs;
    const sobrepoe = (a: { inicio: Date; fim: Date }) => a.inicio.getTime() < fim && a.fim.getTime() > inicio;
    const livres = barbeiros
      .filter(
        (b) =>
          !ocupados.some((a) => a.barbeiroId === b.id && sobrepoe(a)) &&
          !bloqueios.some((x) => (x.barbeiroId === null || x.barbeiroId === b.id) && sobrepoe(x)),
      )
      .map((b) => b.id);
    if (livres.length > 0) horarios.push({ hora, barbeiroIds: livres });
  }
  return horarios;
}

/** Verifica se o barbeiro tem agendamento ou bloqueio que se sobrepõe ao intervalo. */
export async function temConflito(
  barbeiroId: string,
  inicio: Date,
  fim: Date,
  tx: Cliente = db,
  ignorarId?: string,
): Promise<"agendamento" | "bloqueio" | null> {
  const barbeiro = await tx.barbeiro.findUniqueOrThrow({ where: { id: barbeiroId }, select: { barbeariaId: true } });
  const [agendamento, bloqueio] = await Promise.all([
    tx.agendamento.findFirst({
      where: {
        barbeiroId,
        status: { in: STATUS_OCUPADOS },
        inicio: { lt: fim },
        fim: { gt: inicio },
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
      select: { id: true },
    }),
    tx.bloqueio.findFirst({
      where: {
        barbeariaId: barbeiro.barbeariaId,
        OR: [{ barbeiroId: null }, { barbeiroId }],
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { id: true },
    }),
  ]);
  return agendamento ? "agendamento" : bloqueio ? "bloqueio" : null;
}

/** Encontra o cliente pelo telefone ou cria um novo. */
export async function obterOuCriarCliente(barbeariaId: string, nome: string, telefone: string, tx: Cliente = db) {
  return tx.cliente.upsert({
    where: { barbeariaId_telefone: { barbeariaId, telefone } },
    update: {},
    create: { barbeariaId, nome, telefone },
  });
}

export class ErroAgendamento extends Error {}

/**
 * Executa a função numa transação com trava exclusiva da barbearia, para que dois
 * agendamentos simultâneos não reservem o mesmo horário.
 */
export async function comTravaDaAgenda<T>(barbeariaId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${barbeariaId}))`;
    return fn(tx);
  });
}

/**
 * Agendamento feito pelo cliente na página pública. Revalida o horário dentro da transação.
 * Vários serviços viram agendamentos em sequência com o mesmo barbeiro, ligados pelo "grupo".
 */
export async function reservarOnline(params: {
  barbeariaId: string;
  servicoIds: string[];
  barbeiroId: string | null;
  dia: string;
  hora: string;
  cliente: { id: string } | { nome: string; telefone: string };
}) {
  return comTravaDaAgenda(params.barbeariaId, async (tx) => {
    const horarios = await horariosDisponiveis(params, tx);
    const escolhido = horarios.find((h) => h.hora === params.hora);
    if (!escolhido) throw new ErroAgendamento("Esse horário acabou de ser ocupado. Escolha outro.");

    const { servicos } = await barbeirosQueFazem(params.barbeariaId, params.servicoIds, tx);
    const clienteId =
      "id" in params.cliente
        ? params.cliente.id
        : (await obterOuCriarCliente(params.barbeariaId, params.cliente.nome, params.cliente.telefone, tx)).id;
    const grupo = servicos.length > 1 ? crypto.randomUUID() : null;
    const barbeiroId = escolhido.barbeiroIds[0];

    let inicio = criarDataHora(params.dia, params.hora);
    const criados = [];
    for (const servico of servicos) {
      const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
      criados.push(
        await tx.agendamento.create({
          data: {
            barbeariaId: params.barbeariaId,
            barbeiroId,
            servicoId: servico.id,
            clienteId,
            inicio,
            fim,
            precoCentavos: servico.precoCentavos,
            origem: "ONLINE",
            grupo,
          },
          include: { barbeiro: true, servico: true },
        }),
      );
      inicio = fim;
    }
    return criados;
  });
}
