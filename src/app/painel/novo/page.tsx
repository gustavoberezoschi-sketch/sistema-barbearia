import Link from "next/link";
import { FormAcao } from "@/components/FormAcao";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarDinheiro, formatarTelefone } from "@/lib/formato";
import { diaLocal, diaValido } from "@/lib/tempo";
import { criarAgendamento } from "../actions";

export default async function NovoAgendamento({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { barbeariaId } = await exigirSessao();
  const parametro = (await searchParams).dia;
  const dia = parametro && diaValido(parametro) ? parametro : diaLocal();

  const [barbeiros, servicos, clientes] = await Promise.all([
    db.barbeiro.findMany({ where: { barbeariaId, ativo: true }, orderBy: { nome: "asc" } }),
    db.servico.findMany({ where: { barbeariaId, ativo: true }, orderBy: { nome: "asc" } }),
    db.cliente.findMany({ where: { barbeariaId }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="titulo">Novo agendamento</h1>
        <Link href={`/painel?dia=${dia}`} className="btn-secundario">Voltar</Link>
      </div>

      <FormAcao acao={criarAgendamento} className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Cliente cadastrado</label>
          <select name="clienteId" className="input" defaultValue="">
            <option value="">— Cliente novo (preencha abaixo) —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {formatarTelefone(c.telefone)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nome (cliente novo)</label>
          <input name="clienteNome" className="input" />
        </div>
        <div>
          <label className="label">WhatsApp (cliente novo)</label>
          <input name="clienteTelefone" className="input" inputMode="tel" placeholder="(11) 91234-5678" />
        </div>
        <div>
          <label className="label">Barbeiro</label>
          <select name="barbeiroId" className="input" required>
            {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Serviço</label>
          <select name="servicoId" className="input" required>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {formatarDinheiro(s.precoCentavos)} · {s.duracaoMin} min
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" name="dia" className="input" defaultValue={dia} required />
        </div>
        <div>
          <label className="label">Hora</label>
          <input type="time" name="hora" className="input" required step={300} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observação</label>
          <input name="observacao" className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="encaixe" /> Encaixe (permitir mesmo se o barbeiro já estiver ocupado)
        </label>
        <button className="btn-primario sm:col-span-2">Agendar</button>
      </FormAcao>
    </div>
  );
}
