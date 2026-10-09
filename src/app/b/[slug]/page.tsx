import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatarTelefone, linkWhatsApp } from "@/lib/formato";
import { diaDaSemana, diaLocal, somarDias } from "@/lib/tempo";
import { Agendar } from "./Agendar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const barbearia = await db.barbearia.findUnique({ where: { slug: (await params).slug } });
  return { title: barbearia ? `Agendar · ${barbearia.nome}` : "Barbearia não encontrada" };
}

export default async function PaginaPublica({ params }: Props) {
  const barbearia = await db.barbearia.findUnique({
    where: { slug: (await params).slug },
    include: {
      horarios: true,
      servicos: { where: { ativo: true }, orderBy: { precoCentavos: "asc" } },
      barbeiros: { where: { ativo: true }, orderBy: { nome: "asc" } },
    },
  });
  if (!barbearia) notFound();

  const diasAbertos = new Set(barbearia.horarios.map((h) => h.diaSemana));
  const hoje = diaLocal();
  const dias = Array.from({ length: barbearia.antecedenciaDias + 1 }, (_, i) => somarDias(hoje, i)).filter((d) =>
    diasAbertos.has(diaDaSemana(d)),
  );

  return (
    <main className="mx-auto max-w-lg p-4 pb-16">
      <header className="mb-6 rounded-2xl bg-stone-900 p-5 text-white">
        <h1 className="text-2xl font-bold">✂️ {barbearia.nome}</h1>
        {barbearia.endereco && <p className="mt-1 text-sm text-stone-300">{barbearia.endereco}</p>}
        {barbearia.telefone && (
          <a href={linkWhatsApp(barbearia.telefone)} target="_blank" className="mt-1 block text-sm text-amber-400">
            WhatsApp {formatarTelefone(barbearia.telefone)}
          </a>
        )}
      </header>

      {barbearia.servicos.length === 0 || barbearia.barbeiros.length === 0 || dias.length === 0 ? (
        <p className="card text-stone-600">O agendamento online ainda não está disponível. Fale com a barbearia pelo WhatsApp.</p>
      ) : (
        <Agendar
          slug={barbearia.slug}
          servicos={barbearia.servicos.map((s) => ({
            id: s.id,
            nome: s.nome,
            precoCentavos: s.precoCentavos,
            duracaoMin: s.duracaoMin,
          }))}
          barbeiros={barbearia.barbeiros.map((b) => ({ id: b.id, nome: b.nome }))}
          dias={dias}
        />
      )}
    </main>
  );
}
