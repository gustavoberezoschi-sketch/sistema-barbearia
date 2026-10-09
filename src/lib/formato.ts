export function formatarDinheiro(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Converte "35", "35,50" ou "35.50" em centavos. Retorna null se inválido. */
export function lerDinheiro(texto: string): number | null {
  const limpo = texto.replace(/[R$\s.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

export function formatarTelefone(digitos: string): string {
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return digitos;
}

export function linkWhatsApp(digitos: string, mensagem?: string): string {
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

export const STATUS_AGENDAMENTO: Record<string, { rotulo: string; cor: string }> = {
  AGENDADO: { rotulo: "Agendado", cor: "bg-sky-100 text-sky-800" },
  CONCLUIDO: { rotulo: "Concluído", cor: "bg-emerald-100 text-emerald-800" },
  CANCELADO: { rotulo: "Cancelado", cor: "bg-stone-200 text-stone-600" },
  FALTOU: { rotulo: "Faltou", cor: "bg-rose-100 text-rose-800" },
};

export const FORMAS_PAGAMENTO: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
};
