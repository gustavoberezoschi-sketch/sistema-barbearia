"use client";

import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Expand,
  Gift,
  Home,
  MapPin,
  Package,
  Pause,
  Play,
  Receipt,
  RotateCcw,
  Scissors,
  User,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Marca } from "@/components/Marca";
import { formatarDinheiro, linkWhatsApp } from "@/lib/formato";
import FALA_MS from "./duracoes.json";
import FALAS from "./falas.json";
import { Klaro } from "./Klaro";
import "./apresentacao.css";

type Plano = { nome: string; mensal: number; anual: number; unidades: number | null; assinantes: number | null };
type Props = { para: string | null; whatsapp: string | null; planos: Plano[]; video?: boolean };

// ---------- utilidades de animação ----------

const atraso = (d: number) => ({ "--d": `${d}s` }) as CSSProperties;

function A({ d = 0, c = "ap-sobe", className = "", as: Tag = "div", children }: { d?: number; c?: string; className?: string; as?: "div" | "li"; children?: ReactNode }) {
  return <Tag className={`${c} ${className}`} style={atraso(d)}>{children}</Tag>;
}

/** Quantos marcos de tempo (ms desde que a cena abriu) já passaram. */
function useMarcos(marcos: number[]) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ids = marcos.map((ms, i) => setTimeout(() => setN(i + 1), ms));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return n;
}

/** Número que sobe de 0 até o alvo. */
function useContador(alvo: number, inicioMs = 0, duracaoMs = 1600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const id = setTimeout(() => {
      const t0 = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - t0) / duracaoMs);
        setV(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, inicioMs);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, [alvo, inicioMs, duracaoMs]);
  return v;
}

// ---------- molduras ----------

