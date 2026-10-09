"use client";

import { startTransition, useActionState } from "react";
import { entrar } from "./actions";

export default function Login() {
  const [erro, acao, enviando] = useActionState(entrar, null);

  // Envia via onSubmit para o React não limpar o e-mail quando a senha está errada.
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-6 text-center text-2xl font-bold">✂️ Painel da barbearia</h1>
      <form onSubmit={enviar} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <input className="input" id="senha" name="senha" type="password" required autoComplete="current-password" />
        </div>
        {erro && <p className="text-sm text-rose-700">{erro}</p>}
        <button className="btn-primario w-full" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
