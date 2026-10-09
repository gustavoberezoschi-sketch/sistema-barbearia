import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { FORMAS_PAGAMENTO, formatarDinheiro } from "@/lib/formato";
import { criarDataHora, diaLocal, diaValido, somarDias } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export default async function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { barbeariaId } = await exigirSessao();
  const params = await searchParams;
  const hoje = diaLocal();
  const de = params.de && diaValido(params.de) ? params.de : `${hoje.slice(0, 8)}01`;
  const ate = params.ate && diaValido(params.ate) ? params.ate : hoje;

  const agendamentos = await db.agendamento.findMany({
    where: {
      barbeariaId,
      inicio: { gte: criarDataHora(de, "00:00"), lt: criarDataHora(somarDias(ate, 1), "00:00") },
    },
    include: { barbeiro: true, servico: true },
  });

  const concluidos = agendamentos.filter((a) => a.status === "CONCLUIDO");
  const total = concluidos.reduce((s, a) => s + a.precoCentavos, 0);
  const faltas = agendamentos.filter((a) => a.status === "FALTOU").length;
  const cancelados = agendamentos.filter((a) => a.status === "CANCELADO").length;

  const porBarbeiro = new Map<string, { nome: string; pct: number; qtd: number; total: number }>();
  const porServico = new Map<string, { qtd: number; total: number }>();
  const porPagamento = new Map<string, number>();
  for (const a of concluidos) {
    const b = porBarbeiro.get(a.barbeiroId) ?? { nome: a.barbeiro.nome, pct: a.barbeiro.comissaoPct, qtd: 0, total: 0 };
    b.qtd++;
    b.total += a.precoCentavos;
    porBarbeiro.set(a.barbeiroId, b);

    const s = porServico.get(a.servico.nome) ?? { qtd: 0, total: 0 };
    s.qtd++;
    s.total += a.precoCentavos;
    porServico.set(a.servico.nome, s);

    const forma = a.formaPagamento ?? "NAO_INFORMADO";
    porPagamento.set(forma, (porPagamento.get(forma) ?? 0) + a.precoCentavos);
  }
  const totalComissoes = [...porBarbeiro.values()].reduce((s, b) => s + Math.round((b.total * b.pct) / 100), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="titulo mr-auto">Relatórios</h1>
        <form className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">De</label>
            <input type="date" name="de" defaultValue={de} className="input" />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="date" name="ate" defaultValue={ate} className="input" />
          </div>
          <button className="btn-secundario">Filtrar</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card titulo="Faturamento" valor={formatarDinheiro(total)} />
        <Card titulo="Atendimentos" valor={String(concluidos.length)} />
        <Card titulo="Ticket médio" valor={formatarDinheiro(concluidos.length ? Math.round(total / concluidos.length) : 0)} />
        <Card titulo="Comissões" valor={formatarDinheiro(totalComissoes)} />
        <Card titulo="Faltas / cancelados" valor={`${faltas} / ${cancelados}`} />
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Comissões por barbeiro</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-stone-600">
            <tr>
              <th className="py-2">Barbeiro</th>
              <th>Atendimentos</th>
              <th>Faturado</th>
              <th>Comissão</th>
              <th>A pagar</th>
            </tr>
          </thead>
          <tbody>
            {[...porBarbeiro.values()].sort((a, b) => b.total - a.total).map((b) => (
              <tr key={b.nome} className="border-t border-stone-100">
                <td className="py-2 font-medium">{b.nome}</td>
                <td>{b.qtd}</td>
                <td>{formatarDinheiro(b.total)}</td>
                <td>{b.pct}%</td>
                <td className="font-semibold">{formatarDinheiro(Math.round((b.total * b.pct) / 100))}</td>
              </tr>
            ))}
            {porBarbeiro.size === 0 && (
              <tr><td colSpan={5} className="py-2 text-stone-500">Nenhum atendimento concluído no período.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-semibold">Serviços mais vendidos</h2>
          <ul className="space-y-1 text-sm">
            {[...porServico.entries()].sort((a, b) => b[1].qtd - a[1].qtd).map(([nome, s]) => (
              <li key={nome} className="flex justify-between">
                <span>{nome} ({s.qtd})</span>
                <span>{formatarDinheiro(s.total)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-2 font-semibold">Formas de pagamento</h2>
          <ul className="space-y-1 text-sm">
            {[...porPagamento.entries()].sort((a, b) => b[1] - a[1]).map(([forma, valor]) => (
              <li key={forma} className="flex justify-between">
                <span>{FORMAS_PAGAMENTO[forma] ?? "Não informado"}</span>
                <span>{formatarDinheiro(valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="text-xl font-bold">{valor}</p>
    </div>
  );
}