function Celular({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative h-[420px] w-[210px] shrink-0 overflow-hidden rounded-[34px] border-[7px] border-couro-800 bg-white text-tinta shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:h-[520px] sm:w-[260px] ${className}`}>
      <div className="absolute top-1.5 left-1/2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-couro-800" />
      {children}
    </div>
  );
}

function Janela({ titulo, children, className = "" }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/10 bg-white text-tinta shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-fundo px-3 py-2">
        <span className="size-2.5 rounded-full bg-poste-vermelho/70" />
        <span className="size-2.5 rounded-full bg-latao-500/70" />
        <span className="size-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-2 text-[11px] font-semibold text-couro-400">{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function Cena({ rotulo, titulo, texto, itens, visual }: { rotulo: string; titulo: ReactNode; texto: string; itens?: string[]; visual: ReactNode }) {
  return (
    <div className="grid h-full content-center items-center gap-6 md:grid-cols-[1fr_1.1fr] md:gap-12">
      <div>
        <A d={0.05} className="mb-3 text-xs font-bold tracking-[0.18em] text-verde-claro uppercase">{rotulo}</A>
        <A d={0.2}><h2 className="font-display text-[28px] leading-[1.05] font-bold tracking-tight text-white sm:text-5xl">{titulo}</h2></A>
        <A d={0.4}><p className="mt-3 max-w-md text-[15px] text-couro-300 sm:mt-4 sm:text-lg">{texto}</p></A>
        {itens && (
          <ul className="mt-6 hidden space-y-2.5 sm:block">
            {itens.map((t, i) => (
              <A key={t} as="li" d={0.7 + i * 0.18} c="ap-esq" className="flex items-center gap-3 text-white/90">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-latao-500/15 text-verde-claro"><Check className="size-3.5" strokeWidth={3} /></span>
                {t}
              </A>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-center">{visual}</div>
    </div>
  );
}

// ---------- cenas ----------

function Abertura({ para, falando }: { para: string | null; falando: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <A d={0.1} c="ap-largura" className="ap-poste mb-10 h-3 w-48 rounded-full sm:w-72" />
      <A d={0.3} c="ap-pop" className="relative">
        <Klaro falando={falando} acenando className="size-36 drop-shadow-2xl sm:size-44" />
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-xs font-bold tracking-[0.2em] text-tinta">KLARO</span>
      </A>
      <A d={0.8}><h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">Klareza<span className="text-verde-claro">Barber</span></h1></A>
      <A d={1.3}><p className="mt-4 max-w-xl text-lg text-couro-300 sm:text-2xl">Sua barbearia organizada, com a agenda cheia e recebendo todo mês.</p></A>
      {para && (
        <A d={2} className="mt-8 rounded-full border border-latao-500/40 bg-latao-500/10 px-5 py-2 text-sm font-semibold text-white">
          Apresentação para <span className="text-verde-claro">{para}</span>
        </A>
      )}
    </div>
  );
}

/** Cada problema é riscado quando o Klaro fala dele: posição da palavra na fala da cena 2, em segundos. */
const momentoDaPalavra = (palavra: number) => (700 + (palavra / FALAS[1].legenda.split(" ").length) * FALA_MS[1]) / 1000;
const RISCOS = [9, 17, 21, 25].map(momentoDaPalavra);

function Problema() {
  const dores = ["Agenda no caderno e no WhatsApp", "Cliente que marca e não aparece", "Mensalidade que ninguém lembra de cobrar", "Caixa que não bate no fim do dia"];
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center">
      <A d={0.1} className="mb-6 text-xs font-bold tracking-[0.18em] text-verde-claro uppercase">Hoje, na maioria das barbearias</A>
      <ul className="space-y-4 sm:space-y-5">
        {dores.map((t, i) => (
          <A key={t} as="li" d={0.3 + i * 0.35} c="ap-esq" className="font-display text-2xl font-bold text-white sm:text-4xl">
            <span className="ap-risca" style={{ "--r": `${RISCOS[i]}s` } as CSSProperties}>{t}</span>
          </A>
        ))}
      </ul>
      <A d={momentoDaPalavra(26)} className="mt-10">
        <p className="font-display text-2xl font-bold text-verde-claro sm:text-4xl">Dá para resolver tudo isso num lugar só.</p>
      </A>
    </div>
  );
}

function TelaCel({ i, tela, children }: { i: number; tela: number; children: ReactNode }) {
  return (
    <div className="absolute inset-0 px-3.5 pt-9 pb-3 transition-transform duration-500 ease-out" style={{ transform: `translateX(${(i - tela) * 100}%)` }}>
      {children}
    </div>
  );
}

function Agendamento({ nome }: { nome: string }) {
  const n = useMarcos([1300, 2300, 2900, 3400, 4500, 5300, 6300]);
  const tela = n < 2 ? 0 : n < 5 ? 1 : n < 7 ? 2 : 3;
  const barbeiros = ["Carlos", "Rafael", "Bruno"];
  const servicos = [
    { s: "Corte", v: "R$ 45", m: 3 },
    { s: "Barba", v: "R$ 35", m: 4 },
    { s: "Sobrancelha", v: "R$ 15", m: 99 },
  ];
  const horas = ["09:00", "09:30", "10:30", "11:00", "13:30", "14:00", "15:30", "16:00", "17:30"];
  return (
    <Cena
      rotulo="Agendamento online"
      titulo={<>O cliente agenda <span className="text-verde-claro">sozinho</span>, a qualquer hora.</>}
      texto="Um link no Instagram e no WhatsApp. O cliente escolhe o barbeiro, os serviços e o horário, sem você parar o corte para responder mensagem."
      itens={["Funciona no celular, sem baixar aplicativo", "Nunca marca dois clientes no mesmo horário", "Vários serviços de uma vez, com o total na hora"]}
      visual={
        <Celular>
          <div className="absolute inset-x-0 top-0 z-10 h-8 bg-white" />
          <TelaCel i={0} tela={tela}>
            <p className="text-[10px] font-semibold text-couro-400">{nome}</p>
            <p className="font-display text-lg font-bold">Escolha o profissional</p>
            <div className="mt-3 space-y-2">
              {barbeiros.map((b, i) => (
                <div key={b} className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 transition ${n >= 1 && i === 0 ? "border-latao-500 bg-latao-50" : "border-black/[0.06]"}`}>
                  <span className="grid size-10 place-items-center rounded-full bg-couro-900 font-display font-bold text-verde-claro">{b[0]}</span>
                  <span className="text-sm font-semibold">{b}</span>
                  {n >= 1 && i === 0 && <Check className="ml-auto size-4 text-latao-600" strokeWidth={3} />}
                </div>
              ))}
            </div>
            {n === 1 && <span className="ap-toque absolute top-[118px] left-[60px] size-10 rounded-full bg-latao-500" />}
          </TelaCel>
          <TelaCel i={1} tela={tela}>
            <p className="text-[10px] font-semibold text-couro-400">Com Carlos</p>
            <p className="font-display text-lg font-bold">Serviços</p>
            <div className="mt-3 space-y-2">
              {servicos.map((s) => (
                <div key={s.s} className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-sm transition ${n >= s.m ? "border-latao-500 bg-latao-50" : "border-black/[0.06]"}`}>
                  <span className={`grid size-5 place-items-center rounded-md border ${n >= s.m ? "border-latao-500 bg-latao-500 text-white" : "border-black/20"}`}>{n >= s.m && <Check className="size-3" strokeWidth={3} />}</span>
                  <span className="font-medium">{s.s}</span>
                  <span className="ml-auto text-couro-400">{s.v}</span>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-3.5 bottom-3 flex items-center justify-between rounded-xl bg-couro-900 px-3 py-2.5 text-white">
              <span className="text-xs text-couro-300">{n >= 4 ? "2 serviços · 1h" : n >= 3 ? "1 serviço · 30min" : "Nenhum"}</span>
              <span className="font-display font-bold">{n >= 4 ? "R$ 80" : n >= 3 ? "R$ 45" : "R$ 0"}</span>
            </div>
          </TelaCel>
          <TelaCel i={2} tela={tela}>
            <p className="text-[10px] font-semibold text-couro-400">Corte + Barba · 1h</p>
            <p className="font-display text-lg font-bold">Sábado, 14</p>
            <div className="mt-3 flex gap-1.5">
              {["Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
                <span key={d} className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold ${i === 2 ? "bg-couro-900 text-white" : "bg-fundo text-couro-400"}`}>{d}<br />{12 + i}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {horas.map((h) => (
                <span key={h} className={`rounded-lg border py-2 text-center text-xs font-semibold transition ${n >= 6 && h === "10:30" ? "border-latao-500 bg-latao-500 text-white" : "border-black/[0.08]"}`}>{h}</span>
              ))}
            </div>
          </TelaCel>
          <TelaCel i={3} tela={tela}>
            <div className="flex h-full flex-col items-center justify-center text-center">
              {tela === 3 && (
                <>
                  <A c="ap-pop"><span className="grid size-16 place-items-center rounded-full bg-emerald-500 text-white"><Check className="size-8" strokeWidth={3} /></span></A>
                  <A d={0.25}><p className="mt-4 font-display text-xl font-bold">Horário marcado!</p></A>
                  <A d={0.4}><p className="mt-1 text-sm text-couro-400">Sábado, 14 às 10:30<br />com Carlos</p></A>
                  <A d={0.6} className="mt-5 w-full rounded-xl bg-fundo p-3 text-left text-xs">
                    <p className="flex justify-between"><span>Corte</span><span>R$ 45</span></p>
                    <p className="flex justify-between"><span>Barba</span><span>R$ 35</span></p>
                    <p className="mt-1 flex justify-between border-t border-black/10 pt-1 font-bold"><span>Total</span><span>R$ 80</span></p>
                  </A>
                </>
              )}
            </div>
          </TelaCel>
        </Celular>
      }
    />
  );
}

