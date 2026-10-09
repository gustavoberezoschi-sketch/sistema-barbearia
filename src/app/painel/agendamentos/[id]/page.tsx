import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarCheck, Check, Clock, MessageCircle, ReceiptText, Scissors, UserRound } from "lucide-react";
import { FormAcao } from "@/components/FormAcao";
import { Avatar, Cabecalho, Etiqueta, Secao } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarDinheiro, formatarTelefone, linkWhatsApp } from "@/lib/formato";
import { diaLocal, formatarDiaExtenso, horaLocal } from "@/lib/tempo";
import { iniciarAtendimento, mudarStatus, remarcarAgendamento } from "../../agenda/actions";

export const metadata: Metadata = { title: "Agendamento" };
export const dynamic = "force-dynamic";

const STATUS = {
  AGENDADO: { rotulo: "Agendado", tom: "latao" },
  CONFIRMADO: { rotulo: "Confirmado", tom: "azul" },
  CONCLUIDO: { rotulo: "Concluído", tom: "verde" },
  CANCELADO: { rotulo: "Cancelado", tom: "neutro" },
  FALTOU: { rotulo: "Faltou", tom: "vermelho" },
} as const;

export default async function Agendamento({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const ag = await db.agendamento.findFirst({
    where: {
      id: (await params).id,
      barbeariaId: sessao.barbeariaId,
      ...(sessao.barbeiroId ? { barbeiroId: sessao.barbeiroId } : {}),
    },
    include: { cliente: true, servico: true, barbeiro: true, barbearia: true, comanda: true },
  });
  if (!ag) notFound();

  const barbeiros = await db.barbeiro.findMany({ where: { barbeariaId: sessao.barbeariaId, ativo: true }, orderBy: { nome: "asc" } });
  const dia = diaLocal(ag.inicio);
  const quando = `${formatarDiaExtenso(dia)} às ${horaLocal(ag.inicio)}`;
  const status = STATUS[ag.status as keyof typeof STATUS] ?? STATUS.AGENDADO;
  const aberto = ag.status === "AGENDADO" || ag.status === "CONFIRMADO";
  const primeiroNome = ag.cliente.nome.split(" ")[0];
  const msgConfirmar = `Olá, ${primeiroNome}! Passando para confirmar seu horário na ${ag.barbearia.nome}: ${quando}, ${ag.servico.nome} com ${ag.barbeiro.nome}. Posso confirmar?`;
  const msgLembrete = `Oi, ${primeiroNome}! Lembrete: seu horário na ${ag.barbearia.nome} é ${quando}. Te esperamos! ✂️`;

  return (
    <div className="mx-auto max-w-4xl">
      <Cabecalho
        voltar={{ href: `/painel/agenda?dia=${dia}`, rotulo: "Agenda" }}
        titulo={
          <span className="flex items-center gap-3">
            {ag.cliente.nome} <Etiqueta tom={status.tom}>{status.rotulo}</Etiqueta>
          </span>
        }
        descricao={<span className="inline-block first-letter:uppercase">{quando}</span>}
        acoes={
          aberto ? (
            <form action={iniciarAtendimento}>
              <input type="hidden" name="id" value={ag.id} />
              <button className="btn-destaque">
                <ReceiptText className="size-4" /> {ag.comanda ? "Abrir comanda" : "Iniciar atendimento"}
              </button>
            </form>
          ) : ag.comanda && ag.comanda.status !== "CANCELADA" ? (
            <Link href={`/painel/comandas/${ag.comanda.id}`} className="btn-secundario">
              <ReceiptText className="size-4" /> Ver comanda #{ag.comanda.numero}
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Secao titulo="Detalhes">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Info icone={Scissors} rotulo="Serviço" valor={`${ag.servico.nome} · ${formatarDinheiro(ag.precoCentavos)}`} />
              <Info icone={Clock} rotulo="Horário" valor={`${horaLocal(ag.inicio)} às ${horaLocal(ag.fim)}`} />
              <div className="flex items-center gap-3">
                <Avatar nome={ag.barbeiro.nome} foto={ag.barbeiro.foto} tamanho={36} />
                <div>
                  <dt className="rotulo">Barbeiro</dt>
                  <dd className="font-medium">{ag.barbeiro.nome}</dd>
                </div>
              </div>
              <Info icone={CalendarCheck} rotulo="Origem" valor={ag.origem === "ONLINE" ? "Agendou pelo link" : "Agendado no balcão"} />
            </dl>
            {ag.observacao && <p className="mt-4 rounded-xl bg-fundo p-3 text-sm">{ag.observacao}</p>}
          </Secao>

          {aberto && (
            <Secao titulo="Remarcar">
              <FormAcao acao={remarcarAgendamento} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={ag.id} />
                <div>
                  <label className="label" htmlFor="dia">Data</label>
                  <input id="dia" type="date" name="dia" defaultValue={dia} className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="hora">Hora</label>
                  <input id="hora" type="time" name="hora" defaultValue={horaLocal(ag.inicio)} className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="barbeiroId">Barbeiro</label>
                  <select id="barbeiroId" name="barbeiroId" defaultValue={ag.barbeiroId} className="input" disabled={!!sessao.barbeiroId}>
                    {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <button className="btn-primario">Remarcar</button>
                <label className="flex items-center gap-2 text-sm sm:col-span-4">
                  <input type="checkbox" name="encaixe" /> Encaixe (ignorar conflitos)
                </label>
              </FormAcao>
            </Secao>
          )}
        </div>

        <div className="space-y-4">
          <Secao titulo="Cliente">
            <Link href={`/painel/clientes/${ag.cliente.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-fundo">
              <span className="grid size-10 place-items-center rounded-full bg-latao-100 text-latao-700">
                <UserRound className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{ag.cliente.nome}</span>
                <span className="text-sm text-couro-400">{formatarTelefone(ag.cliente.telefone)}</span>
              </span>
            </Link>
            <div className="mt-4 grid gap-2">
              <a href={linkWhatsApp(ag.cliente.telefone, msgConfirmar)} target="_blank" className="btn-secundario justify-start">
                <MessageCircle className="size-4 text-emerald-600" /> Pedir confirmação
              </a>
              <a href={linkWhatsApp(ag.cliente.telefone, msgLembrete)} target="_blank" className="btn-secundario justify-start">
                <MessageCircle className="size-4 text-emerald-600" /> Enviar lembrete
              </a>
            </div>
          </Secao>

          {aberto && (
            <Secao titulo="Situação">
              <div className="grid gap-2">
                {ag.status === "AGENDADO" && (
                  <BotaoStatus id={ag.id} status="CONFIRMADO" classe="btn-secundario justify-start">
                    <Check className="size-4 text-poste-azul" /> Cliente confirmou
                  </BotaoStatus>
                )}
                <BotaoStatus id={ag.id} status="FALTOU" classe="btn-secundario justify-start">
                  <Ban className="size-4 text-poste-vermelho" /> Cliente faltou
                </BotaoStatus>
                <BotaoStatus id={ag.id} status="CANCELADO" classe="btn-perigo justify-start">
                  <Ban className="size-4" /> Cancelar agendamento
                </BotaoStatus>
              </div>
            </Secao>
          )}
          {(ag.status === "FALTOU" || ag.status === "CANCELADO") && (
            <BotaoStatus id={ag.id} status="AGENDADO" classe="btn-secundario w-full">
              Reabrir agendamento
            </BotaoStatus>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icone: Icone, rotulo, valor }: { icone: typeof Clock; rotulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fundo text-couro-700">
        <Icone className="size-4" />
      </span>
      <div>
        <dt className="rotulo">{rotulo}</dt>
        <dd className="font-medium">{valor}</dd>
      </div>
    </div>
  );
}

function BotaoStatus({ id, status, classe, children }: { id: string; status: string; classe: string; children: React.ReactNode }) {
  return (
    <form action={mudarStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${classe} w-full`}>{children}</button>
    </form>
  );
}
