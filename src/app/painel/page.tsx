import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  FORMAS_PAGAMENTO,
  STATUS_AGENDAMENTO,
  formatarDinheiro,
  formatarTelefone,
  linkWhatsApp,
} from "@/lib/formato";
import { diaLocal, diaValido, formatarDiaExtenso, horaLocal, inicioEFimDoDia, somarDias } from "@/lib/tempo";
import { mudarStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { barbeariaId } = await exigirSessao();
  const parametro = (await searchParams).dia;
  const dia = parametro && diaValido(parametro) ? parametro : diaLocal();
  const { inicio, fim } = inicioEFimDoDia(dia);

  const [barbearia, barbeiros, agendamentos] = await Promise.all([
    db.barbearia.findUniqueOrThrow({ where: { id: barbeariaId } }),
    db.barbeiro.findMany({ where: { barbeariaId, ativo: true }, orderBy: { nome: "asc" } }),
    db.agendamento.findMany({
      where: { barbeariaId, inicio: { gte: inicio, lt: fim } },
      include: { cliente: true, servico: true },
      orderBy: { inicio: "asc" },
    }),
  ]);

  const ativos = agendamentos.filter((a) => a.status !== "CANCELADO");
  const concluidos = agendamentos.filter((a) => a.status === "CONCLUIDO");
  const faturado = concluidos.reduce((soma, a) => soma + a.precoCentavos, 0);
  const previsto = ativos
    .filter((a) => a.status !== "FALTOU")
    .reduce((soma, a) => soma + a.precoCentavos, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo first-letter:uppercase">{formatarDiaExtenso(dia)}</h1>
        <div className="flex gap-1">
          <Link className="btn-secundario" href={`/painel?dia=${somarDias(dia, -1)}`}>←</Link>
          <Link className="btn-secundario" href="/painel">Hoje</Link>
          <Link className="btn-secundario" href={`/painel?dia=${somarDias(dia, 1)}`}>→</Link>
        </div>
        <form className="flex gap-1">
          <input key={dia} type="date" name="dia" defaultValue={dia} className="input w-auto" />
          <button className="btn-secundario">Ir</button>
        </form>
        <Link className="btn-primario ml-auto" href={`/painel/novo?dia=${dia}`}>+ Novo agendamento</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Resumo titulo="Agendamentos" valor={String(ativos.length)} />
        <Resumo titulo="Concluídos" valor={String(concluidos.length)} />
        <Resumo titulo="Faturado" valor={formatarDinheiro(faturado)} />
        <Resumo titulo="Previsto no dia" valor={formatarDinheiro(previsto)} />
      </div>

      <div className="card flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-600">Link de agendamento para os clientes:</span>
        <Link href={`/b/${barbearia.slug}`} target="_blank" className="font-medium text-amber-700 underline">
          /b/{barbearia.slug}
        </Link>
      </div>

      {barbeiros.length === 0 ? (
        <div className="card text-stone-600">
          Cadastre seus <Link href="/painel/barbeiros" className="text-amber-700 underline">barbeiros</Link> e{" "}
          <Link href="/painel/servicos" className="text-amber-700 underline">serviços</Link> para começar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbeiros.map((barbeiro) => {
            const doBarbeiro = agendamentos.filter((a) => a.barbeiroId === barbeiro.id);
            return (
              <section key={barbeiro.id} className="card space-y-3">
                <h2 className="font-semibold">
                  {barbeiro.nome}{" "}
                  <span className="text-sm font-normal text-stone-500">
                    ({doBarbeiro.filter((a) => a.status !== "CANCELADO").length})
                  </span>
                </h2>
                {doBarbeiro.length === 0 && <p className="text-sm text-stone-500">Nenhum agendamento.</p>}
                {doBarbeiro.map((a) => {
                  const status = STATUS_AGENDAMENTO[a.status];
                  return (
                    <article
                      key={a.id}
                      className={`rounded-lg border border-stone-200 p-3 text-sm ${a.status === "CANCELADO" ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {horaLocal(a.inicio)}–{horaLocal(a.fim)} · {a.cliente.nome}
                          </p>
                          <p className="text-stone-600">
                            {a.servico.nome} · {formatarDinheiro(a.precoCentavos)}
                            {a.origem === "ONLINE" && " · online"}
                          </p>
                          {a.formaPagamento && (
                            <p className="text-stone-500">Pago com {FORMAS_PAGAMENTO[a.formaPagamento]}</p>
                          )}
                          {a.observacao && <p className="text-stone-500 italic">{a.observacao}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.cor}`}>
                          {status.rotulo}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {a.status === "AGENDADO" ? (
                          <>
                            <form action={mudarStatus} className="flex gap-1">
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="status" value="CONCLUIDO" />
                              <select name="formaPagamento" className="input w-auto py-1 text-xs" defaultValue="PIX">
                                {Object.entries(FORMAS_PAGAMENTO).map(([valor, rotulo]) => (
                                  <option key={valor} value={valor}>{rotulo}</option>
                                ))}
                              </select>
                              <button className="btn-primario px-2 py-1 text-xs">Concluir</button>
                            </form>
                            <BotaoStatus id={a.id} status="FALTOU" rotulo="Faltou" />
                            <BotaoStatus id={a.id} status="CANCELADO" rotulo="Cancelar" />
                          </>
                        ) : (
                          <BotaoStatus id={a.id} status="AGENDADO" rotulo="Reabrir" />
                        )}
                        <a
                          href={linkWhatsApp(
                            a.cliente.telefone,
                            `Olá ${a.cliente.nome}! Confirmando seu horário na ${barbearia.nome}: ${formatarDiaExtenso(dia)} às ${horaLocal(a.inicio)} com ${barbeiro.nome}.`,
                          )}
                          target="_blank"
                          className="btn-secundario px-2 py-1 text-xs"
                          title={formatarTelefone(a.cliente.telefone)}
                        >
                          WhatsApp
                        </a>
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Resumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="text-xl font-bold">{valor}</p>
    </div>
  );
}

function BotaoStatus({ id, status, rotulo }: { id: string; status: string; rotulo: string }) {
  return (
    <form action={mudarStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="btn-secundario px-2 py-1 text-xs">{rotulo}</button>
    </form>
  );
}
