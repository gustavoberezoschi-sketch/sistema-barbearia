"use server";

import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ErroCadastro, criarBarbearia, redefinirSenha } from "@/lib/barbearias";
import type { Resultado } from "../painel/actions";

// Área do dono do sistema (você), separada do login das barbearias.
const COOKIE = "admin";

function chave() {
  return new TextEncoder().encode(`admin:${process.env.AUTH_SECRET}`);
}

function senhaConfere(senha: string) {
  const esperada = process.env.ADMIN_SENHA;
  if (!esperada) return false;
  const a = Buffer.from(senha);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function eAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.AUTH_SECRET) return false;
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
  if (!process.env.ADMIN_SENHA) return { erro: "Configure a variável ADMIN_SENHA no servidor." };
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
  try {
    const b = await criarBarbearia({
      nome: String(form.get("nome") ?? ""),
      slug: String(form.get("slug") ?? ""),
      dono: String(form.get("dono") ?? ""),
      email: String(form.get("email") ?? ""),
      senha: String(form.get("senha") ?? ""),
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
