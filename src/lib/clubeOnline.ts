import { ErroAsaas, cancelarAssinaturaAsaas, criarAssinatura, criarCliente, linkDaPrimeiraCobranca } from "./asaas";
import { db } from "./db";
import { garantirVagaDeAssinante } from "./planosSistema";
import { diaLocal, somarDias } from "./tempo";

export class ErroClube extends Error {}

/** A barbearia pode cobrar o clube online (subconta aprovada e cobrança ligada)? */
export function cobraOnline(b: { asaasApiKey: string | null; asaasStatus: string | null; cobrancaOnlineClube: boolean }) {
  return !!b.asaasApiKey && b.asaasStatus === "APPROVED" && b.cobrancaOnlineClube;
}

export function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
}

/**
 * Cria a assinatura do clube com cobrança recorrente no Asaas (subconta da barbearia).
 * A assinatura fica "AGUARDANDO" até o primeiro pagamento chegar pelo webhook.
 * Devolve o link para o cliente pagar (Pix, cartão ou boleto).
 */
export async function assinarClubeOnline(p: { barbeariaId: string; clienteId: string; planoId: string; cpf: string }) {
  const [b, cliente, plano, config] = await Promise.all([
    db.barbearia.findUniqueOrThrow({ where: { id: p.barbeariaId } }),
    db.cliente.findFirst({ where: { id: p.clienteId, barbeariaId: p.barbeariaId } }),
    db.plano.findFirst({ where: { id: p.planoId, barbeariaId: p.barbeariaId, ativo: true } }),
    db.configSistema.findUnique({ where: { id: "geral" } }),
  ]);
  if (!cobraOnline(b)) throw new ErroClube("A cobrança online do clube não está ligada nesta barbearia.");
  if (!cliente) throw new ErroClube("Cliente não encontrado.");
  if (!plano) throw new ErroClube("Plano não encontrado.");
  if (!cpfValido(p.cpf)) throw new ErroClube("CPF inválido.");
  const existente = await db.assinatura.findFirst({ where: { clienteId: cliente.id, status: { in: ["ATIVA", "AGUARDANDO"] } } });
  if (existente?.status === "ATIVA") throw new ErroClube(`${cliente.nome} já tem uma assinatura ativa.`);
  if (existente?.status === "AGUARDANDO" && existente.linkPagamento) return { assinaturaId: existente.id, link: existente.linkPagamento };
  await garantirVagaDeAssinante(p.barbeariaId);

  const chave = b.asaasApiKey!;
  let asaasClienteId = cliente.asaasClienteId;
  if (!asaasClienteId || cliente.cpf !== p.cpf) {
    asaasClienteId = (await criarCliente({ name: cliente.nome, cpfCnpj: p.cpf, mobilePhone: cliente.telefone, email: cliente.email ?? undefined, externalReference: cliente.id }, chave)).id;
    await db.cliente.update({ where: { id: cliente.id }, data: { cpf: p.cpf, asaasClienteId } });
  }

  const local = await db.assinatura.create({
    data: { barbeariaId: b.id, clienteId: cliente.id, planoId: plano.id, status: "AGUARDANDO", pagoAte: somarDias(diaLocal(), -1) },
  });
  try {
    const taxa = config?.taxaPlataformaPct ?? 0;
    const split = taxa > 0 && config?.asaasWalletId ? [{ walletId: config.asaasWalletId, percentualValue: taxa }] : undefined;
    const asaas = await criarAssinatura(
      {
        customer: asaasClienteId,
        value: plano.precoCentavos / 100,
        nextDueDate: diaLocal(),
        cycle: "MONTHLY",
        description: `${plano.nome} · ${b.nome}`,
        externalReference: local.id,
        split,
      },
      chave,
    );
    const link = await linkDaPrimeiraCobranca(asaas.id, chave);
    await db.assinatura.update({ where: { id: local.id }, data: { asaasId: asaas.id, linkPagamento: link } });
    return { assinaturaId: local.id, link };
  } catch (e) {
    await db.assinatura.delete({ where: { id: local.id } });
    throw e;
  }
}

/** Cancela a assinatura local e, se houver, a cobrança recorrente no Asaas. */
export async function cancelarAssinaturaDoClube(barbeariaId: string, assinaturaId: string) {
  const a = await db.assinatura.findFirst({ where: { id: assinaturaId, barbeariaId }, include: { barbearia: true } });
  if (!a) return;
  if (a.asaasId && a.barbearia.asaasApiKey) {
    try {
      await cancelarAssinaturaAsaas(a.asaasId, a.barbearia.asaasApiKey);
    } catch (e) {
      if (!(e instanceof ErroAsaas)) throw e;
      throw new ErroClube(`Não foi possível cancelar a cobrança no Asaas: ${e.message}`);
    }
  }
  await db.assinatura.update({ where: { id: a.id }, data: { status: "CANCELADA", linkPagamento: null } });
}
