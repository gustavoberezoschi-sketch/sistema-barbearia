import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormAcao } from "@/components/FormAcao";
import { Cabecalho, Indicador, Secao } from "@/components/ui";
import { exigirGestor } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarDinheiro } from "@/lib/formato";
import { formatarDataHora } from "@/lib/tempo";
import { alternarProduto, movimentarEstoque, salvarProduto } from "../actions";

export const metadata: Metadata = { title: "Produto" };
export const dynamic = "force-dynamic";

const NOMES = { ENTRADA: "Entrada", VENDA: "Venda", AJUSTE: "Ajuste", ESTORNO: "Estorno" } as Record<string, string>;
const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default async function Produto({ params }: { params: Promise<{ id: string }> }) {
  const { barbeariaId } = await exigirGestor();
  const produto = await db.produto.findFirst({
    where: { id: (await params).id, barbeariaId },
    include: { movimentos: { orderBy: { criadoEm: "desc" }, take: 30 } },
  });
  if (!produto) notFound();
  const vendidos30 = produto.movimentos.filter((m) => m.tipo === "VENDA" && m.criadoEm > new Date(Date.now() - 30 * 864e5)).reduce((s, m) => s - m.quantidade, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <Cabecalho
        titulo={produto.nome}
        descricao={produto.categoria}
        voltar={{ href: "/painel/produtos", rotulo: "Produtos" }}
        acoes={
          <form action={alternarProduto}>
            <input type="hidden" name="id" value={produto.id} />
            <button className={produto.ativo ? "btn-perigo" : "btn-secundario"}>{produto.ativo ? "Desativar produto" : "Reativar produto"}</button>
          </form>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Indicador rotulo="Em estoque" valor={produto.estoque} destaque={produto.estoque <= produto.estoqueMinimo} detalhe={`Aviso com ${produto.estoqueMinimo}`} />
        <Indicador rotulo="Vendidos (30 dias)" valor={vendidos30} />
        <Indicador rotulo="Lucro por unidade" valor={formatarDinheiro(produto.precoCentavos - produto.custoCentavos)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Dados do produto">
          <FormAcao acao={salvarProduto} className="grid gap-3">
            <input type="hidden" name="id" value={produto.id} />
            <div><label className="label" htmlFor="nome">Nome</label><input id="nome" name="nome" defaultValue={produto.nome} className="input" required /></div>
            <div><label className="label" htmlFor="categoria">Categoria</label><input id="categoria" name="categoria" defaultValue={produto.categoria} className="input" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label" htmlFor="preco">Preço</label><input id="preco" name="preco" defaultValue={reais(produto.precoCentavos)} className="input" inputMode="decimal" required /></div>
              <div><label className="label" htmlFor="custo">Custo</label><input id="custo" name="custo" defaultValue={reais(produto.custoCentavos)} className="input" inputMode="decimal" /></div>
              <div><label className="label" htmlFor="estoqueMinimo">Avisar com</label><input id="estoqueMinimo" name="estoqueMinimo" type="number" min={0} defaultValue={produto.estoqueMinimo} className="input" /></div>
            </div>
            <button className="btn-primario">Salvar</button>
          </FormAcao>
        </Secao>
        <Secao titulo="Movimentar estoque">
          <FormAcao acao={movimentarEstoque} limparAoSalvar className="grid gap-3">
            <input type="hidden" name="id" value={produto.id} />
            <select name="tipo" className="input" aria-label="Tipo de movimentação">
              <option value="ENTRADA">Entrada (chegou mercadoria)</option>
              <option value="SAIDA">Saída (perda, uso interno)</option>
              <option value="AJUSTE">Contagem (informar quantidade real)</option>
            </select>
            <input name="quantidade" type="number" className="input" placeholder="Quantidade" required />
            <input name="observacao" className="input" placeholder="Observação (ex.: nota fiscal 123)" />
            <button className="btn-secundario">Registrar</button>
          </FormAcao>
          <h3 className="rotulo mt-6 mb-2">Histórico</h3>
          <ul className="divide-y divide-black/[0.06] text-sm">
            {produto.movimentos.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2">
                <span>
                  {NOMES[m.tipo] ?? m.tipo}
                  {m.observacao && <span className="text-couro-400"> · {m.observacao}</span>}
                  <span className="block text-xs text-couro-400">{formatarDataHora(m.criadoEm)}</span>
                </span>
                <span className={`font-semibold tabular-nums ${m.quantidade > 0 ? "text-emerald-700" : "text-poste-vermelho"}`}>
                  {m.quantidade > 0 ? "+" : ""}{m.quantidade}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      </div>
    </div>
  );
}
