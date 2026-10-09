import { FormAcao } from "@/components/FormAcao";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarTelefone } from "@/lib/formato";
import { NOMES_DIAS } from "@/lib/tempo";
import { salvarConfiguracoes } from "../actions";

export default async function Configuracoes() {
  const { barbeariaId } = await exigirSessao();
  const barbearia = await db.barbearia.findUniqueOrThrow({
    where: { id: barbeariaId },
    include: { horarios: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo">Configurações</h1>

      <FormAcao acao={salvarConfiguracoes} className="space-y-4">
        <section className="card grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome da barbearia</label>
            <input name="nome" className="input" defaultValue={barbearia.nome} required />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input name="telefone" className="input" defaultValue={barbearia.telefone ? formatarTelefone(barbearia.telefone) : ""} />
          </div>
          <div>
            <label className="label">Endereço</label>
            <input name="endereco" className="input" defaultValue={barbearia.endereco ?? ""} />
          </div>
          <div>
            <label className="label">Horários oferecidos a cada</label>
            <select name="intervalo" className="input" defaultValue={barbearia.intervaloMin}>
              {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutos</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cliente pode agendar até (dias à frente)</label>
            <input name="antecedencia" type="number" min={1} max={90} className="input" defaultValue={barbearia.antecedenciaDias} />
          </div>
          <p className="text-sm text-stone-500 sm:col-span-2">
            Link público de agendamento: <strong>/b/{barbearia.slug}</strong>
          </p>
        </section>

        <section className="card space-y-2">
          <h2 className="font-semibold">Horário de funcionamento</h2>
          {NOMES_DIAS.map((nome, d) => {
            const h = barbearia.horarios.find((x) => x.diaSemana === d);
            return (
              <div key={d} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`aberto_${d}`} defaultChecked={!!h} /> {nome}
                </label>
                <input type="time" name={`abre_${d}`} className="input" defaultValue={h?.abre ?? "09:00"} />
                <input type="time" name={`fecha_${d}`} className="input" defaultValue={h?.fecha ?? "19:00"} />
              </div>
            );
          })}
        </section>

        <button className="btn-primario w-full">Salvar configurações</button>
      </FormAcao>
    </div>
  );
}
