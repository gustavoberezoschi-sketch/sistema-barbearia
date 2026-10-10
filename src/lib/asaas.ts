import { decifrar } from "./cripto";
import { limparVariavel } from "./env";

// Integração com o Asaas (https://docs.asaas.com).
// ASAAS_API_KEY: chave da conta principal do KlarezaBarber.
// ASAAS_AMBIENTE: "producao" ou "sandbox" (padrão: sandbox, para testes).

export class ErroAsaas extends Error {}

export function urlBase() {
  const forcada = limparVariavel(process.env.ASAAS_URL); // só para testes
  if (forcada) return forcada.replace(/\/$/, "");
  return limparVariavel(process.env.ASAAS_AMBIENTE) === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export function asaasConfigurado() {
  return !!limparVariavel(process.env.ASAAS_API_KEY);
}

export function ambienteAsaas() {
  return limparVariavel(process.env.ASAAS_AMBIENTE) === "producao" ? "Produção" : "Sandbox (testes)";
}

type Opcoes = { chave?: string; metodo?: "GET" | "POST" | "DELETE" | "PUT"; corpo?: unknown };

async function chamar<T>(caminho: string, { chave, metodo = "GET", corpo }: Opcoes = {}): Promise<T> {
  const token = chave ?? limparVariavel(process.env.ASAAS_API_KEY);
  if (!token) throw new ErroAsaas("Pagamentos online não configurados (falta ASAAS_API_KEY).");
  let resposta: Response;
  try {
    resposta = await fetch(`${urlBase()}${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", "User-Agent": "KlarezaBarber", access_token: token },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ErroAsaas("Não foi possível falar com o Asaas agora. Tente de novo em instantes.");
  }
  const texto = await resposta.text();
  const json = texto ? JSON.parse(texto) : {};
  if (!resposta.ok) {
    const erros = (json?.errors as { description?: string }[] | undefined)?.map((e) => e.description).filter(Boolean);
    throw new ErroAsaas(erros?.length ? erros.join(" ") : `Asaas respondeu com erro ${resposta.status}.`);
  }
  return json as T;
}

// ---------- Subcontas (conta principal) ----------

export type DadosSubconta = {
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate?: string;
  companyType?: "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
  mobilePhone: string;
  incomeValue: number;
  address: string;
  addressNumber: string;
  province: string;
  postalCode: string;
};

export async function criarSubconta(dados: DadosSubconta) {
  return chamar<{ id: string; walletId: string; apiKey: string }>("/accounts", { metodo: "POST", corpo: dados });
}

/** Chama a API usando a chave (criptografada) da subconta da barbearia. */
function daSubconta(apiKeyCifrada: string) {
  return decifrar(apiKeyCifrada);
}

export async function statusDaSubconta(apiKeyCifrada: string) {
  const r = await chamar<{ general?: string }>("/myAccount/status/", { chave: daSubconta(apiKeyCifrada) });
  return r.general ?? "PENDING";
}

export type GrupoDocumento = { id: string; status: string; title: string; description?: string; onboardingUrl?: string | null };

export async function documentosDaSubconta(apiKeyCifrada: string) {
  const r = await chamar<{ data?: GrupoDocumento[] }>("/myAccount/documents", { chave: daSubconta(apiKeyCifrada) });
  return r.data ?? [];
}

const EVENTOS = ["PAYMENT_CREATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_DELETED"];

/** Cadastra o webhook do KlarezaBarber numa conta (subconta ou principal). */
export async function configurarWebhook(url: string, authToken: string, email: string, apiKeyCifrada?: string) {
  return chamar("/webhooks", {
    chave: apiKeyCifrada ? daSubconta(apiKeyCifrada) : undefined,
    metodo: "POST",
    corpo: { name: "KlarezaBarber", url, email, enabled: true, interrupted: false, apiVersion: 3, authToken, sendType: "SEQUENTIALLY", events: EVENTOS },
  });
}

export async function carteiraPrincipal() {
  const r = await chamar<{ data?: { id: string }[] }>("/wallets");
  return r.data?.[0]?.id ?? null;
}

// ---------- Clientes e assinaturas (na conta indicada) ----------

export async function criarCliente(dados: { name: string; cpfCnpj: string; mobilePhone?: string; email?: string; externalReference: string }, apiKeyCifrada?: string) {
  return chamar<{ id: string }>("/customers", {
    chave: apiKeyCifrada ? daSubconta(apiKeyCifrada) : undefined,
    metodo: "POST",
    corpo: { ...dados, notificationDisabled: false },
  });
}

export async function criarAssinatura(
  dados: {
    customer: string;
    value: number; // em reais
    nextDueDate: string;
    cycle: "MONTHLY" | "YEARLY";
    description: string;
    externalReference: string;
    split?: { walletId: string; percentualValue: number }[];
    // CREDIT_CARD: o cliente informa o cartão na 1ª cobrança e as próximas são debitadas sozinhas.
    // UNDEFINED: cada cobrança gera um link e o pagador escolhe Pix, cartão ou boleto.
    billingType?: "CREDIT_CARD" | "UNDEFINED";
  },
  apiKeyCifrada?: string,
) {
  return chamar<{ id: string }>("/subscriptions", {
    chave: apiKeyCifrada ? daSubconta(apiKeyCifrada) : undefined,
    metodo: "POST",
    corpo: { billingType: "UNDEFINED", ...dados },
  });
}

export async function linkDaPrimeiraCobranca(assinaturaId: string, apiKeyCifrada?: string) {
  const r = await chamar<{ data?: { invoiceUrl?: string; status?: string }[] }>(`/subscriptions/${assinaturaId}/payments`, {
    chave: apiKeyCifrada ? daSubconta(apiKeyCifrada) : undefined,
  });
  return r.data?.find((p) => p.status === "PENDING" || p.status === "OVERDUE")?.invoiceUrl ?? r.data?.[0]?.invoiceUrl ?? null;
}

export async function cancelarAssinaturaAsaas(assinaturaId: string, apiKeyCifrada?: string) {
  return chamar(`/subscriptions/${assinaturaId}`, { chave: apiKeyCifrada ? daSubconta(apiKeyCifrada) : undefined, metodo: "DELETE" });
}

// ---------- Cobranças avulsas e ajustes (extras na fatura do clube) ----------

export type Cobranca = { id: string; value: number; dueDate: string; status: string; billingType?: string; description?: string; subscription?: string | null };

/** Cobranças em aberto de uma assinatura, da que vence primeiro para a última. */
export async function cobrancasPendentes(assinaturaId: string, apiKeyCifrada: string) {
  const r = await chamar<{ data?: Cobranca[] }>(`/subscriptions/${assinaturaId}/payments?status=PENDING`, { chave: daSubconta(apiKeyCifrada) });
  return (r.data ?? []).filter((c) => c.status === "PENDING").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Próxima cobrança em aberto de uma assinatura (a que vence primeiro). */
export async function proximaCobrancaPendente(assinaturaId: string, apiKeyCifrada: string) {
  return (await cobrancasPendentes(assinaturaId, apiKeyCifrada))[0] ?? null;
}

export async function buscarCobranca(id: string, apiKeyCifrada: string) {
  return chamar<Cobranca>(`/payments/${id}`, { chave: daSubconta(apiKeyCifrada) });
}

/** Muda o valor (e a descrição) de uma cobrança em aberto, mantendo vencimento e forma. */
export async function alterarCobranca(c: Cobranca, novoValor: number, descricao: string, apiKeyCifrada: string) {
  return chamar<Cobranca>(`/payments/${c.id}`, {
    chave: daSubconta(apiKeyCifrada),
    metodo: "POST",
    corpo: { billingType: c.billingType ?? "UNDEFINED", value: Math.round(novoValor * 100) / 100, dueDate: c.dueDate, description: descricao.slice(0, 500) },
  });
}

export async function criarCobranca(dados: { customer: string; value: number; dueDate: string; description: string; externalReference: string }, apiKeyCifrada: string) {
  return chamar<Cobranca>("/payments", { chave: daSubconta(apiKeyCifrada), metodo: "POST", corpo: { ...dados, billingType: "UNDEFINED" } });
}

export async function excluirCobranca(id: string, apiKeyCifrada: string) {
  return chamar(`/payments/${id}`, { chave: daSubconta(apiKeyCifrada), metodo: "DELETE" });
}

export const FORMA_ASAAS: Record<string, string> = {
  PIX: "PIX",
  CREDIT_CARD: "CARTAO_CREDITO",
  DEBIT_CARD: "CARTAO_DEBITO",
  BOLETO: "BOLETO",
};

// Taxas iniciais do Asaas por transação (informadas pelo Asaas; podem mudar por negociação).
export const TAXAS_ASAAS = {
  PIX: { pct: 1.99, fixoCentavos: 199, rotulo: "Pix" },
  CREDIT_CARD: { pct: 3.99, fixoCentavos: 199, rotulo: "Cartão de crédito" },
} as const;

/** Quanto sobra de um valor depois da taxa do Asaas (estimativa). */
export function liquidoEstimado(valorCentavos: number, forma: keyof typeof TAXAS_ASAAS) {
  const t = TAXAS_ASAAS[forma];
  return Math.max(0, Math.round(valorCentavos - (valorCentavos * t.pct) / 100 - t.fixoCentavos));
}
