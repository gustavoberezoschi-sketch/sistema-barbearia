import { FormAcao } from "@/components/FormAcao";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarDinheiro, formatarTelefone, linkWhatsApp, somenteDigitos } from "@/lib/formato";
import { diaLocal } from "@/lib/tempo";
import { salvarCliente } from "../actions";

export const dynamic = "force-dynamic";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { barbeariaId } = await exigirSessao();
  const busca = ((await searchParams).busca ?? "").trim();
  const digitos = somenteDigitos(busca);

  const clientes = await db.cliente.findMany({
    where: {
      barbeariaId,
      ...(busca
        ? { OR: [{ nome: { contains: busca } }, ...(digitos ? [{ telefone: { contains: digitos } }] : [])] }
        : {}),
    },
    include: {
      agendamentos: {
        where: { status: "CONCLUIDO" },
        select: { inicio: true, precoCentavos: true },
        orderBy: { inicio: "desc" },
      },
    },
    orderBy: { nome: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="titulo">Clientes</h1>

      <FormAcao acao={salvarCliente} limparAoSalvar className="card grid items-end gap-3 sm:grid-cols-[1fr_12rem_1fr_auto]">
        <div>
          <label className="label">Novo cliente</label>
          <input name="nome" className="input" placeholder="Nome" required />
        </div>
        <div>
          <label className="label">WhatsApp</label>
          <input name="telefone" className="input" inputMode="tel" required />
        </div>
        <div>
          <label className="label">Observação</label>
          <input name="observacao" className="input" placeholder="Ex.: corte com máquina 2" />
        </div>
        <button className="btn-primario">Adicionar</button>
      </FormAcao>

      <form className="flex gap-2">
        <input name="busca" defaultValue={busca} className="input" placeholder="Buscar por nome ou telefone" />
        <button className="btn-secundario">Buscar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-600">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Atendimentos</th>
              <th className="p-3">Total gasto</th>
              <th className="p-3">Última visita</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="p-3 font-medium">
                  {c.nome}
                  {c.observacao && <span className="block text-xs font-normal text-stone-500">{c.observacao}</span>}
                </td>
                <td className="p-3">
                  <a href={linkWhatsApp(c.telefone)} target="_blank" className="text-amber-700 underline">
                    {formatarTelefone(c.telefone)}
                  </a>
                </td>
                <td className="p-3">{c.agendamentos.length}</td>
                <td className="p-3">{formatarDinheiro(c.agendamentos.reduce((s, a) => s + a.precoCentavos, 0))}</td>
                <td className="p-3">
                  {c.agendamentos[0] ? diaLocal(c.agendamentos[0].inicio).split("-").reverse().join("/") : "—"}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-stone-500">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
