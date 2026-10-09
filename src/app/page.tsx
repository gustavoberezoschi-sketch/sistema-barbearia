import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const barbearias = await db.barbearia.findMany({ orderBy: { nome: "asc" } });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">✂️ Sistema Barbearia</h1>
        <p className="mt-2 text-stone-600">Agende seu horário ou acesse o painel da sua barbearia.</p>
      </div>

      {barbearias.length > 0 && (
        <div className="card space-y-2">
          <h2 className="font-semibold">Agendar horário</h2>
          {barbearias.map((b) => (
            <Link
              key={b.id}
              href={`/b/${b.slug}`}
              className="block rounded-lg border border-stone-200 px-4 py-3 hover:border-amber-600 hover:bg-amber-50"
            >
              <span className="font-medium">{b.nome}</span>
              {b.endereco && <span className="block text-sm text-stone-500">{b.endereco}</span>}
            </Link>
          ))}
        </div>
      )}

      <Link href="/login" className="btn-secundario">
        Entrar no painel da barbearia
      </Link>
    </main>
  );
}
