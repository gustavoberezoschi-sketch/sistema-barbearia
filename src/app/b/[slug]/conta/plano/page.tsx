import type { Metadata } from "next";
import { Check, Crown } from "lucide-react";
import { exigirCliente } from "@/lib/clienteAuth";
import { db } from "@/lib/db";
import { formatarDinheiro, linkWhatsApp } from "@/lib/formato";
import { planoDoCliente } from "@/lib/publico";
import { diaLocal, formatarDia } from "@/lib/tempo";

export const metadata: Metadata = { title: "Meu plano" };

export default async function Plano({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cliente = await exigirCliente(slug);
  const [plano, b] = await Promise.all([
    planoDoCliente(cliente.id),
    db.barbearia.findUniqueOrThrow({
      where: { slug },
      select: { nome: true, telefone: true, planos: { where: { ativo: true, exibirOnline: true }, include: { servicos: { select: { nome: true, id: true } } }, orderBy: { precoCentavos: "asc" } } },
    }),
  ]);
  const atual = plano ? b.planos.find((p) => p.nome === plano.nome) : null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Plano</h1>
      {plano ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 font-display text-xl font-bold"><Crown className="size-5 text-[var(--cor)]" /> {plano.nome}</p>
          {plano.descricao && <p className="mt-1 text-sm text-couro-700">{plano.descricao}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-fundo p-3"><dt className="text-couro-400">Mensalidade</dt><dd className="numero text-lg">{formatarDinheiro(plano.precoCentavos)}</dd></div>
            <div className="rounded-xl bg-fundo p-3"><dt className="text-couro-400">Pago até</dt><dd className="numero text-lg">{formatarDia(plano.pagoAte)}</dd></div>
            <div className="col-span-2 rounded-xl bg-fundo p-3">
              <dt className="text-couro-400">Uso neste mês</dt>
              <dd className="font-semibold">{plano.limite ? `${plano.usados} de ${plano.limite} atendimento(s)` : `${plano.usados} atendimento(s) · ilimitado`}</dd>
            </div>
          </dl>
          {atual && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {atual.servicos.map((s) => <li key={s.id} className="flex items-center gap-2"><Check className="size-4 text-[var(--cor)]" /> {s.nome}</li>)}
            </ul>
          )}
          {plano.pagoAte < diaLocal() && <p className="mt-4 rounded-xl bg-poste-vermelho/10 p-3 text-sm text-poste-vermelho">A mensalidade está em aberto. Acerte na próxima visita para continuar usando o plano.</p>}
        </div>
      ) : (
        <p className="text-sm text-couro-700">Você ainda não é assinante. Conheça os planos:</p>
      )}

      {!plano && b.planos.map((p) => (
        <div key={p.id} className="rounded-2xl border-2 border-[var(--cor)] bg-white p-5">
          <p className="font-display text-lg font-bold">{p.nome}</p>
          <p className="numero mt-1 text-3xl">{formatarDinheiro(p.precoCentavos)}<span className="text-sm font-normal text-couro-400">/mês</span></p>
          {p.descricao && <p className="mt-2 text-sm text-couro-700">{p.descricao}</p>}
          <ul className="mt-3 space-y-1 text-sm">{p.servicos.map((s) => <li key={s.id} className="flex items-center gap-2"><Check className="size-4 text-[var(--cor)]" /> {s.nome}</li>)}</ul>
          <p className="mt-2 text-xs text-couro-400">{p.usosPorMes ? `Até ${p.usosPorMes} vez(es) por mês` : "Uso ilimitado"}</p>
          {b.telefone && (
            <a href={linkWhatsApp(b.telefone, `Olá! Sou ${cliente.nome} e quero assinar o plano ${p.nome}.`)} target="_blank" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--cor)] px-4 py-3 font-semibold text-[var(--cor-texto)]">
              Quero assinar
            </a>
          )}
        </div>
      ))}
      {!plano && b.planos.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-couro-400">A barbearia ainda não tem planos de assinatura.</p>}
    </div>
  );
}
