import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { sair } from "../login/actions";

const MENU = [
  { href: "/painel", rotulo: "Agenda" },
  { href: "/painel/clientes", rotulo: "Clientes" },
  { href: "/painel/servicos", rotulo: "Serviços" },
  { href: "/painel/barbeiros", rotulo: "Barbeiros" },
  { href: "/painel/relatorios", rotulo: "Relatórios" },
  { href: "/painel/configuracoes", rotulo: "Configurações" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const barbearia = await db.barbearia.findUnique({ where: { id: sessao.barbeariaId } });

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-800 bg-stone-900 text-stone-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-bold">✂️ {barbearia?.nome}</span>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {MENU.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 hover:bg-stone-800">
                {item.rotulo}
              </Link>
            ))}
          </nav>
          <form action={sair} className="flex items-center gap-3 text-sm text-stone-400">
            <span>{sessao.nome}</span>
            <button className="rounded-md px-2 py-1 hover:bg-stone-800 hover:text-white">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
