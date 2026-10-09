import { FormAcao } from "@/components/FormAcao";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarTelefone } from "@/lib/formato";
import { alternarBarbeiro, salvarBarbeiro } from "../actions";

export default async function Barbeiros() {
  const { barbeariaId } = await exigirSessao();
  const barbeiros = await db.barbeiro.findMany({
    where: { barbeariaId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="titulo">Barbeiros</h1>

      <FormAcao acao={salvarBarbeiro} limparAoSalvar className="card grid items-end gap-3 sm:grid-cols-[1fr_12rem_8rem_auto]">
        <div>
          <label className="label">Novo barbeiro</label>
          <input name="nome" className="input" placeholder="Nome" required />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="telefone" className="input" inputMode="tel" />
        </div>
        <div>
          <label className="label">Comissão (%)</label>
          <input name="comissao" type="number" className="input" defaultValue={50} min={0} max={100} required />
        </div>
        <button className="btn-primario">Adicionar</button>
      </FormAcao>

      <div className="space-y-2">
        {barbeiros.map((b) => (
          <div key={b.id} className={`card flex flex-wrap items-end gap-3 ${b.ativo ? "" : "opacity-60"}`}>
            <FormAcao acao={salvarBarbeiro} className="grid flex-1 items-end gap-3 sm:grid-cols-[1fr_12rem_8rem_auto]">
              <input type="hidden" name="id" value={b.id} />
              <div>
                <label className="label">Nome</label>
                <input name="nome" className="input" defaultValue={b.nome} required />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input name="telefone" className="input" defaultValue={b.telefone ? formatarTelefone(b.telefone) : ""} />
              </div>
              <div>
                <label className="label">Comissão (%)</label>
                <input name="comissao" type="number" className="input" defaultValue={b.comissaoPct} min={0} max={100} />
              </div>
              <button className="btn-secundario">Salvar</button>
            </FormAcao>
            <form action={alternarBarbeiro}>
              <input type="hidden" name="id" value={b.id} />
              <button className={b.ativo ? "btn-perigo" : "btn-secundario"}>{b.ativo ? "Desativar" : "Reativar"}</button>
            </form>
          </div>
        ))}
        {barbeiros.length === 0 && <p className="text-stone-500">Nenhum barbeiro cadastrado.</p>}
      </div>
    </div>
  );
}
