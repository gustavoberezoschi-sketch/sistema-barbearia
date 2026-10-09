import type { Metadata } from "next";
import Link from "next/link";
import { FormAcao } from "@/components/FormAcao";
import { Marca } from "@/components/Marca";
import { db } from "@/lib/db";
import { eAdmin, entrarAdmin, novaBarbearia, sairAdmin, trocarSenha } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administração", robots: { index: false } };

export default async function Admin() {
  if (!(await eAdmin())) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
        <div className="mb-4 flex justify-center"><Marca tamanho="md" /></div>
        <h1 className="mb-6 text-center text-xl font-bold">Administração</h1>
        <FormAcao acao={entrarAdmin} className="card space-y-4">
          <div>
            <label className="label" htmlFor="senha">Senha de administrador</label>
            <input className="input" id="senha" name="senha" type="password" required />
          </div>
          <button className="btn-primario w-full">Entrar</button>
        </FormAcao>
      </main>
    );
  }

  const barbearias = await db.barbearia.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      usuarios: { select: { email: true } },
      _count: { select: { agendamentos: true, clientes: true, barbeiros: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Marca tamanho="sm" />
          <h1 className="titulo mt-2">Barbearias clientes</h1>
        </div>
        <form action={sairAdmin}>
          <button className="btn-secundario">Sair</button>
        </form>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Cadastrar nova barbearia</h2>
        <FormAcao acao={novaBarbearia} limparAoSalvar className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nome da barbearia</label>
            <input name="nome" className="input" required />
          </div>
          <div>
            <label className="label">Link (opcional, ex.: navalha-de-ouro)</label>
            <input name="slug" className="input" placeholder="gerado a partir do nome" />
          </div>
          <div>
            <label className="label">Nome do dono</label>
            <input name="dono" className="input" required />
          </div>
          <div>
            <label className="label">E-mail de login do dono</label>
            <input name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label">Senha inicial</label>
            <input name="senha" className="input" minLength={6} required />
          </div>
          <div className="flex items-end">
            <button className="btn-primario w-full">Cadastrar</button>
          </div>
        </FormAcao>
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-600">
            <tr>
              <th className="p-3">Barbearia</th>
              <th className="p-3">Login</th>
              <th className="p-3">Barbeiros</th>
              <th className="p-3">Clientes</th>
              <th className="p-3">Agendamentos</th>
            </tr>
          </thead>
          <tbody>
            {barbearias.map((b) => (
              <tr key={b.id} className="border-t border-stone-100">
                <td className="p-3">
                  <span className="font-medium">{b.nome}</span>
                  <Link href={`/b/${b.slug}`} target="_blank" className="block text-amber-700 underline">/b/{b.slug}</Link>
                </td>
                <td className="p-3">{b.usuarios.map((u) => u.email).join(", ")}</td>
                <td className="p-3">{b._count.barbeiros}</td>
                <td className="p-3">{b._count.clientes}</td>
                <td className="p-3">{b._count.agendamentos}</td>
              </tr>
            ))}
            {barbearias.length === 0 && (
              <tr><td colSpan={5} className="p-3 text-stone-500">Nenhuma barbearia cadastrada ainda.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Redefinir senha de um dono</h2>
        <FormAcao acao={trocarSenha} limparAoSalvar className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="email" type="email" className="input" placeholder="E-mail do login" required />
          <input name="senha" className="input" placeholder="Nova senha" minLength={6} required />
          <button className="btn-secundario">Alterar</button>
        </FormAcao>
      </section>
    </main>
  );
}
