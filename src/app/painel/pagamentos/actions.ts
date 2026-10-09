"use server";

import { revalidatePath } from "next/cache";
import { ErroAsaas, asaasConfigurado, configurarWebhook, criarSubconta, statusDaSubconta } from "@/lib/asaas";
import { exigirGestor } from "@/lib/auth";
import { cifrar, tokenWebhookAsaas } from "@/lib/cripto";
import { db } from "@/lib/db";
import { lerDinheiro, somenteDigitos } from "@/lib/formato";
import { enderecoDoSite } from "@/lib/site";
import { diaValido } from "@/lib/tempo";
import type { Resultado } from "../actions";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const TIPOS_EMPRESA = ["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"] as const;

export async function criarContaRecebimento(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirGestor();
  if (!asaasConfigurado()) return { erro: "Os pagamentos online ainda não estão liberados. Fale com o KlarezaBarber." };
  const barbearia = await db.barbearia.findUniqueOrThrow({ where: { id: barbeariaId } });
  if (barbearia.asaasContaId) return { erro: "A conta de recebimento já foi criada." };

  const documento = somenteDigitos(texto(form, "cpfCnpj"));
  const pessoaFisica = documento.length === 11;
  const celular = somenteDigitos(texto(form, "celular"));
  const cep = somenteDigitos(texto(form, "cep"));
  const faturamento = lerDinheiro(texto(form, "faturamento"));
  const nascimento = texto(form, "nascimento");
  const tipoEmpresa = texto(form, "tipoEmpresa");

  if (!texto(form, "nome")) return { erro: "Informe o nome ou a razão social." };
  if (documento.length !== 11 && documento.length !== 14) return { erro: "Informe um CPF (11 números) ou CNPJ (14 números)." };
  if (!/^\S+@\S+\.\S+$/.test(texto(form, "email"))) return { erro: "Informe um e-mail válido." };
  if (celular.length < 10) return { erro: "Informe o celular com DDD." };
  if (pessoaFisica && !diaValido(nascimento)) return { erro: "Para CPF, informe a data de nascimento." };
  if (!pessoaFisica && !(TIPOS_EMPRESA as readonly string[]).includes(tipoEmpresa)) return { erro: "Escolha o tipo de empresa." };
  if (cep.length !== 8) return { erro: "CEP inválido." };
  if (!texto(form, "endereco") || !texto(form, "numero") || !texto(form, "bairro")) return { erro: "Preencha endereço, número e bairro." };
  if (!faturamento) return { erro: "Informe o faturamento mensal aproximado." };

  try {
    const conta = await criarSubconta({
      name: texto(form, "nome"),
      email: texto(form, "email"),
      cpfCnpj: documento,
      ...(pessoaFisica ? { birthDate: nascimento } : { companyType: tipoEmpresa as (typeof TIPOS_EMPRESA)[number] }),
      mobilePhone: celular,
      incomeValue: faturamento / 100,
      address: texto(form, "endereco"),
      addressNumber: texto(form, "numero"),
      province: texto(form, "bairro"),
      postalCode: cep,
    });
    const chave = cifrar(conta.apiKey);
    await db.barbearia.update({
      where: { id: barbeariaId },
      data: { asaasContaId: conta.id, asaasWalletId: conta.walletId, asaasApiKey: chave, asaasStatus: "PENDING" },
    });
    // Avisos de pagamento da subconta chegam no KlarezaBarber
    try {
      await configurarWebhook(`${await enderecoDoSite()}/api/asaas/webhook`, tokenWebhookAsaas(), texto(form, "email"), chave);
    } catch {
      // segue: o webhook pode ser configurado de novo em "Atualizar status"
    }
  } catch (e) {
    if (e instanceof ErroAsaas) return { erro: e.message };
    throw e;
  }
  revalidatePath("/painel", "layout");
  return { ok: "Conta criada! Agora envie os documentos pedidos pelo Asaas para liberar os recebimentos." };
}

export async function atualizarStatusConta(_: Resultado): Promise<Resultado> {
  const { barbeariaId } = await exigirGestor();
  const b = await db.barbearia.findUniqueOrThrow({ where: { id: barbeariaId } });
  if (!b.asaasApiKey) return { erro: "A conta de recebimento ainda não foi criada." };
  try {
    const status = await statusDaSubconta(b.asaasApiKey);
    await db.barbearia.update({ where: { id: barbeariaId }, data: { asaasStatus: status } });
    revalidatePath("/painel", "layout");
    return { ok: status === "APPROVED" ? "Conta aprovada! Já dá para cobrar online." : "Status atualizado. A conta ainda está em análise." };
  } catch (e) {
    if (e instanceof ErroAsaas) return { erro: e.message };
    throw e;
  }
}

export async function alternarCobrancaClube(form: FormData) {
  const { barbeariaId } = await exigirGestor();
  const b = await db.barbearia.findUniqueOrThrow({ where: { id: barbeariaId } });
  if (b.asaasStatus !== "APPROVED" && form.get("ligar") === "1") return;
  await db.barbearia.update({ where: { id: barbeariaId }, data: { cobrancaOnlineClube: form.get("ligar") === "1" } });
  revalidatePath("/painel", "layout");
  revalidatePath("/b", "layout");
}
