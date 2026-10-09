"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErroAsaas } from "@/lib/asaas";
import { exigirCliente, entrarComoCliente, sairDoCliente } from "@/lib/clienteAuth";
import { ErroClube, assinarClubeOnline } from "@/lib/clubeOnline";
import { LimiteDoPlano } from "@/lib/planosSistema";
import { db } from "@/lib/db";
import { somenteDigitos } from "@/lib/formato";
import type { Resultado } from "@/app/painel/actions";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export async function entrar(slug: string, _: Resultado, form: FormData): Promise<Resultado> {
  const telefone = somenteDigitos(texto(form, "telefone"));
  const senha = texto(form, "senha");
  const cliente = await db.cliente.findFirst({ where: { telefone, barbearia: { slug } } });
  if (!cliente?.senhaHash || !(await bcrypt.compare(senha, cliente.senhaHash)))
    return { erro: "WhatsApp ou senha incorretos. Se ainda não tem conta, crie uma." };
  await entrarComoCliente(slug, cliente.id);
  redirect(`/b/${slug}/conta`);
}

export async function criarConta(slug: string, _: Resultado, form: FormData): Promise<Resultado> {
  const barbearia = await db.barbearia.findUnique({ where: { slug } });
  if (!barbearia) return { erro: "Barbearia não encontrada." };
  const nome = texto(form, "nome").slice(0, 80);
  const telefone = somenteDigitos(texto(form, "telefone"));
  const senha = texto(form, "senha");
  if (!nome) return { erro: "Informe seu nome." };
  if (telefone.length < 10 || telefone.length > 11) return { erro: "Informe seu WhatsApp com DDD." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };

  const existente = await db.cliente.findUnique({ where: { barbeariaId_telefone: { barbeariaId: barbearia.id, telefone } } });
  if (existente?.senhaHash) return { erro: "Esse WhatsApp já tem conta. Use a aba Entrar." };
  const senhaHash = await bcrypt.hash(senha, 10);
  // Se já era cliente (cadastrado no balcão ou agendou sem conta), aproveita o histórico.
  const cliente = existente
    ? await db.cliente.update({ where: { id: existente.id }, data: { senhaHash } })
    : await db.cliente.create({ data: { barbeariaId: barbearia.id, nome, telefone, senhaHash } });
  await entrarComoCliente(slug, cliente.id);
  redirect(`/b/${slug}/conta`);
}

export async function sair(slug: string) {
  await sairDoCliente(slug);
  redirect(`/b/${slug}`);
}

export async function salvarPerfil(slug: string, _: Resultado, form: FormData): Promise<Resultado> {
  const cliente = await exigirCliente(slug);
  const nome = texto(form, "nome").slice(0, 80);
  const nascimento = texto(form, "nascimento");
  if (!nome) return { erro: "Informe seu nome." };
  if (nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return { erro: "Data de nascimento inválida." };
  await db.cliente.update({
    where: { id: cliente.id },
    data: { nome, email: texto(form, "email") || null, nascimento: nascimento || null },
  });
  revalidatePath(`/b/${slug}`, "layout");
  return { ok: "Perfil salvo." };
}

export async function trocarSenha(slug: string, _: Resultado, form: FormData): Promise<Resultado> {
  const cliente = await exigirCliente(slug);
  if (!(await bcrypt.compare(texto(form, "atual"), cliente.senhaHash!))) return { erro: "A senha atual está incorreta." };
  const nova = texto(form, "nova");
  if (nova.length < 6) return { erro: "A nova senha precisa ter pelo menos 6 caracteres." };
  await db.cliente.update({ where: { id: cliente.id }, data: { senhaHash: await bcrypt.hash(nova, 10) } });
  return { ok: "Senha alterada." };
}

export async function assinarPeloCliente(slug: string, _: Resultado, form: FormData): Promise<Resultado> {
  const cliente = await exigirCliente(slug);
  let link: string | null = null;
  try {
    const r = await assinarClubeOnline({
      barbeariaId: cliente.barbeariaId,
      clienteId: cliente.id,
      planoId: texto(form, "planoId"),
      cpf: somenteDigitos(texto(form, "cpf")),
    });
    link = r.link;
  } catch (e) {
    if (e instanceof ErroClube || e instanceof ErroAsaas || e instanceof LimiteDoPlano) return { erro: e.message };
    throw e;
  }
  revalidatePath(`/b/${slug}`, "layout");
  revalidatePath("/painel", "layout");
  if (link) redirect(link);
  return { ok: "Assinatura criada. O link de pagamento aparece aqui em instantes." };
}
