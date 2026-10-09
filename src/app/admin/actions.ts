"use server";

import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ErroCadastro, criarBarbearia, redefinirSenha } from "@/lib/barbearias";
import { db } from "@/lib/db";
import { lerDinheiro, somenteDigitos } from "@/lib/formato";
import { CODIGOS_PLANO, proximoVencimento, valorDoCiclo } from "@/lib/planosSistema";
import { diaValido } from "@/lib/tempo";
import { limparVariavel } from "@/lib/env";
import type { Resultado } from "../painel/actions";

// Área do dono do sistema (você), separada do login das barbearias.
const COOKIE = "admin";

function chave() {
  return new TextEncoder().encode(`admin:${limparVariavel(process.env.AUTH_SECRET)}`);
}

function senhaConfere(senha: string) {
  const esperada = limparVariavel(process.env.ADMIN_SENHA);
  if (!esperada) return false;
  const a = Buffer.from(senha);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function eAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !limparVariavel(process.env.AUTH_SECRET)) return false;
  try {
    await jwtVerify(token, chave());
    return true;
  } catch {
    return false;
  }
}

async function exigirAdmin() {
  if (!(await eAdmin())) redirect("/admin");
}

export async function entrarAdmin(_: Resultado, form: FormData): Promise<Resultado> {
  if (!limparVariavel(process.env.ADMIN_SENHA)) return { erro: "Configure a variável ADMIN_SENHA no servidor." };
  if (!senhaConfere(String(form.get("senha") ?? ""))) return { erro: "Senha incorreta." };
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(chave());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 12 * 60 * 60,
  });
  redirect("/admin");
}

export async function sairAdmin() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
  redirect("/admin");
}

export async function novaBarbearia(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const plano = String(form.get("plano") ?? "BAIRRO");
  const ciclo = String(form.get("ciclo") ?? "MENSAL") === "ANUAL" ? "ANUAL" : "MENSAL";
  const pagoAte = String(form.get("pagoAte") ?? "");
  if (!(CODIGOS_PLANO as string[]).includes(plano)) return { erro: "Escolha o plano." };
  if (pagoAte && !diaValido(pagoAte)) return { erro: "Data de vencimento inválida." };
  try {
    const b = await criarBarbearia({
      nome: String(form.get("nome") ?? ""),
      slug: String(form.get("slug") ?? ""),
      dono: String(form.get("dono") ?? ""),
      email: String(form.get("email") ?? ""),
      senha: String(form.get("senha") ?? ""),
      plano,
      ciclo,
      pagoAte: pagoAte || null,
    });
    revalidatePath("/admin");
    return { ok: `Barbearia criada! Link dos clientes: /b/${b.slug}` };
  } catch (e) {
    if (e instanceof ErroCadastro) return { erro: e.message };
    throw e;
  }
}

export async function trocarSenha(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  try {
    await redefinirSenha(String(form.get("email") ?? ""), String(form.get("senha") ?? ""));
    return { ok: "Senha alterada." };
  } catch (e) {
    if (e instanceof ErroCadastro) return { erro: e.message };
    throw e;
  }
}

const campo = (form: FormData, nome: string) => String(form.get(nome) ?? "").trim();

export async function alterarPlano(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const plano = campo(form, "plano");
  const ciclo = campo(form, "ciclo") === "ANUAL" ? "ANUAL" : "MENSAL";
  const pagoAte = campo(form, "pagoAte");
  if (!(CODIGOS_PLANO as string[]).includes(plano)) return { erro: "Plano inválido." };
  if (pagoAte && !diaValido(pagoAte)) return { erro: "Data inválida." };
  await db.barbearia.update({ where: { id: campo(form, "id") }, data: { plano, ciclo, pagoAte: pagoAte || null } });
  revalidatePath("/admin");
  revalidatePath("/painel", "layout");
  return { ok: "Plano atualizado." };
}

/** Registra que a barbearia pagou: estende o vencimento em 1 mês ou 1 ano e tira a suspensão. */
export async function registrarPagamento(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const b = await db.barbearia.findUnique({ where: { id: campo(form, "id") } });
  if (!b) return { erro: "Barbearia não encontrada." };
  const valor = campo(form, "valor") ? lerDinheiro(campo(form, "valor")) : valorDoCiclo(b.plano, b.ciclo);
  if (valor === null) return { erro: "Valor inválido." };
  const ate = proximoVencimento(b.pagoAte, b.ciclo);
  await db.$transaction([
    db.pagamentoSistema.create({
      data: { barbeariaId: b.id, plano: b.plano, ciclo: b.ciclo, valorCentavos: valor, referenteAte: ate, observacao: campo(form, "observacao") || null },
    }),
    db.barbearia.update({ where: { id: b.id }, data: { pagoAte: ate, suspensa: false } }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/painel", "layout");
  return { ok: `Pagamento registrado. ${b.nome} está paga até ${ate.split("-").reverse().join("/")}.` };
}

export async function alternarSuspensao(form: FormData) {
  await exigirAdmin();
  const b = await db.barbearia.findUnique({ where: { id: campo(form, "id") } });
  if (!b) return;
  await db.barbearia.update({ where: { id: b.id }, data: { suspensa: !b.suspensa } });
  revalidatePath("/admin");
  revalidatePath("/painel", "layout");
  revalidatePath("/b", "layout");
}

export async function salvarConfigSistema(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const whatsappSuporte = somenteDigitos(campo(form, "whatsappSuporte")) || null;
  await db.configSistema.upsert({ where: { id: "geral" }, update: { whatsappSuporte }, create: { id: "geral", whatsappSuporte } });
  revalidatePath("/admin");
  revalidatePath("/painel", "layout");
  return { ok: "Configuração salva." };
}
