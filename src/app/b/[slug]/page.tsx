import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Crown, Instagram, MapPin, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui";
import { db } from "@/lib/db";
import { corDoTexto, formatarDinheiro, linkWhatsApp } from "@/lib/formato";
import { NOMES_DIAS, diaDaSemana, diaLocal, horaLocal, somarDias } from "@/lib/tempo";
import { Agendar } from "./Agendar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await db.barbearia.findUnique({ where: { slug: (await params).slug }, select: { nome: true, descricao: true } });
  return b
    ? { title: { absolute: `${b.nome} · Agende seu horário` }, description: b.descricao ?? `Agende seu horário na ${b.nome}.` }
    : { title: "Barbearia não encontrada" };
}

export default async function PaginaPublica({ params }: Props) {
  const b = await db.barbearia.findUnique({
    where: { slug: (await params).slug },
    include: {
      horarios: { orderBy: { diaSemana: "asc" } },
      servicos: { where: { ativo: true, exibirOnline: true }, include: { barbeiros: { select: { id: true } } }, orderBy: [{ categoria: "asc" }, { precoCentavos: "asc" }] },
      barbeiros: { where: { ativo: true }, orderBy: { nome: "asc" } },
      planos: { where: { ativo: true, exibirOnline: true }, include: { servicos: { select: { nome: true } } }, orderBy: { precoCentavos: "asc" } },
    },
  });
  if (!b) notFound();

  const hoje = diaLocal();
  const abertos = new Set(b.horarios.map((h) => h.diaSemana));
  const dias = Array.from({ length: b.antecedenciaDias + 1 }, (_, i) => somarDias(hoje, i)).filter((d) => abertos.has(diaDaSemana(d)));
  const hojeHorario = b.horarios.find((h) => h.diaSemana === diaDaSemana(hoje));
  const agora = horaLocal(new Date());
  const abertoAgora = !!hojeHorario && agora >= hojeHorario.abre && agora < hojeHorario.fecha;
  const cor = b.corDestaque;
  const estilo = { "--cor": cor, "--cor-texto": corDoTexto(cor) } as React.CSSProperties;

  return (
    <main className="min-h-screen bg-[#f6f5f3] pb-24" style={estilo}>
      {/* Capa */}
      <header className="relative">
        <div className="relative h-44 w-full overflow-hidden bg-couro-900 sm:h-60">
          {b.capa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.capa} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full" style={{ backgroundImage: `repeating-linear-gradient(-45deg, ${cor}22 0 18px, transparent 18px 36px)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-couro-950/70 via-couro-950/10 to-transparent" />
        </div>
        <div className="mx-auto -mt-14 max-w-3xl px-4">
          <div className="relative rounded-3xl bg-white p-5 shadow-[0_10px_40px_-12px_rgba(20,16,14,0.25)] sm:p-6">
            <div className="flex items-start gap-4">
              {b.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo} alt={`Logo ${b.nome}`} className="-mt-12 size-20 shrink-0 rounded-2xl border-4 border-white object-cover shadow-md sm:size-24" />
              ) : (
                <span className="-mt-12 grid size-20 shrink-0 place-items-center rounded-2xl border-4 border-white font-display text-3xl font-bold shadow-md sm:size-24" style={{ background: cor, color: corDoTexto(cor) }}>
                  {b.nome[0]}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl leading-tight font-bold sm:text-3xl">{b.nome}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm">
                  <span className={`size-2 rounded-full ${abertoAgora ? "bg-emerald-500" : "bg-couro-300"}`} />
                  {abertoAgora ? `Aberto agora · fecha às ${hojeHorario!.fecha}` : hojeHorario ? `Hoje das ${hojeHorario.abre} às ${hojeHorario.fecha}` : "Fechado hoje"}
                </p>
              </div>
            </div>
            {b.descricao && <p className="mt-4 text-[15px] leading-relaxed text-couro-700">{b.descricao}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {b.endereco && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.endereco)}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-fundo px-3 py-1.5 hover:bg-black/[0.06]">
                  <MapPin className="size-4" /> {b.endereco}
                </a>
              )}
              {b.telefone && (
                <a href={linkWhatsApp(b.telefone)} target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-fundo px-3 py-1.5 hover:bg-black/[0.06]">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
              {b.instagram && (
                <a href={`https://instagram.com/${b.instagram}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-fundo px-3 py-1.5 hover:bg-black/[0.06]">
                  <Instagram className="size-4" /> @{b.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-10 px-4 pt-8">
        {b.servicos.length === 0 || b.barbeiros.length === 0 || dias.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-couro-700">O agendamento online ainda não está disponível. Fale com a gente pelo WhatsApp.</p>
        ) : (
          <Agendar
            slug={b.slug}
            nomeBarbearia={b.nome}
            telefoneBarbearia={b.telefone}
            servicos={b.servicos.map((s) => ({
              id: s.id,
              nome: s.nome,
              categoria: s.categoria,
              descricao: s.descricao,
              foto: s.foto,
              precoCentavos: s.precoCentavos,
              duracaoMin: s.duracaoMin,
              barbeiroIds: s.barbeiros.map((x) => x.id),
            }))}
            barbeiros={b.barbeiros.map((x) => ({ id: x.id, nome: x.nome, foto: x.foto }))}
            dias={dias}
          />
        )}

        {b.planos.length > 0 && (
          <section>
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-bold"><Crown className="size-5" style={{ color: cor }} /> Clube de assinatura</h2>
            <p className="mb-4 text-sm text-couro-400">Pague um valor fixo por mês e venha quando quiser.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {b.planos.map((p) => (
                <div key={p.id} className="rounded-2xl border-2 bg-white p-5" style={{ borderColor: cor }}>
                  <p className="font-display text-lg font-bold">{p.nome}</p>
                  <p className="numero mt-1 text-3xl">{formatarDinheiro(p.precoCentavos)}<span className="text-sm font-normal text-couro-400">/mês</span></p>
                  <p className="mt-2 text-sm text-couro-700">{p.descricao ?? p.servicos.map((s) => s.nome).join(", ")}</p>
                  <p className="mt-1 text-xs text-couro-400">{p.usosPorMes ? `Até ${p.usosPorMes} vez(es) por mês` : "Uso ilimitado"}</p>
                  {b.telefone && (
                    <a href={linkWhatsApp(b.telefone, `Olá! Quero assinar o plano ${p.nome} da ${b.nome}.`)} target="_blank" className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: cor, color: corDoTexto(cor) }}>
                      Quero assinar
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 font-display text-xl font-bold">Equipe</h2>
            <ul className="space-y-3">
              {b.barbeiros.map((x) => (
                <li key={x.id} className="flex items-center gap-3"><Avatar nome={x.nome} foto={x.foto} tamanho={44} /><span className="font-medium">{x.nome}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold"><Clock className="size-5" /> Horários</h2>
            <ul className="space-y-1.5 text-sm">
              {NOMES_DIAS.map((nome, d) => {
                const h = b.horarios.find((x) => x.diaSemana === d);
                return (
                  <li key={d} className={`flex justify-between ${d === diaDaSemana(hoje) ? "font-semibold" : ""}`}>
                    <span>{nome}</span>
                    <span className="tabular-nums text-couro-700">{h ? `${h.abre} às ${h.fecha}` : "Fechado"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
