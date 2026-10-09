import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  MessageCircle,
  Package,
  Play,
  ReceiptText,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import { Marca } from "@/components/Marca";
import { TabelaPlanos } from "@/components/TabelaPlanos";
import { db } from "@/lib/db";
import { linkWhatsApp } from "@/lib/formato";
import { PLANOS_SISTEMA } from "@/lib/planosSistema";
import { Calculadora } from "./Calculadora";
import "./apresentacao/apresentacao.css";

export const metadata: Metadata = {
  title: { absolute: "KlarezaBarber · Sistema para barbearias" },
  description:
    "Agendamento online, clube de assinatura com cobrança automática, comandas, caixa, estoque, financeiro e lembretes por WhatsApp. Tudo para a sua barbearia num lugar só.",
  openGraph: {
    title: "KlarezaBarber · Sistema para barbearias",
    description: "Agenda cheia, clube de assinatura recorrente e o caixa batendo. Tudo num lugar só.",
    type: "website",
    locale: "pt_BR",
  },
};
export const dynamic = "force-dynamic";

const RECURSOS = [
  { icone: CalendarCheck, t: "Agendamento online", d: "O cliente agenda sozinho pelo celular: unidade, barbeiro, serviços e horário. Sem conflito de horário." },
  { icone: Crown, t: "Clube de assinatura", d: "Planos mensais com cobrança automática por Pix, cartão ou boleto. Renova sozinho." },
  { icone: Bell, t: "Lembretes por WhatsApp", d: "Um toque e a mensagem sai pronta, com link para o cliente confirmar. Sem custo de API." },
  { icone: ReceiptText, t: "Comandas e caixa", d: "Serviços e produtos na comanda, fechamento de caixa com sangria e suprimento." },
  { icone: Package, t: "Estoque", d: "Baixa automática na venda, aviso de produto acabando e estoque separado por unidade." },
  { icone: BarChart3, t: "Financeiro e relatórios", d: "Faturamento, despesas, contas a pagar, comissões e desempenho de cada barbeiro." },
  { icone: Smartphone, t: "App do cliente", d: "Área do cliente com a sua marca: plano, horários, banners de promoção e clube de vantagens." },
  { icone: Store, t: "Várias unidades", d: "Cada unidade com equipe, agenda, caixa e horário próprios, tudo num só painel." },
];

const DORES = [
  { dor: "Agenda no caderno e no WhatsApp", sol: "Agendamento online 24h, direto na agenda da equipe." },
  { dor: "Cliente que marca e não aparece", sol: "Lembrete no WhatsApp com confirmação por link." },
  { dor: "Mensalidade que ninguém cobra", sol: "Clube com cobrança automática todo mês." },
  { dor: "Caixa que não bate", sol: "Comanda, caixa e comissão calculados sozinhos." },
];

const PASSOS = [
  { t: "Conversa e demonstração", d: "Mostramos o sistema funcionando com a realidade da sua barbearia." },
  { t: "A gente configura com você", d: "Equipe, serviços, preços, horários, planos do clube e a sua marca." },
  { t: "Divulgue o link e comece", d: "Coloque o link na bio do Instagram e no WhatsApp. Os agendamentos começam a entrar." },
];

const PERGUNTAS = [
  { p: "Meu cliente precisa baixar aplicativo?", r: "Não. Ele agenda e acessa a área dele pelo navegador do celular, por um link da sua barbearia." },
  { p: "Como recebo as mensalidades do clube?", r: "Pelo Asaas, instituição de pagamento autorizada pelo Banco Central. A barbearia tem a própria conta e o dinheiro cai direto nela. O cliente paga por Pix, cartão ou boleto." },
  { p: "Os lembretes de WhatsApp têm custo?", r: "Não. O sistema monta a mensagem e abre o seu WhatsApp com um toque. Você só aperta enviar." },
  { p: "Funciona no celular?", r: "Sim. O painel funciona no celular, tablet e computador. Os barbeiros podem ter login próprio para ver a agenda deles." },
  { p: "Tenho mais de uma unidade. Serve?", r: "Serve. O plano Cidade inclui 2 unidades e o Nacional, unidades ilimitadas, com agenda, caixa e estoque separados." },
  { p: "Posso mudar de plano depois?", r: "Pode. É só falar com a gente que mudamos o seu plano conforme a barbearia cresce." },
];