function Agenda() {
  const cols = ["Carlos", "Rafael", "Bruno"];
  const h0 = 9;
  const altura = 46;
  const blocos = [
    { c: 0, i: 9, d: 0.5, n: "João S.", s: "Corte" },
    { c: 0, i: 10.5, d: 1, n: "Pedro A.", s: "Corte + Barba" },
    { c: 0, i: 12, d: 0.5, n: "Lucas M.", s: "Barba" },
    { c: 1, i: 9.5, d: 1, n: "Marcos L.", s: "Corte + Barba" },
    { c: 1, i: 11, d: 0.5, n: "André P.", s: "Corte" },
    { c: 1, i: 12.5, d: 0.5, n: "Felipe R.", s: "Pigmentação" },
    { c: 2, i: 9, d: 0.5, n: "Thiago C.", s: "Corte" },
    { c: 2, i: 10, d: 0.5, n: "Diego F.", s: "Sobrancelha" },
    { c: 2, i: 11.5, d: 1, n: "Rafael T.", s: "Corte + Barba" },
  ];
  const cores = ["bg-latao-100 border-latao-500 text-latao-700", "bg-sky-50 border-poste-azul text-poste-azul", "bg-rose-50 border-poste-vermelho text-poste-vermelho"];
  return (
    <Cena
      rotulo="Agenda da equipe"
      titulo={<>A agenda de todo mundo, <span className="text-verde-claro">em tempo real</span>.</>}
      texto="Cada barbeiro com sua coluna. O que entra pelo site aparece na hora, e você encaixa, bloqueia ou remarca com um toque."
      itens={["Bloqueio de almoço, folga e feriado", "Cada barbeiro pode ter o próprio login", "Histórico completo de cada cliente"]}
      visual={
        <Janela titulo="Agenda · Sábado, 14">
          <div className="p-3">
            <div className="grid grid-cols-[38px_1fr_1fr_1fr] gap-1.5 text-[11px] font-semibold">
              <span />
              {cols.map((c) => <span key={c} className="rounded-lg bg-fundo py-1.5 text-center">{c}</span>)}
            </div>
            <div className="relative mt-1.5 grid grid-cols-[38px_1fr_1fr_1fr] gap-1.5" style={{ height: altura * 4.5 }}>
              <div className="relative">
                {[9, 10, 11, 12, 13].map((h) => (
                  <span key={h} className="absolute -translate-y-1/2 text-[10px] text-couro-400" style={{ top: (h - h0) * altura }}>{h}:00</span>
                ))}
              </div>
              {cols.map((c, ci) => (
                <div key={c} className="relative rounded-lg bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_45px,rgba(0,0,0,0.05)_45px,rgba(0,0,0,0.05)_46px)]">
                  {blocos.filter((b) => b.c === ci).map((b, k) => (
                    <div
                      key={b.n}
                      className={`ap-pop absolute inset-x-0.5 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 ${cores[ci]}`}
                      style={{ top: (b.i - h0) * altura + 1, height: b.d * altura - 3, ...atraso(0.5 + k * 0.35 + ci * 0.15) }}
                    >
                      <p className="truncate text-[10px] font-bold">{b.n}</p>
                      <p className="truncate text-[9px] opacity-80">{b.s}</p>
                    </div>
                  ))}
                </div>
              ))}
              <div className="ap-agora pointer-events-none absolute right-0 left-[38px] z-10 flex items-center" style={{ "--de": `${0.3 * altura}px`, "--ate": `${2.6 * altura}px` } as CSSProperties}>
                <span className="ap-poste h-[5px] flex-1 rounded-full shadow" />
              </div>
            </div>
            <div className="ap-sobe mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800" style={atraso(4.2)}>
              <Bell className="size-3.5 shrink-0" /> <span>Novo agendamento online: <strong>Rafael T.</strong> às 11:30 com Bruno</span>
            </div>
          </div>
        </Janela>
      }
    />
  );
}

