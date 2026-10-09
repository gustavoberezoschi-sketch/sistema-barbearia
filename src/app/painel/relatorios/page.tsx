import type { Metadata } from "next";
import { GraficoBarras } from "@/components/GraficoBarras";
import { Cabecalho, Indicador, Secao } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { NOME_FORMA, formatarDinheiro } from "@/lib/formato";
import { numerosDoPeriodo } from "@/lib/relatorios";
import { diaLocal, diaValido, formatarDia, somarDias } from "@/lib/tempo";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const sessao = await exigirSessao();
  const p = await searchParams;
  const hoje = diaLocal();
  const de = p.de && diaValido(p.de) ? p.de : `${hoje.slice(0, 8)}01`;
  const ate = p.ate && diaValido(p.ate) && p.ate >= de ? p.ate : hoje;
  const barbeiro = sessao.barbeiroId;
  const n = await numerosDoPeriodo(sessao.barbeariaId, de, ate, barbeiro);

  const dias: string[] = [];
  for (let d = de; d <= ate && dias.length < 62; d = somarDias(d, 1)) dias.push(d);
  const grafico = dias.map((d) => ({ rotulo: d.slice(8), detalhe: formatarDia(d), valor: n.porDia.get(d) ?? 0 }));
  const totalFormas = Object.values(n.porForma).reduce((s, v) => s + v, 0);
  const atalhos = [
    { r: "Hoje", de: hoje, ate: hoje },
    { r: "7 dias", de: somarDias(hoje, -6), ate: hoje },
    { r: "Este mês", de: `${hoje.slice(0, 8)}01`, ate: hoje },
    { r: "30 dias", de: somarDias(hoje, -29), ate: hoje },
  ];
  const minhas = barbeiro ? n.porBarbeiro.find((b) => b.id === barbeiro) : null;

  return (
    <div>
      <Cabecalho
        titulo={barbeiro ? "Minhas comissões" : "Relatórios"}
        descricao={`De ${formatarDia(de)} a ${formatarDia(ate)}`}
        acoes={
          <form className="flex flex-wrap items-end gap-2">
            {atalhos.map((a) => (
              <a key={a.r} href={`?de=${a.de}&ate=${a.ate}`} className={`btn-secundario btn-pequeno ${a.de === de && a.ate === ate ? "border-couro-900" : ""}`}>{a.r}</a>
            ))}
            <input type="date" name="de" defaultValue={de} className="input w-auto py-1.5" aria-label="De" />
            <input type="date" name="ate" defaultValue={ate} className="input w-auto py-1.5" aria-label="Até" />
            <button className="btn-primario btn-pequeno">Filtrar</button>
          </form>
        }
      />

      {barbeiro ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador rotulo="Comissão a receber" valor={formatarDinheiro(minhas?.comissao ?? 0)} destaque />
          <Indicador rotulo="Atendimentos" valor={n.atendimentos} />
          <Indicador rotulo="Em serviços" valor={formatarDinheiro(minhas?.servicos ?? 0)} />
          <Indicador rotulo="Em produtos" valor={formatarDinheiro(minhas?.produtos ?? 0)} />
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Indicador rotulo="Faturamento" valor={formatarDinheiro(n.receita)} destaque />
          <Indicador rotulo="Atendimentos" valor={n.atendimentos} />
          <Indicador rotulo="Ticket médio" valor={formatarDinheiro(n.comandas.length ? Math.round(n.vendas / n.comandas.length) : 0)} />
          <Indicador rotulo="Clientes atendidos" valor={n.clientesAtendidos} detalhe={`${n.novosClientes} novo(s) no período`} />
          <Indicador rotulo="Agendou online" valor={n.agendamentos ? `${Math.round((n.online / n.agendamentos) * 100)}%` : "—"} detalhe={`${n.online} de ${n.agendamentos} agendamentos`} />
          <Indicador rotulo="Faltas" valor={n.agendamentos ? `${Math.round((n.faltas / n.agendamentos) * 100)}%` : "—"} detalhe={`${n.faltas} falta(s)`} />
        </div>
      )}

      {!barbeiro && (
        <Secao titulo="Faturamento por dia" className="mb-4">
          <GraficoBarras dados={grafico} titulo="Faturamento por dia no período" destacarUltimo={ate === hoje} />
        </Secao>
      )}

      <Secao titulo={barbeiro ? "Detalhe" : "Comissões por barbeiro"} className="mb-4">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-couro-400">
              <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:font-medium">
                <th>Barbeiro</th><th>Atendimentos</th><th>Serviços</th><th>Produtos</th><th className="text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {n.porBarbeiro.map((b) => (
                <tr key={b.id} className="border-t border-black/[0.06] [&>td]:px-5 [&>td]:py-3">
                  <td className="font-semibold">{b.nome}</td>
                  <td className="tabular-nums">{b.qtdServicos}</td>
                  <td className="tabular-nums">{formatarDinheiro(b.servicos)}</td>
                  <td className="tabular-nums">{formatarDinheiro(b.produtos)}</td>
                  <td className="text-right font-semibold text-latao-700 tabular-nums">{formatarDinheiro(b.comissao)}</td>
                </tr>
              ))}
              {n.porBarbeiro.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-3 text-couro-400">Nenhum atendimento fechado no período.</td></tr>
              )}
            </tbody>
            {n.porBarbeiro.length > 1 && (
              <tfoot>
                <tr className="border-t border-black/15 font-semibold [&>td]:px-5 [&>td]:py-3">
                  <td>Total</td>
                  <td className="tabular-nums">{n.atendimentos}</td>
                  <td className="tabular-nums">{formatarDinheiro(n.porBarbeiro.reduce((s, b) => s + b.servicos, 0))}</td>
                  <td className="tabular-nums">{formatarDinheiro(n.porBarbeiro.reduce((s, b) => s + b.produtos, 0))}</td>
                  <td className="text-right tabular-nums">{formatarDinheiro(n.comissoes)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="mt-3 text-xs text-couro-400">Serviços inclusos em assinatura contam pelo preço de tabela para a comissão.</p>
      </Secao>

      <div className="grid gap-4 lg:grid-cols-3">
        <Ranking titulo="Serviços mais feitos" itens={n.servicos} />
        <Ranking titulo="Produtos mais vendidos" itens={n.produtos} vazio="Nenhum produto vendido." />
        {!barbeiro && (
          <Secao titulo="Formas de pagamento">
            {totalFormas === 0 ? (
              <p className="text-sm text-couro-400">Sem recebimentos no período.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {Object.entries(n.porForma).sort((a, b) => b[1] - a[1]).map(([f, v]) => (
                  <li key={f}>
                    <div className="mb-1 flex justify-between"><span>{NOME_FORMA[f] ?? f}</span><span className="font-semibold tabular-nums">{formatarDinheiro(v)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-fundo"><div className="h-full rounded-full bg-latao-500" style={{ width: `${(v / totalFormas) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        )}
      </div>
    </div>
  );
}

function Ranking({ titulo, itens, vazio = "Nada no período." }: { titulo: string; itens: { nome: string; qtd: number; valor: number }[]; vazio?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.qtd));
  return (
    <Secao titulo={titulo}>
      {itens.length === 0 ? (
        <p className="text-sm text-couro-400">{vazio}</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {itens.slice(0, 8).map((i) => (
            <li key={i.nome}>
              <div className="mb-1 flex justify-between gap-2"><span className="truncate">{i.nome} <span className="text-couro-400">· {i.qtd}</span></span><span className="font-semibold tabular-nums">{formatarDinheiro(i.valor)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-fundo"><div className="h-full rounded-full bg-couro-700" style={{ width: `${(i.qtd / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
