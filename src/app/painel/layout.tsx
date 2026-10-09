import { Menu } from "@/components/Menu";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { sair } from "../login/actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const barbearia = await db.barbearia.findUnique({
    where: { id: sessao.barbeariaId },
    select: { nome: true, logo: true },
  });

  return (
    <div className="min-h-screen">
      <Menu barbearia={barbearia?.nome ?? ""} logo={barbearia?.logo ?? null} usuario={sessao.nome} papel={sessao.papel} sair={sair} />
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
