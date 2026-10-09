"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { criarSessao, encerrarSessao } from "@/lib/auth";
import { db } from "@/lib/db";

export async function entrar(_estado: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  const usuario = await db.usuario.findUnique({ where: { email } });
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return "E-mail ou senha incorretos.";
  }

  await criarSessao({ usuarioId: usuario.id, barbeariaId: usuario.barbeariaId, nome: usuario.nome });
  redirect("/painel");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