function Lembretes({ nome }: { nome: string }) {
  const n = useMarcos([1500, 2600, 4200, 5200]);
  const lista = [
    { n: "João Silva", h: "09:00", b: "Carlos" },
    { n: "Pedro Alves", h: "10:30", b: "Carlos" },
    { n: "Marcos Lima", h: "11:00", b: "Rafael" },
  ];
  return (
    <Cena
      rotulo="Lembretes no WhatsApp"
      titulo={<>Menos cadeira vazia por <span className="text-verde-claro">falta</span>.</>}
      texto="Um toque e o WhatsApp abre com a mensagem pronta: dia, horário, barbeiro e link para confirmar ou desmarcar."
      itens={["Mensagens com o jeito da sua barbearia", "O cliente confirma pelo link", "Sem mensalidade de API de WhatsApp"]}
      visual={
        <div className="relative w-full max-w-[520px] pb-24 sm:pb-16">
          <Janela titulo="Lembretes · amanhã">
            <ul className="divide-y divide-black/[0.06] px-3 py-1">
              {lista.map((c, i) => {
                const enviado = (i === 0 && n >= 2) || (i === 1 && n >= 4);
                return (
                  <li key={c.n} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="grid size-8 place-items-center rounded-full bg-fundo text-xs font-bold">{c.n[0]}</span>
                    <span className="flex-1"><span className="block font-semibold">{c.n}</span><span className="text-xs text-couro-400">{c.h} com {c.b}</span></span>
                    <span className={`relative rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${enviado ? "bg-emerald-50 text-emerald-700" : "bg-[#25d366] text-white"}`}>
                      {enviado ? "Enviado ✓" : "Enviar"}
                      {((i === 0 && n === 1) || (i === 1 && n === 3)) && <span className="ap-toque absolute -inset-2 rounded-full bg-[#25d366]" />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Janela>
          {n >= 1 && (
            <div className="ap-sobe absolute right-0 -bottom-2 w-[270px] rounded-2xl bg-[#e9e2d6] p-2.5 text-tinta shadow-2xl sm:-right-6 sm:w-[300px]">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#075e54]"><span className="size-5 rounded-full bg-[#25d366]" /> João Silva</p>
              <div className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 text-[11px] leading-snug text-tinta shadow-sm">
                Oi, João! Passando para lembrar do seu horário amanhã, <strong>sábado às 09:00</strong> com Carlos na {nome}. Confirma pelo link: klareza.app/c/8f2a ✂️
              </div>
              {n >= 3 && <div className="ap-pop mt-1.5 w-fit rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-[11px] shadow-sm">Confirmado, tô lá! 👊</div>}
            </div>
          )}
        </div>
      }
    />
  );
}

function Clube() {
  const assinantes = useContador(120, 700, 2200);
  const receita = useContador(1068000, 700, 2200);
  const meses = [22, 34, 45, 61, 78, 100];
  return (
    <Cena
      rotulo="Clube de assinatura"
      titulo={<>Dinheiro entrando <span className="text-verde-claro">todo mês</span>, mesmo com a agenda vazia.</>}
      texto="Monte planos como “corte ilimitado” ou “corte + barba”. O cliente cadastra o cartão uma vez e a mensalidade é cobrada sozinha todo mês."
      itens={["Cobrança automática no cartão, todo mês", "O dinheiro cai direto na conta da barbearia", "O cliente cancela quando quiser pelo app"]}
      visual={
        <div className="w-full max-w-[460px] rounded-3xl border border-white/10 bg-couro-900 p-5 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:p-6">
          <div className="flex items-center gap-2 text-sm text-couro-300"><Crown className="size-4 text-verde-claro" /> Clube Corte Ilimitado · R$ 89/mês</div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-couro-400">Assinantes ativos</p>
              <p className="numero text-4xl text-white sm:text-5xl">{assinantes}</p>
            </div>
            <div>
              <p className="text-xs text-couro-400">Receita garantida / mês</p>
              <p className="numero text-3xl text-verde-claro sm:text-4xl">{formatarDinheiro(receita).replace(",00", "")}</p>
            </div>
          </div>
          <div className="mt-6 flex h-28 items-end gap-2.5">
            {meses.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end"><div className="ap-cresce w-full rounded-t-md bg-gradient-to-t from-latao-500 to-verde-claro" style={{ height: `${h}%`, ...atraso(0.6 + i * 0.2) }} /></div>
                <span className="text-[10px] text-couro-400">{["Mai", "Jun", "Jul", "Ago", "Set", "Out"][i]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Cartão de crédito", "Débito automático", "Renova sozinho"].map((t, i) => (
              <A key={t} d={2.4 + i * 0.2} c="ap-pop" className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{t}</A>
            ))}
          </div>
        </div>
      }
    />
  );
}

function Comanda() {
  const itens = [
    { n: "Corte", v: 4500 },
    { n: "Barba", v: 3500 },
    { n: "Pomada modeladora", v: 3900 },
  ];
  const total = useContador(11900, 1800, 900);
  return (
    <Cena
      rotulo="Comanda, caixa e estoque"
      titulo={<>Do corte ao caixa, <span className="text-verde-claro">tudo batendo</span>.</>}
      texto="Abra a comanda, lance serviços e produtos e feche no Pix, cartão ou dinheiro. O estoque baixa e a comissão é calculada sozinha."
      itens={["Fechamento de caixa com sangria e suprimento", "Comissão de cada barbeiro", "Aviso de produto acabando"]}
      visual={
        <div className="relative flex w-full max-w-[520px] flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="relative w-full shrink-0 rounded-2xl bg-white p-4 text-tinta shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:w-[260px]">
            <p className="flex items-center gap-2 font-display font-bold"><Receipt className="size-4 text-latao-600" /> Comanda #148</p>
            <p className="text-xs text-couro-400">Pedro Alves · com Carlos</p>
            <ul className="mt-3 space-y-2 text-sm">
              {itens.map((it, i) => (
                <A key={it.n} as="li" d={0.5 + i * 0.4} c="ap-esq" className="flex justify-between">
                  <span>{it.n}</span><span className="tabular-nums">{formatarDinheiro(it.v)}</span>
                </A>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-dashed border-black/15 pt-2 font-display text-lg font-bold">
              <span>Total</span><span className="tabular-nums">{formatarDinheiro(total)}</span>
            </div>
            <span className="ap-carimbo absolute top-4 right-3 rounded-md border-[3px] border-emerald-600 px-2 py-0.5 font-display text-sm font-extrabold text-emerald-600" style={atraso(3)}>PAGO · PIX</span>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-xs sm:block sm:space-y-3 sm:text-sm">
            <A d={3.4} c="ap-dir" className="rounded-2xl bg-couro-900 p-3 text-white">
              <p className="flex items-center gap-1.5 text-[11px] text-couro-400"><Package className="size-3.5" /> Estoque</p>
              <p className="font-semibold">Pomada: 12 → <span className="text-verde-claro">11</span></p>
            </A>
            <A d={3.8} c="ap-dir" className="rounded-2xl bg-couro-900 p-3 text-white">
              <p className="flex items-center gap-1.5 text-[11px] text-couro-400"><Scissors className="size-3.5" /> Comissão Carlos</p>
              <p className="font-semibold">+ R$ 32,00</p>
            </A>
            <A d={4.2} c="ap-dir" className="rounded-2xl bg-latao-500 p-3 text-white">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold"><Wallet className="size-3.5" /> Caixa de hoje</p>
              <p className="font-display font-bold sm:text-lg">R$ 1.284,00</p>
            </A>
          </div>
        </div>
      }
    />
  );
}

function Financeiro() {
  const fat = useContador(2874000, 400, 1800);
  const ticket = useContador(6800, 600, 1600);
  const atend = useContador(423, 800, 1600);
  const dias = [52, 64, 48, 70, 88, 100, 30];
  return (
    <Cena
      rotulo="Financeiro e relatórios"
      titulo={<>Saiba quanto a barbearia <span className="text-verde-claro">realmente</span> fatura.</>}
      texto="Faturamento, despesas, contas a pagar, ticket médio e o desempenho de cada barbeiro, sem planilha."
      itens={["Relatório por barbeiro, serviço e forma de pagamento", "Contas a pagar com vencimento", "Clientes sumidos para chamar de volta"]}
      visual={
        <Janela titulo="Relatórios · Outubro">
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              { r: "Faturamento", v: formatarDinheiro(fat).replace(/,\d\d$/, "") },
              { r: "Ticket médio", v: formatarDinheiro(ticket) },
              { r: "Atendimentos", v: String(atend) },
            ].map((k, i) => (
              <A key={k.r} d={0.2 + i * 0.15} className="rounded-xl bg-fundo p-2.5">
                <p className="text-[10px] font-semibold text-couro-400 uppercase">{k.r}</p>
                <p className="numero text-base sm:text-xl">{k.v}</p>
              </A>
            ))}
          </div>
          <div className="flex h-40 items-end gap-2 px-4 pb-2">
            {dias.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end"><div className={`ap-cresce w-full rounded-t-md ${i === 5 ? "bg-latao-500" : "bg-couro-900"}`} style={{ height: `${h}%`, ...atraso(0.6 + i * 0.12) }} /></div>
                <span className="text-[10px] text-couro-400">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 px-4 pb-4">
            {[
              { n: "Carlos", p: 100 },
              { n: "Rafael", p: 82 },
              { n: "Bruno", p: 64 },
            ].map((b, i) => (
              <div key={b.n} className="flex items-center gap-2 text-[11px]">
                <span className="w-12 font-semibold">{b.n}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-fundo">
                  <span className="ap-largura block h-full rounded-full bg-latao-500" style={{ width: `${b.p}%`, ...atraso(1.6 + i * 0.2) }} />
                </span>
              </div>
            ))}
          </div>
        </Janela>
      }
    />
  );
}

function AreaCliente({ nome }: { nome: string }) {
  return (
    <Cena
      rotulo="App do cliente"
      titulo={<>Um app com a <span className="text-verde-claro">cara da sua barbearia</span>.</>}
      texto="Seu logo e suas cores. O cliente entra com o WhatsApp, vê o plano dele, os próximos horários e as vantagens do clube."
      itens={["Banners de promoção que você mesmo troca", "Clube de vantagens com parceiros e cupons", "Remarcar e cancelar sem te chamar"]}
      visual={
        <Celular>
          <div className="flex h-full flex-col bg-fundo">
            <div className="bg-couro-900 px-4 pt-9 pb-4 text-white">
              <p className="text-[10px] text-couro-300">Olá, João 👋</p>
              <p className="font-display text-lg font-bold">{nome}</p>
            </div>
            <div className="flex-1 space-y-2.5 p-3">
              <A d={0.4} c="ap-pop" className="rounded-2xl bg-gradient-to-br from-latao-500 to-latao-700 p-3 text-white">
                <p className="text-[10px] font-bold uppercase">Só neste sábado</p>
                <p className="font-display text-base leading-tight font-bold">Corte + barba por R$ 70</p>
              </A>
              <A d={0.8} c="ap-esq" className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-couro-400"><Crown className="size-3 text-latao-600" /> Seu plano</p>
                <p className="text-sm font-bold">Clube Corte Ilimitado</p>
                <p className="text-[11px] text-emerald-700">Ativo · renova sozinho</p>
              </A>
              <A d={1.2} c="ap-esq" className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-couro-400"><CalendarDays className="size-3" /> Próximo horário</p>
                <p className="text-sm font-bold">Sáb, 14 · 10:30</p>
                <p className="text-[11px] text-couro-400">Corte + Barba com Carlos</p>
              </A>
              <A d={1.6} c="ap-esq" className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-couro-400"><Gift className="size-3" /> Clube de vantagens</p>
                <p className="text-sm font-bold">15% na Academia Força Total</p>
              </A>
            </div>
            <div className="flex justify-around border-t border-black/[0.06] bg-white py-2 text-couro-400">
              <Home className="size-4 text-couro-900" /><CalendarDays className="size-4" /><Crown className="size-4" /><User className="size-4" />
            </div>
          </div>
        </Celular>
      }
    />
  );
}

function Unidades() {
  const n = useMarcos([1800, 3600]);
  const unidades = [
    { n: "Centro", a: 18, c: "R$ 1.284" },
    { n: "Shopping Norte", a: 24, c: "R$ 1.976" },
  ];
  return (
    <Cena
      rotulo="Várias unidades"
      titulo={<>Abriu outra unidade? <span className="text-verde-claro">Está pronto.</span></>}
      texto="Agenda, caixa e estoque separados por unidade, e o dono acompanha tudo de um lugar só."
      itens={["O cliente escolhe a unidade ao agendar", "Transferência de estoque entre unidades", "Horário de funcionamento próprio de cada uma"]}
      visual={
        <div className="w-full max-w-[460px] space-y-3">
          <A d={0.2} className="flex w-fit gap-1 rounded-full bg-white/10 p-1 text-xs font-semibold">
            {["Todas", ...unidades.map((u) => u.n)].map((t, i) => (
              <span key={t} className={`rounded-full px-3 py-1.5 transition ${i === n ? "bg-latao-500 text-white" : "text-white/70"}`}>{t}</span>
            ))}
          </A>
          {unidades.map((u, i) => (
            <A key={u.n} d={0.5 + i * 0.3} c="ap-dir">
              <div className={`flex items-center gap-4 rounded-2xl border bg-couro-900 p-4 text-white transition ${n === i + 1 ? "border-latao-500" : n === 0 ? "border-white/10" : "border-white/5 opacity-50"}`}>
                <span className="grid size-11 place-items-center rounded-xl bg-latao-500/15 text-verde-claro"><MapPin className="size-5" /></span>
                <span className="flex-1"><span className="block font-semibold">{u.n}</span><span className="text-xs text-couro-400">{u.a} atendimentos hoje</span></span>
                <span className="text-right"><span className="block text-[10px] text-couro-400">Caixa</span><span className="numero">{u.c}</span></span>
              </div>
            </A>
          ))}
          <A d={1.2} className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-couro-400">+ Nova unidade</A>
        </div>
      }
    />
  );
}

function Planos({ planos }: { planos: Plano[] }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <A d={0.05} className="mb-2 text-center text-xs font-bold tracking-[0.18em] text-verde-claro uppercase">Planos</A>
      <A d={0.2}><h2 className="text-center font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">Tudo incluso. Escolha o tamanho.</h2></A>
      <div className="mx-auto mt-6 grid w-full max-w-4xl gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
        {planos.map((p, i) => (
          <A key={p.nome} d={0.5 + i * 0.25} c="ap-pop">
            <div className={`h-full rounded-3xl border p-4 sm:p-6 ${i === 1 ? "border-verde-claro bg-latao-500/20" : "border-white/10 bg-couro-900"}`}>
              <div className="flex items-baseline justify-between gap-2 sm:block">
                <p className="font-display text-lg font-bold text-white sm:text-xl">{p.nome}</p>
                <p className="text-white sm:mt-1"><span className="numero text-2xl sm:text-4xl">{formatarDinheiro(p.mensal).replace(",00", "")}</span><span className="text-sm text-couro-400">/mês</span></p>
              </div>
              <p className="text-right text-xs text-couro-400 sm:text-left">ou {formatarDinheiro(p.anual).replace(",00", "")}/ano</p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/85 sm:mt-3 sm:block sm:space-y-1">
                <li>{p.unidades ? `${p.unidades} unidade${p.unidades > 1 ? "s" : ""}` : "Unidades ilimitadas"}</li>
                <li>{p.assinantes ? `Até ${p.assinantes} assinantes no clube` : "Assinantes ilimitados"}</li>
              </ul>
            </div>
          </A>
        ))}
      </div>
      <A d={1.6} className="mx-auto mt-5 max-w-3xl text-center text-xs text-couro-300 sm:mt-6 sm:text-sm">
        Agenda online · app do cliente · clube de assinatura · lembretes · comandas · caixa · estoque · financeiro · relatórios
      </A>
    </div>
  );
}

function Final({ whatsapp, para, recomecar, video, falando }: { whatsapp: string | null; para: string | null; recomecar: () => void; video: boolean; falando: boolean }) {
  const msg = para ? `Olá! Vi a apresentação do KlarezaBarber e quero colocar a ${para} no sistema.` : "Olá! Vi a apresentação do KlarezaBarber e quero saber mais.";
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <A d={0.1} c="ap-pop" className="flex flex-col items-center gap-5">
        <Klaro falando={falando} acenando className="size-28 drop-shadow-2xl sm:size-32" />
        <Marca tamanho="lg" clara />
      </A>
      <A d={0.4}>
        <h2 className="mt-8 max-w-3xl font-display text-3xl leading-tight font-bold tracking-tight text-white sm:text-6xl">
          Vamos colocar {para ? <span className="text-verde-claro">{para}</span> : "a sua barbearia"} no ar?
        </h2>
      </A>
      <A d={0.7}><p className="mt-4 text-lg text-couro-300">A gente cadastra tudo com você: equipe, serviços, horários e planos.</p></A>
      {video ? (
        <A d={1} c="ap-pop" className="mt-8 rounded-full bg-latao-500 px-7 py-3.5 font-display text-lg font-bold text-white">
          Peça uma demonstração
        </A>
      ) : (
      <A d={1} className="mt-8 flex flex-wrap justify-center gap-3">
        {whatsapp && (
          <a href={linkWhatsApp(whatsapp, msg)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="btn bg-[#25d366] px-6 py-3.5 text-base text-white hover:bg-[#1fb457]">
            Quero começar
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            recomecar();
          }}
          className="btn border border-white/15 px-6 py-3.5 text-base text-white hover:bg-white/5"
        >
          <RotateCcw className="size-4" /> Ver de novo
        </button>
      </A>
      )}
      <A d={1.3} c="ap-largura" className="ap-poste mt-12 h-2 w-40 rounded-full" />
      <A d={1.5} className="mt-6 text-xs text-couro-400">
        KlarezaBarber é uma marca da Rotta Digital · Klaro é um personagem fictício · voz: ElevenLabs
      </A>
    </div>
  );
}

// ---------- apresentação ----------

const BASE = [5500, 7500, 9000, 8500, 8000, 8500, 8000, 7500, 8000, 7500, 9000, 0];
/** Narração em áudio (voz do ElevenLabs); as legendas aparecem sempre. */
const NARRACAO = true;
/** Quando o Klaro começa a falar em cada cena (ms). */
export const INICIO_FALA = 700;
/** Cada cena dura o necessário para a animação e para a fala do Klaro terminar. */
const DURACAO = BASE.map((b, i) => (b ? Math.max(b, INICIO_FALA + FALA_MS[i] + 1300) : 0));

/** Legenda do Klaro: as palavras acendem no ritmo da fala. */
function Legenda({ cena, avatar, falando, video }: { cena: number; avatar: boolean; falando: boolean; video: boolean }) {
  const palavras = FALAS[cena].legenda.split(" ");
  const [ditas, setDitas] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = (Date.now() - t0 - INICIO_FALA) / FALA_MS[cena];
      setDitas(Math.max(0, Math.min(palavras.length, Math.ceil(p * palavras.length))));
      if (p >= 1) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [cena, palavras.length]);
  return (
    <div className={`ap-sobe pointer-events-none absolute inset-x-3 z-20 mx-auto flex max-w-4xl items-end gap-2.5 sm:inset-x-6 sm:gap-4 ${video ? "bottom-4 sm:bottom-6" : "bottom-16"}`} style={atraso(0.2)}>
      {avatar && (
        <div className="relative shrink-0">
          <Klaro falando={falando} className="size-16 drop-shadow-xl sm:size-24" />
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 text-[9px] font-bold tracking-[0.15em] text-tinta sm:text-[10px]">KLARO</span>
        </div>
      )}
      <p className="min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-white/95 px-3.5 py-2.5 text-[13px] leading-snug font-medium text-tinta shadow-2xl sm:px-5 sm:py-3.5 sm:text-lg">
        {palavras.map((w, i) => (
          <span key={i} className={`leg-palavra ${i < ditas ? "dita" : ""}`}>{w} </span>
        ))}
      </p>
    </div>
  );
}

export function Apresentacao({ para, whatsapp, planos, video = false }: Props) {
  const nome = para ?? "Barbearia do Centro";
  const [cena, setCena] = useState(0);
  const [pausado, setPausado] = useState(false);
  const restante = useRef(DURACAO[0]);
  const cenaDoTimer = useRef(0);
  const total = DURACAO.length;

  const ir = useCallback((i: number) => setCena(Math.max(0, Math.min(total - 1, i))), [total]);
  const [falando, setFalando] = useState(false);
  // Marca o início da apresentação para sincronizar a narração na gravação do vídeo
  useEffect(() => {
    if (video) (window as unknown as { __inicioApresentacao?: number }).__inicioApresentacao = Date.now();
  }, [video]);
  const [som, setSom] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  // Boca do Klaro mexendo enquanto dura a fala da cena
  useEffect(() => {
    setFalando(false);
    const a = setTimeout(() => setFalando(true), INICIO_FALA);
    const b = setTimeout(() => setFalando(false), INICIO_FALA + FALA_MS[cena]);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [cena]);

  // Narração (só quando o som está ligado; o navegador exige um toque antes)
  useEffect(() => {
    if (!som || video) return;
    const a = new Audio(`/apresentacao/fala-${String(cena).padStart(2, "0")}.mp3`);
    audio.current = a;
    const id = setTimeout(() => a.play().catch(() => {}), INICIO_FALA);
    return () => {
      clearTimeout(id);
      a.pause();
      audio.current = null;
    };
  }, [cena, som, video]);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (pausado) a.pause();
    else if (a.currentTime > 0 && !a.ended) a.play().catch(() => {});
  }, [pausado]);

  useEffect(() => {
    if (cenaDoTimer.current !== cena) {
      cenaDoTimer.current = cena;
      restante.current = DURACAO[cena];
    }
    if (pausado || !DURACAO[cena]) return;
    const inicio = Date.now();
    const id = setTimeout(() => setCena((c) => Math.min(total - 1, c + 1)), restante.current);
    return () => {
      clearTimeout(id);
      restante.current -= Date.now() - inicio;
    };
  }, [cena, pausado, total]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); ir(cena + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") ir(cena - 1);
      else if (e.key.toLowerCase() === "p") setPausado((p) => !p);
      else if (e.key.toLowerCase() === "f") telaCheia();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [cena, ir]);

  const cenas: ReactNode[] = [
    <Abertura key="a" para={para} falando={falando} />,
    <Problema key="p" />,
    <Agendamento key="ag" nome={nome} />,
    <Agenda key="ad" />,
    <Lembretes key="l" nome={nome} />,
    <Clube key="c" />,
    <Comanda key="co" />,
    <Financeiro key="f" />,
    <AreaCliente key="ac" nome={nome} />,
    <Unidades key="u" />,
    <Planos key="pl" planos={planos} />,
    <Final key="fi" whatsapp={whatsapp} para={para} recomecar={() => ir(0)} video={video} falando={falando} />,
  ];

  const clicar = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    if (e.clientX < window.innerWidth * 0.3) ir(cena - 1);
    else ir(cena + 1);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-couro-950 text-white select-none" onClick={clicar}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="ap-brilho absolute -top-1/3 -left-1/4 size-[80vmax] rounded-full bg-[radial-gradient(circle,rgba(20,92,60,0.22),transparent_60%)]" />
        <div className="ap-brilho absolute -right-1/4 -bottom-1/2 size-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(47,93,138,0.14),transparent_60%)]" style={{ animationDelay: "-4s" }} />
      </div>

      <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-4 pt-3 sm:px-6">
        {DURACAO.map((d, i) => (
          <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            {i < cena && <span className="block h-full bg-verde-claro" />}
            {i === cena && (
              <span
                key={cena}
                className={`block h-full bg-verde-claro ${d ? "ap-progresso" : ""}`}
                style={{ "--dur": `${d}ms`, animationPlayState: pausado ? "paused" : "running" } as CSSProperties}
              />
            )}
          </span>
        ))}
      </div>

      <div className="absolute top-7 left-4 z-30 sm:left-6"><Marca tamanho="sm" clara /></div>

      <main key={cena} className={`relative z-10 mx-auto h-full max-w-6xl px-4 pt-16 sm:px-8 sm:pt-20 ${video ? "pb-28 sm:pb-36" : "pb-40 sm:pb-48"}`}>
        {cenas[cena]}
      </main>

      <Legenda key={`leg-${cena}`} cena={cena} avatar={cena !== 0 && cena !== total - 1} falando={falando} video={video} />

      {NARRACAO && !som && !video && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSom(true);
          }}
          className="absolute top-6 right-4 z-30 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-tinta shadow-lg sm:right-6"
        >
          <Volume2 className="size-4" /> Ouvir o Klaro
        </button>
      )}

      <div className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-4 pb-4 sm:px-6 ${video ? "hidden" : ""}`}>
        <span className="text-xs text-couro-400 tabular-nums">{cena + 1} / {total}</span>
        <div className="flex gap-1.5">
          <Controle rotulo="Anterior" onClick={() => ir(cena - 1)}><ChevronLeft className="size-4" /></Controle>
          <Controle rotulo={pausado ? "Continuar" : "Pausar"} onClick={() => setPausado((p) => !p)}>{pausado ? <Play className="size-4" /> : <Pause className="size-4" />}</Controle>
          <Controle rotulo="Próxima" onClick={() => ir(cena + 1)}><ChevronRight className="size-4" /></Controle>
          {NARRACAO && (
            <Controle rotulo={som ? "Desligar som" : "Ligar som"} onClick={() => setSom((v) => !v)}>{som ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</Controle>
          )}
          <Controle rotulo="Tela cheia" onClick={telaCheia}><Expand className="size-4" /></Controle>
        </div>
      </div>
    </div>
  );
}

function Controle({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur transition hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function telaCheia() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
