import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { corDoTexto, formatarDinheiro, linkWhatsApp } from "@/lib/formato";
import { diaLocal, formatarDiaExtenso, horaLocal } from "@/lib/tempo";
import { Cancelar } from "./Cancelar";

export const metadata: Metadata = { title: "Meu agendamento", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Não compareceu",
};

export default async function MeuAgendamento({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const ag = await db.agendamento.findFirst({
    where: { token, barbearia: { slug } },
    include: { barbearia: true, servico: true, barbeiro: true, cliente: true },
  });
  if (!ag) notFound();
  const grupo = ag.grupo
    ? await db.agendamento.findMany({ where: { grupo: ag.grupo }, include: { servico: true }, orderBy: { inicio: "asc" } })
    : [ag];
  const total = grupo.reduce((s, x) => s + x.precoCentavos, 0);
  const cor = ag.barbearia.corDestaque;
  const ativo = ag.status === "AGENDADO" || ag.status === "CONFIRMADO";
  const podeCancelar = ativo && ag.inicio.getTime() - Date.now() >= ag.barbearia.cancelamentoHoras * 3600_000;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4" style={{ "--cor": cor, "--cor-texto": corDoTexto(cor) } as React.CSSProperties}>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="rotulo">{ag.barbearia.nome}</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Olá, {ag.cliente.nome.split(" ")[0]}</h1>
        <div className="mt-5 rounded-2xl bg-fundo p-4">
          <p className="text-sm font-semibold" style={{ color: ativo ? undefined : "#c2412d" }}>{STATUS[ag.status]}</p>
          <p className="mt-1 text-lg font-semibold first-letter:uppercase">{formatarDiaExtenso(diaLocal(ag.inicio))}, às {horaLocal(ag.inicio)}</p>
          <p className="text-couro-700">{grupo.map((x) => x.servico.nome).join(" + ")} com {ag.barbeiro.nome} · {formatarDinheiro(total)}</p>
          {ag.barbearia.endereco && <p className="mt-2 text-sm text-couro-400">{ag.barbearia.endereco}</p>}
        </div>
        {podeCancelar && <Cancelar slug={slug} token={token} />}
        {ativo && !podeCancelar && (
          <p className="mt-4 text-sm text-couro-400">Para cancelar ou remarcar agora, fale direto com a barbearia.</p>
        )}
        <div className="mt-4 grid gap-2">
          {ag.barbearia.telefone && (
            <a href={linkWhatsApp(ag.barbearia.telefone, `Olá! Sobre meu horário de ${formatarDiaExtenso(diaLocal(ag.inicio))} às ${horaLocal(ag.inicio)} (${ag.cliente.nome})...`)} target="_blank" className="btn-secundario">
              Falar com a barbearia
            </a>
          )}
          <Link href={`/b/${slug}/agendar`} className="btn-secundario">Fazer novo agendamento</Link>
          <Link href={`/b/${slug}/conta/agendamentos`} className="btn-secundario">Meus agendamentos</Link>
        </div>
      </div>
    </main>
  );
}
