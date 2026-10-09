import { FormAcao } from "@/components/FormAcao";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { alternarServico, salvarServico } from "../actions";

export default async function Servicos() {
  const { barbeariaId } = await exigirSessao();
  const servicos = await db.servico.findMany({
    where: { barbeariaId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="titulo">Serviços</h1>

      <FormAcao acao={salvarServico} limparAoSalvar className="card grid items-end gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
        <div>
          <label className="label">Novo serviço</label>
          <input name="nome" className="input" placeholder="Corte + barba" required />
        </div>
        <div>
          <label className="label">Preço (R$)</label>
          <input name="preco" className="input" placeholder="45,00" inputMode="decimal" required />
        </div>
        <div>
          <label className="label">Duração (min)</label>
          <input name="duracao" type="number" className="input" defaultValue={30} min={5} max={480} required />
        </div>
        <button className="btn-primario">Adicionar</button>
      </FormAcao>

      <div className="space-y-2">
        {servicos.map((s) => (
          <div key={s.id} className={`card flex flex-wrap items-end gap-3 ${s.ativo ? "" : "opacity-60"}`}>
            <FormAcao acao={salvarServico} className="grid flex-1 items-end gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
              <input type="hidden" name="id" value={s.id} />
              <div>
                <label className="label">Nome</label>
                <input name="nome" className="input" defaultValue={s.nome} required />
              </div>
              <div>
                <label className="label">Preço (R$)</label>
                <input
                  name="preco"
                  className="input"
                  defaultValue={(s.precoCentavos / 100).toFixed(2).replace(".", ",")}
                  inputMode="decimal"
                  required
                />
              </div>
              <div>
                <label className="label">Duração (min)</label>
                <input name="duracao" type="number" className="input" defaultValue={s.duracaoMin} required />
              </div>
              <button className="btn-secundario">Salvar</button>
            </FormAcao>
            <form action={alternarServico}>
              <input type="hidden" name="id" value={s.id} />
              <button className={s.ativo ? "btn-perigo" : "btn-secundario"}>{s.ativo ? "Desativar" : "Reativar"}</button>
            </form>
          </div>
        ))}
        {servicos.length === 0 && <p className="text-stone-500">Nenhum serviço cadastrado.</p>}
      </div>
    </div>
  );
}
