"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { type Papel, criarSessao, encerrarSessao } from "@/lib/auth";
import { db } from "@/lib/db";

export async function entrar(_estado: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  const usuario = await db.usuario.findUnique({ where: { email } });
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return "E-mail ou senha incorretos.";
  }

  const papel = (["DONO", "GERENTE", "BARBEIRO"].includes(usuario.papel) ? usuario.papel : "DONO") as Papel;
  await criarSessao({
    usuarioId: usuario.id,
    barbeariaId: usuario.barbeariaId,
    nome: usuario.nome,
    papel,
    barbeiroId: usuario.barbeiroId,
  });
  redirect(papel === "BARBEIRO" ? "/painel/agenda" : "/painel");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
