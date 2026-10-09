"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarPlus, Check, Clock, Scissors } from "lucide-react";
import { formatarDinheiro, linkWhatsApp } from "@/lib/formato";
import { FUSO, criarDataHora } from "@/lib/tempo";
import { type Confirmacao, agendar, buscarHorarios } from "./actions";

type Servico = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  foto: string | null;
  precoCentavos: number;
  duracaoMin: number;
  barbeiroIds: string[];
};
type Barbeiro = { id: string; nome: string; foto: string | null };

const SEM_PREFERENCIA = "";
const CHAVE_CONTATO = "barbearia:contato";
const selecionado = "border-[var(--cor)] bg-[var(--cor)] text-[var(--cor-texto)]";

function rotuloDia(dia: string) {
  const data = criarDataHora(dia, "12:00");
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short" }).format(data).replace(".", "");
  const numero = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit" }).format(data);
  const mes = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, month: "short" }).format(data).replace(".", "");
  return { semana, numero, mes };
}

function linkGoogleAgenda(titulo: string, inicioISO: string, fimISO: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${f(inicioISO)}/${f(fimISO)}`;
}

export function Agendar({
  slug,
  nomeBarbearia,
  telefoneBarbearia,
  servicos,
  barbeiros,
  dias,
}: {
  slug: string;
  nomeBarbearia: string;
  telefoneBarbearia: string | null;
  servicos: Servico[];
  barbeiros: Barbeiro[];
  dias: string[];
}) {
  const [servico, setServico] = useState<Servico | null>(null);
  const [barbeiroId, setBarbeiroId] = useState<string | null>(null);
  const [dia, setDia] = useState(dias[0]);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<Extract<Confirmacao, { ok: true }> | null>(null);
  const [carregando, iniciar] = useTransition();
  const etapas = useRef<(HTMLElement | null)[]>([]);

  const rolarPara = (i: number) => setTimeout(() => etapas.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CONTATO) ?? "null");
      if (salvo) {
        setNome(salvo.nome ?? "");
        setTelefone(salvo.telefone ?? "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!servico || barbeiroId === null) return;
    setHora(null);
    setHorarios(null);
    let ativo = true;
    buscarHorarios(slug, servico.id, barbeiroId || null, dia).then((h) => ativo && setHorarios(h));
    return () => {
      ativo = false;
    };
  }, [slug, servico, barbeiroId, dia]);

  const disponiveis = servico ? barbeiros.filter((b) => servico.barbeiroIds.length === 0 || servico.barbeiroIds.includes(b.id)) : [];
  const categorias = [...new Set(servicos.map((s) => s.categoria))];

  function escolherServico(s: Servico) {
    setServico(s);
    const opcoes = barbeiros.filter((b) => s.barbeiroIds.length === 0 || s.barbeiroIds.includes(b.id));
    if (barbeiroId && !opcoes.some((b) => b.id === barbeiroId)) setBarbeiroId(null);
    if (opcoes.length === 1) {
      setBarbeiroId(opcoes[0].id);
      rolarPara(2);
    } else rolarPara(1);
  }

  function confirmar() {
    if (!servico || barbeiroId === null || !hora) return;
    setErro(null);
    iniciar(async () => {
      const r = await agendar(slug, { servicoId: servico.id, barbeiroId: barbeiroId || null, dia, hora, nome, telefone });
      if (r.ok) {
        try {
          localStorage.setItem(CHAVE_CONTATO, JSON.stringify({ nome, telefone }));
        } catch {}
        setConfirmado(r);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErro(r.erro);
        if (r.horarioOcupado) {
          setHora(null);
          setHorarios(await buscarHorarios(slug, servico.id, barbeiroId || null, dia));
          rolarPara(2);
        }
      }
    });
  }

  if (confirmado) {
    const r = confirmado.resumo;
    return (
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--cor)] text-[var(--cor-texto)]">
          <Check className="size-7" strokeWidth={3} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold">Horário marcado!</h2>
        <p className="mt-2 text-lg first-letter:uppercase">{r.dia}, às {r.hora}</p>
        <p className="text-couro-700">{r.servico} com {r.barbeiro}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <a href={linkGoogleAgenda(`${r.servico} · ${nomeBarbearia}`, r.inicioISO, r.fimISO)} target="_blank" className="btn-secundario">
            <CalendarPlus className="size-4" /> Salvar na agenda
          </a>
          <a href={`/b/${slug}/agendamento/${confirmado.token}`} className="btn-secundario">Ver ou cancelar</a>
        </div>
        {telefoneBarbearia && (
          <a href={linkWhatsApp(telefoneBarbearia, `Olá! Acabei de agendar ${r.servico} com ${r.barbeiro}: ${r.dia} às ${r.hora}. Nome: ${nome}.`)} target="_blank" className="mt-3 inline-block text-sm font-semibold text-couro-700 underline">
            Avisar a barbearia pelo WhatsApp
          </a>
        )}
        <p className="mt-6 text-xs text-couro-400">Guarde o link "Ver ou cancelar" para mudar de ideia depois.</p>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <section ref={(el) => { etapas.current[0] = el; }} className="scroll-mt-4">
        <Titulo numero={1} texto="Escolha o serviço" />
        {categorias.map((cat) => (
          <div key={cat} className="mb-5">
            {categorias.length > 1 && <p className="rotulo mb-2">{cat}</p>}
            <div className="space-y-2">
              {servicos.filter((s) => s.categoria === cat).map((s) => {
                const ativo = servico?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => escolherServico(s)}
                    aria-pressed={ativo}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-3 text-left transition ${ativo ? "border-[var(--cor)] shadow-md" : "border-transparent shadow-sm hover:border-black/10"}`}
                  >
                    {s.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.foto} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-fundo"><Scissors className="size-6 text-couro-400" /></span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.nome}</span>
                      {s.descricao && <span className="mt-0.5 line-clamp-2 block text-sm text-couro-400">{s.descricao}</span>}
                      <span className="mt-1 flex items-center gap-1 text-xs text-couro-400"><Clock className="size-3" /> {s.duracaoMin} min</span>
                    </span>
                    <span className="numero shrink-0 text-lg">{formatarDinheiro(s.precoCentavos)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {servico && (
        <section ref={(el) => { etapas.current[1] = el; }} className="scroll-mt-4">
          <Titulo numero={2} texto="Com quem?" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {disponiveis.length > 1 && (
              <BotaoBarbeiro ativo={barbeiroId === SEM_PREFERENCIA} nome="Sem preferência" onClick={() => { setBarbeiroId(SEM_PREFERENCIA); rolarPara(2); }} />
            )}
            {disponiveis.map((b) => (
              <BotaoBarbeiro key={b.id} ativo={barbeiroId === b.id} nome={b.nome} foto={b.foto} onClick={() => { setBarbeiroId(b.id); rolarPara(2); }} />
            ))}
          </div>
        </section>
      )}

      {servico && barbeiroId !== null && (
        <section ref={(el) => { etapas.current[2] = el; }} className="scroll-mt-4">
          <Titulo numero={3} texto="Dia e horário" />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {dias.map((d) => {
              const { semana, numero, mes } = rotuloDia(d);
              return (
                <button
                  key={d}
                  onClick={() => setDia(d)}
                  aria-pressed={dia === d}
                  className={`w-16 shrink-0 rounded-2xl border px-2 py-2.5 text-center transition ${dia === d ? selecionado : "border-black/[0.08] bg-white"}`}
                >
                  <span className="block text-[11px] font-medium capitalize opacity-80">{semana}</span>
                  <span className="numero block text-xl leading-tight">{numero}</span>
                  <span className="block text-[11px] capitalize opacity-70">{mes}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            {horarios === null ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {Array.from({ length: 8 }, (_, i) => <span key={i} className="h-10 animate-pulse rounded-xl bg-black/[0.05]" />)}
              </div>
            ) : horarios.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-center text-sm text-couro-700">Sem horários livres neste dia. Escolha outro dia acima.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {horarios.map((h) => (
                  <button
                    key={h}
                    onClick={() => { setHora(h); setErro(null); rolarPara(3); }}
                    aria-pressed={hora === h}
                    className={`rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition ${hora === h ? selecionado : "border-black/[0.08] bg-white hover:border-black/20"}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
          {erro && !hora && <p className="mt-3 rounded-xl bg-poste-vermelho/10 p-3 text-sm text-poste-vermelho">{erro}</p>}
        </section>
      )}

      {servico && hora && (
        <section ref={(el) => { etapas.current[3] = el; }} className="scroll-mt-4">
          <Titulo numero={4} texto="Seus dados" />
          <div className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-fundo p-3 text-sm">
              <p className="font-semibold">{servico.nome} · {formatarDinheiro(servico.precoCentavos)}</p>
              <p className="text-couro-700 first-letter:uppercase">
                {new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "long" }).format(criarDataHora(dia, "12:00"))} às {hora}
                {barbeiroId ? ` com ${barbeiros.find((b) => b.id === barbeiroId)?.nome}` : ""}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="nome-cliente">Seu nome</label>
              <input id="nome-cliente" className="input" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="tel-cliente">WhatsApp com DDD</label>
              <input id="tel-cliente" className="input" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} autoComplete="tel" placeholder="(11) 91234-5678" />
            </div>
            {erro && hora && <p className="text-sm text-poste-vermelho">{erro}</p>}
            <button
              className="w-full rounded-2xl bg-[var(--cor)] py-4 text-base font-bold text-[var(--cor-texto)] shadow-sm transition active:scale-[0.99] disabled:opacity-50"
              onClick={confirmar}
              disabled={carregando || !nome || !telefone}
            >
              {carregando ? "Agendando..." : "Confirmar agendamento"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Titulo({ numero, texto }: { numero: number; texto: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-bold">
      <span className="grid size-7 place-items-center rounded-full bg-couro-900 text-sm text-white">{numero}</span>
      {texto}
    </h2>
  );
}

function BotaoBarbeiro({ ativo, nome, foto, onClick }: { ativo: boolean; nome: string; foto?: string | null; onClick: () => void }) {
  const iniciais = nome === "Sem preferência" ? "?" : nome.split(" ").slice(0, 2).map((p) => p[0]).join("");
  return (
    <button onClick={onClick} aria-pressed={ativo} className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-white p-3 transition ${ativo ? "border-[var(--cor)] shadow-md" : "border-transparent shadow-sm"}`}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="size-14 rounded-full object-cover" />
      ) : (
        <span className={`grid size-14 place-items-center rounded-full font-display text-lg font-bold ${ativo ? "bg-[var(--cor)] text-[var(--cor-texto)]" : "bg-fundo text-couro-700"}`}>{iniciais}</span>
      )}
      <span className="text-center text-sm leading-tight font-medium">{nome}</span>
    </button>
  );
}