export default async function Landing() {
  const suporte = (await db.configSistema.findUnique({ where: { id: "geral" } }).catch(() => null))?.whatsappSuporte;
  const contato = (msg: string) => (suporte ? linkWhatsApp(suporte, msg) : "/apresentacao");
  const demo = contato("Olá! Vi o site do KlarezaBarber e quero uma demonstração para a minha barbearia.");

  return (
    <main className="overflow-x-hidden bg-fundo">
      {/* Topo */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-couro-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/" aria-label="KlarezaBarber"><Marca tamanho="sm" clara /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-couro-300 md:flex">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#clube" className="hover:text-white">Clube</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#duvidas" className="hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-2 text-sm font-semibold text-couro-300 hover:text-white">Entrar</Link>
            <a href={demo} target={suporte ? "_blank" : undefined} rel="noopener" className="btn-destaque btn-pequeno sm:px-4 sm:py-2">Quero conhecer</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-couro-950 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="ap-brilho absolute -top-1/2 -left-1/4 size-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(184,134,47,0.18),transparent_60%)]" />
          <div className="ap-brilho absolute -right-1/4 -bottom-1/2 size-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(47,93,138,0.16),transparent_60%)]" style={{ animationDelay: "-4s" }} />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
          <div>
            <div className="ap-sobe mb-6 inline-flex items-center gap-2 rounded-full border border-latao-500/30 bg-latao-500/10 px-3 py-1 text-xs font-semibold text-latao-100">
              <span className="ap-poste h-2 w-6 rounded-full" /> Sistema completo para barbearias
            </div>
            <h1 className="ap-sobe font-display text-[40px] leading-[1.02] font-bold tracking-tight sm:text-6xl" style={{ "--d": "0.1s" } as React.CSSProperties}>
              Agenda cheia, clube pagando <span className="text-latao-500">todo mês</span> e o caixa batendo.
            </h1>
            <p className="ap-sobe mt-5 max-w-xl text-lg text-couro-300" style={{ "--d": "0.25s" } as React.CSSProperties}>
              Agendamento online, clube de assinatura com cobrança automática, comandas, estoque, financeiro e lembretes por WhatsApp. Tudo num lugar só.
            </p>
            <div className="ap-sobe mt-8 flex flex-wrap gap-3" style={{ "--d": "0.4s" } as React.CSSProperties}>
              <a href={demo} target={suporte ? "_blank" : undefined} rel="noopener" className="btn-destaque px-6 py-3.5 text-base">
                <MessageCircle className="size-5" /> Quero uma demonstração
              </a>
              <Link href="/apresentacao" className="btn border border-white/15 px-6 py-3.5 text-base text-white hover:bg-white/5">
                <Play className="size-4" /> Ver apresentação
              </Link>
            </div>
            <ul className="ap-sobe mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-couro-300" style={{ "--d": "0.55s" } as React.CSSProperties}>
              {["Sem baixar aplicativo", "Configuramos com você", "Funciona no celular"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-latao-500" strokeWidth={3} /> {t}</li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Dor → solução */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="rotulo">O dia a dia sem sistema</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">Cada problema da rotina tem uma solução pronta.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {DORES.map((d) => (
            <div key={d.dor} className="card flex flex-col gap-3 p-6">
              <p className="text-lg font-semibold text-couro-400 line-through decoration-poste-vermelho decoration-2">{d.dor}</p>
              <p className="flex items-start gap-2 text-lg font-semibold">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-latao-500 text-couro-950"><Check className="size-3.5" strokeWidth={3} /></span>
                {d.sol}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="scroll-mt-16 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="rotulo">Recursos</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que a barbearia precisa, em todos os planos.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ icone: Icone, t, d }) => (
              <div key={t} className="rounded-2xl border border-black/[0.06] bg-fundo/60 p-5 transition hover:-translate-y-0.5 hover:border-latao-500/40 hover:bg-white hover:shadow-md">
                <span className="grid size-11 place-items-center rounded-xl bg-couro-900 text-latao-500"><Icone className="size-5" /></span>
                <p className="mt-4 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-couro-700">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clube */}
      <section id="clube" className="scroll-mt-16 bg-couro-950 py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-latao-500 uppercase">Clube de assinatura</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">Receita garantida, mesmo no dia de agenda fraca.</h2>
            <p className="mt-4 text-lg text-couro-300">
              Monte planos como “corte ilimitado” ou “corte + barba”. O cliente assina pela área dele, paga online e o plano renova sozinho todo mês.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Cobrança automática por Pix, cartão ou boleto",
                "O dinheiro cai direto na conta da barbearia",
                "Controle de quantos serviços o cliente já usou no mês",
                "Link de pagamento pronto para mandar no WhatsApp",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-white/90">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-latao-500/15 text-latao-500"><Check className="size-3.5" strokeWidth={3} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Calculadora />
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="rotulo">Como começar</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Você não precisa configurar nada sozinho.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.t} className="card relative overflow-hidden p-6">
              <span className="numero text-5xl text-latao-500/30">{i + 1}</span>
              <p className="mt-2 text-lg font-semibold">{p.t}</p>
              <p className="mt-1 text-sm text-couro-700">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Planos */}
      <section id="planos" className="scroll-mt-16 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="rotulo">Planos</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Tudo incluso. Escolha o tamanho.</h2>
            <p className="mt-3 text-couro-700">Muda só o número de unidades e de assinantes no clube.</p>
          </div>
          <TabelaPlanos
            acao={(c) => (
              <a href={contato(`Olá! Tenho interesse no plano ${PLANOS_SISTEMA[c].nome} do KlarezaBarber.`)} target={suporte ? "_blank" : undefined} rel="noopener" className={`${c === "CIDADE" ? "btn-primario" : "btn-secundario"} w-full py-3`}>
                Quero o plano {PLANOS_SISTEMA[c].nome}
              </a>
            )}
          />
        </div>
      </section>

      {/* Dúvidas */}
      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-20">
        <p className="rotulo text-center">Dúvidas</p>
        <h2 className="mt-2 text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
        <div className="mt-10 divide-y divide-black/[0.08] rounded-2xl border border-black/[0.06] bg-white">
          {PERGUNTAS.map((q) => (
            <details key={q.p} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {q.p}
                <ChevronDown className="size-5 shrink-0 text-couro-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-couro-700">{q.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Chamada final */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-couro-900 px-6 py-14 text-center text-white sm:px-12">
          <div className="ap-poste absolute inset-x-0 top-0 h-2" aria-hidden />
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">Vamos colocar a sua barbearia no KlarezaBarber?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-couro-300">Chame a gente e veja o sistema funcionando com os serviços e os preços da sua barbearia.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={demo} target={suporte ? "_blank" : undefined} rel="noopener" className="btn bg-[#25d366] px-6 py-3.5 text-base text-white hover:bg-[#1fb457]">
              <MessageCircle className="size-5" /> Falar no WhatsApp
            </a>
            <Link href="/apresentacao" className="btn border border-white/15 px-6 py-3.5 text-base text-white hover:bg-white/5">
              <Play className="size-4" /> Ver apresentação
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-couro-400 sm:flex-row">
          <Marca tamanho="sm" />
          <nav className="flex flex-wrap justify-center gap-5">
            <Link href="/login" className="hover:text-tinta">Entrar no painel</Link>
            <Link href="/barbearias" className="hover:text-tinta">Sou cliente de uma barbearia</Link>
            <Link href="/apresentacao" className="hover:text-tinta">Apresentação</Link>
          </nav>
          <p>© {new Date().getFullYear()} KlarezaBarber</p>
        </div>
      </footer>
    </main>
  );
}

/** Composição do painel (agenda) com o celular do cliente, só ilustrativa. */
function HeroVisual() {
  const cols = [
    { n: "Carlos", b: [{ t: 0, h: 1, c: "João S.", s: "Corte" }, { t: 1.5, h: 2, c: "Pedro A.", s: "Corte + Barba" }, { t: 4, h: 1, c: "Lucas M.", s: "Barba" }] },
    { n: "Rafael", b: [{ t: 0.5, h: 2, c: "Marcos L.", s: "Corte + Barba" }, { t: 3, h: 1, c: "André P.", s: "Corte" }] },
    { n: "Bruno", b: [{ t: 0, h: 1, c: "Thiago C.", s: "Corte" }, { t: 1, h: 1, c: "Diego F.", s: "Sobrancelha" }, { t: 2.5, h: 2, c: "Rafael T.", s: "Corte + Barba" }] },
  ];
  const cores = ["border-latao-500 bg-latao-100 text-latao-700", "border-poste-azul bg-sky-50 text-poste-azul", "border-poste-vermelho bg-rose-50 text-poste-vermelho"];
  const linha = 30;
  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-10 lg:pb-0">
      <div className="ap-dir overflow-hidden rounded-2xl border border-white/10 bg-white text-tinta shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]" style={{ "--d": "0.3s" } as React.CSSProperties}>
        <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-fundo px-3 py-2">
          <span className="size-2.5 rounded-full bg-poste-vermelho/70" />
          <span className="size-2.5 rounded-full bg-latao-500/70" />
          <span className="size-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-2 flex items-center gap-1 text-[11px] font-semibold text-couro-400"><CalendarDays className="size-3" /> Agenda · hoje</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {cols.map((col, ci) => (
            <div key={col.n}>
              <p className="mb-1.5 rounded-lg bg-fundo py-1.5 text-center text-[11px] font-semibold">{col.n}</p>
              <div className="relative" style={{ height: linha * 5 }}>
                {col.b.map((b, k) => (
                  <div
                    key={b.c}
                    className={`ap-pop absolute inset-x-0 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 ${cores[ci]}`}
                    style={{ top: b.t * linha, height: b.h * linha - 3, "--d": `${0.7 + k * 0.25 + ci * 0.1}s` } as React.CSSProperties}
                  >
                    <p className="truncate text-[10px] font-bold">{b.c}</p>
                    {b.h > 1 && <p className="truncate text-[9px] opacity-80">{b.s}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-black/[0.06] p-3">
          {[
            { r: "Hoje", v: "R$ 1.284" },
            { r: "Assinantes", v: "120" },
            { r: "Atendimentos", v: "18" },
          ].map((k) => (
            <div key={k.r} className="rounded-xl bg-fundo p-2">
              <p className="text-[9px] font-semibold text-couro-400 uppercase">{k.r}</p>
              <p className="numero text-sm sm:text-base">{k.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="ap-sobe absolute -bottom-2 -left-2 w-[150px] overflow-hidden rounded-[26px] border-[5px] border-couro-800 bg-white text-tinta shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:-left-8 sm:w-[170px] lg:-bottom-10" style={{ "--d": "0.9s" } as React.CSSProperties}>
        <div className="bg-couro-900 px-3 pt-4 pb-2.5 text-white">
          <p className="text-[8px] text-couro-300">Olá, João 👋</p>
          <p className="font-display text-xs font-bold">Sua Barbearia</p>
        </div>
        <div className="space-y-1.5 bg-fundo p-2">
          <div className="rounded-xl bg-gradient-to-br from-latao-500 to-latao-700 p-2 text-couro-950">
            <p className="text-[7px] font-bold uppercase">Só neste sábado</p>
            <p className="text-[10px] leading-tight font-bold">Corte + barba R$ 70</p>
          </div>
          <div className="rounded-xl bg-white p-2">
            <p className="flex items-center gap-1 text-[7px] font-semibold text-couro-400"><Crown className="size-2.5 text-latao-600" /> Seu plano</p>
            <p className="text-[10px] font-bold">Corte Ilimitado</p>
            <p className="text-[8px] text-emerald-700">Ativo · renova sozinho</p>
          </div>
          <div className="rounded-xl bg-white p-2">
            <p className="flex items-center gap-1 text-[7px] font-semibold text-couro-400"><Users className="size-2.5" /> Próximo horário</p>
            <p className="text-[10px] font-bold">Sáb · 10:30 com Carlos</p>
          </div>
        </div>
      </div>

      <div className="ap-pop absolute -top-4 -right-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-tinta shadow-xl sm:-right-6" style={{ "--d": "1.5s" } as React.CSSProperties}>
        <span className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white"><Check className="size-4" strokeWidth={3} /></span>
        <span><strong className="block">Novo agendamento</strong><span className="text-couro-400">Rafael T. · 11:30</span></span>
      </div>
    </div>
  );
}
