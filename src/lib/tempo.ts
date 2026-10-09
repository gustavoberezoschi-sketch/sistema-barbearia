// Todas as barbearias usam o horário de Brasília (sem horário de verão desde 2019).
export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** Junta um dia "2026-10-09" e uma hora "14:30" num Date (horário de Brasília). */
export function criarDataHora(dia: string, hora: string): Date {
  return new Date(`${dia}T${hora}:00${OFFSET}`);
}

/** "2026-10-09" do instante informado, no horário de Brasília. */
export function diaLocal(data: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(data);
}

/** "14:30" do instante informado, no horário de Brasília. */
export function horaLocal(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(dia: string): number {
  return criarDataHora(dia, "12:00").getUTCDay();
}

export function somarDias(dia: string, dias: number): string {
  const d = criarDataHora(dia, "12:00");
  d.setUTCDate(d.getUTCDate() + dias);
  return diaLocal(d);
}

export function inicioEFimDoDia(dia: string): { inicio: Date; fim: Date } {
  return { inicio: criarDataHora(dia, "00:00"), fim: criarDataHora(somarDias(dia, 1), "00:00") };
}

export function minutosParaHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function diaValido(dia: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) && !Number.isNaN(criarDataHora(dia, "12:00").getTime());
}

export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function formatarDiaExtenso(dia: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(criarDataHora(dia, "12:00"));
}
