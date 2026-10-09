import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { FormAcao } from "@/components/FormAcao";
import { Cabecalho, Etiqueta, Indicador, Secao } from "@/components/ui";
import { exigirGestor } from "@/lib/auth";
import { caixaAberto, resumoDoCaixa } from "@/lib/caixa";
import { db } from "@/lib/db";
import { NOME_FORMA, formatarDinheiro } from "@/lib/formato";
import { formatarDataHora, horaLocal } from "@/lib/tempo";
import { abrirCaixa, fecharCaixa, lancarMovimento } from "./actions";

export const metadata: Metadata = { title: "Caixa" };
export const dynamic = "force-dynamic";

const TIPOS = { SUPRIMENTO: "Suprimento (entrada de troco)", SANGRIA: "Sangria (retirada)", DESPESA: "Despesa paga do caixa" };

export default async function Caixa({ searchParams }: { searchParams: Promise<{ id?: string; fechado?: string }> }) {
  const { barbeariaId } = await exigirGestor();
  const p = await searchParams;
  const aberto = await caixaAberto(barbeariaId);
  const verId = p.id ?? aberto?.id;
  const selecionado = verId ? await db.caixa.findFirst({ where: { id: verId, barbeariaId } }) : null;
  const resumo = selecionado ? await resumoDoCaixa(selecionado.id) : null;
  const historico = await db.caixa.findMany({ where: { barbeariaId, fechadoEm: { not: null } }, orderBy: { abertoEm: "desc" }, take: 15 });

  return (
    <div>
      <Cabecalho titulo="Caixa" descricao="Abertura, entradas, retiradas e fechamento do dia." />

      {!aberto && !p.id && (
        <Secao titulo="Abrir o caixa" className="mb-6 max-w-lg">
          <FormAcao acao={abrirCaixa} className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="saldoInicial">Dinheiro na gaveta (troco)</label>
              <input id="saldoInicial" name="saldoInicial" className="input" placeholder="0,00" inputMode="decimal" />
            </div>
            <button className="btn-destaque"><Wallet className="size-4" /> Abrir caixa</button>
          </FormAcao>
        </Secao>
      )}

      {p.fechado && (
        <p className="mb-4 rounded-2xl bg-emerald-600/10 px-4 py-3 text-sm font-medium text-emerald-800">
          Caixa fechado. Confira o resumo abaixo e abra um novo caixa no próximo expediente.
        </p>
      )}
      {resumo && selecionado && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-couro-700">
            {selecionado.fechadoEm ? <Etiqueta>Fechado</Etiqueta> : <Etiqueta tom="verde">Aberto</Etiqueta>}
            Aberto em {formatarDataHora(selecionado.abertoEm)}
            {selecionado.fechadoEm && ` · fechado em ${formatarDataHora(selecionado.fechadoEm)}`}
            {p.id && <Link href="/painel/caixa" className="ml-2 font-semibold text-latao-700 hover:underline">{aberto ? "Voltar ao caixa aberto" : "Abrir novo caixa"}</Link>}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador rotulo="Entradas" valor={formatarDinheiro(resumo.entradas)} destaque detalhe={`${resumo.caixa.comandas.length} comanda(s), ${resumo.caixa.pagamentos.length} mensalidade(s)`} />
            <Indicador rotulo="Troco inicial" valor={formatarDinheiro(selecionado.saldoInicialCentavos)} />
            <Indicador rotulo="Saídas" valor={formatarDinheiro(resumo.sangrias + resumo.despesas)} detalhe="Sangrias e despesas" />
            <Indicador
              rotulo="Dinheiro na gaveta"
              valor={formatarDinheiro(resumo.dinheiroEsperado)}
              detalhe={
                selecionado.dinheiroContadoCentavos !== null
                  ? `Contado: ${formatarDinheiro(selecionado.dinheiroContadoCentavos)} (diferença ${formatarDinheiro(selecionado.dinheiroContadoCentavos - resumo.dinheiroEsperado)})`
                  : "Valor esperado"
              }
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Secao titulo="Por forma de pagamento">
                {Object.keys(resumo.porForma).length === 0 ? (
                  <p className="text-sm text-couro-400">Nenhuma venda neste caixa ainda.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {Object.entries(resumo.porForma).sort((a, b) => b[1] - a[1]).map(([forma, valor]) => (
                      <li key={forma} className="flex items-center gap-3">
                        <span className="w-36 shrink-0">{NOME_FORMA[forma] ?? forma}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-fundo">
                          <span className="block h-full rounded-full bg-latao-500" style={{ width: `${(valor / resumo.entradas) * 100}%` }} />
                        </span>
                        <span className="w-24 text-right font-semibold tabular-nums">{formatarDinheiro(valor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>

              <Secao titulo="Movimentações">
                <ul className="divide-y divide-black/[0.06] text-sm">
                  {resumo.caixa.comandas.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <ArrowDownCircle className="size-4 shrink-0 text-emerald-600" />
                      <span className="w-12 tabular-nums text-couro-400">{c.fechadaEm ? horaLocal(c.fechadaEm) : ""}</span>
                      <Link href={`/painel/comandas/${c.id}`} className="flex-1 truncate hover:underline">
                        Comanda #{c.numero} · {c.cliente?.nome ?? "Avulso"} · {NOME_FORMA[c.formaPagamento ?? ""]}
                      </Link>
                      <span className="font-semibold tabular-nums">{formatarDinheiro(c.totalCentavos)}</span>
                    </li>
                  ))}
                  {resumo.caixa.pagamentos.map((pg) => (
                    <li key={pg.id} className="flex items-center gap-3 py-2.5">
                      <ArrowDownCircle className="size-4 shrink-0 text-emerald-600" />
                      <span className="w-12 tabular-nums text-couro-400">{horaLocal(pg.pagoEm)}</span>
                      <span className="flex-1 truncate">Mensalidade {pg.assinatura.plano.nome} · {pg.assinatura.cliente.nome} · {NOME_FORMA[pg.formaPagamento]}</span>
                      <span className="font-semibold tabular-nums">{formatarDinheiro(pg.valorCentavos)}</span>
                    </li>
                  ))}
                  {resumo.caixa.movimentos.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2.5">
                      {m.tipo === "SUPRIMENTO" ? <ArrowDownCircle className="size-4 shrink-0 text-emerald-600" /> : <ArrowUpCircle className="size-4 shrink-0 text-poste-vermelho" />}
                      <span className="w-12 tabular-nums text-couro-400">{horaLocal(m.criadoEm)}</span>
                      <span className="flex-1 truncate">{TIPOS[m.tipo as keyof typeof TIPOS]?.split(" (")[0]}: {m.descricao}</span>
                      <span className="font-semibold tabular-nums">{m.tipo === "SUPRIMENTO" ? "" : "-"}{formatarDinheiro(m.valorCentavos)}</span>
                    </li>
                  ))}
                  {resumo.caixa.comandas.length + resumo.caixa.movimentos.length + resumo.caixa.pagamentos.length === 0 && (
                    <li className="py-2 text-couro-400">Nada lançado ainda.</li>
                  )}
                </ul>
              </Secao>
            </div>

            {!selecionado.fechadoEm && (
              <div className="space-y-4">
                <Secao titulo="Lançar entrada ou saída">
                  <FormAcao acao={lancarMovimento} limparAoSalvar className="grid gap-3">
                    <select name="tipo" className="input" aria-label="Tipo">
                      {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                    <input name="valor" className="input" placeholder="Valor (R$)" inputMode="decimal" required />
                    <input name="descricao" className="input" placeholder="Descrição (ex.: compra de água)" required />
                    <button className="btn-secundario">Lançar</button>
                  </FormAcao>
                </Secao>
                <Secao titulo="Fechar o caixa">
                  <FormAcao acao={fecharCaixa} className="grid gap-3">
                    <p className="text-sm text-couro-400">
                      Conte o dinheiro da gaveta. O esperado é <strong className="text-tinta">{formatarDinheiro(resumo.dinheiroEsperado)}</strong>.
                    </p>
                    <input name="dinheiroContado" className="input" placeholder="Dinheiro contado (R$)" inputMode="decimal" required />
                    <input name="observacao" className="input" placeholder="Observação (opcional)" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmar" /> Fechar mesmo com comandas abertas</label>
                    <button className="btn-primario">Fechar caixa</button>
                  </FormAcao>
                </Secao>
              </div>
            )}
          </div>
        </>
      )}

      {historico.length > 0 && (
        <Secao titulo="Caixas anteriores" className="mt-6">
          <ul className="divide-y divide-black/[0.06] text-sm">
            {historico.map((c) => (
              <li key={c.id}>
                <Link href={`/painel/caixa?id=${c.id}`} className="flex justify-between py-2.5 hover:text-latao-700">
                  <span>{formatarDataHora(c.abertoEm)} até {c.fechadoEm ? formatarDataHora(c.fechadoEm) : ""}</span>
                  <span className="font-semibold">Ver</span>
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </div>
  );
}
