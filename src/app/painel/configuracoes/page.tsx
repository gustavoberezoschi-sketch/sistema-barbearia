import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FormAcao } from "@/components/FormAcao";
import { FotoUpload } from "@/components/FotoUpload";
import { Cabecalho, Secao } from "@/components/ui";
import { exigirGestor } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarTelefone } from "@/lib/formato";
import { enderecoDoSite } from "@/lib/site";
import { NOMES_DIAS } from "@/lib/tempo";
import { alterarMinhaSenha, salvarConfiguracoes } from "../actions";

export const metadata: Metadata = { title: "Configurações" };

export default async function Configuracoes() {
  const { barbeariaId } = await exigirGestor();
  const b = await db.barbearia.findUniqueOrThrow({ where: { id: barbeariaId }, include: { horarios: true } });
  const link = `${await enderecoDoSite()}/b/${b.slug}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Cabecalho
        titulo="Configurações"
        descricao="Como a barbearia aparece para os clientes e as regras de agendamento."
        acoes={<Link href={`/b/${b.slug}`} target="_blank" className="btn-secundario"><ExternalLink className="size-4" /> Ver minha página</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-couro-900 px-5 py-4 text-sm text-couro-300">
        <span>Link de agendamento:</span>
        <code className="rounded-lg bg-white/10 px-2.5 py-1 text-latao-100">{link}</code>
        <span className="text-xs">Coloque na bio do Instagram, no WhatsApp Business e no Google.</span>
      </div>

      <FormAcao acao={salvarConfiguracoes} className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Identidade">
          <div className="grid gap-4">
            <div className="grid grid-cols-[auto_1fr] items-start gap-4">
              <FotoUpload nome="logo" inicial={b.logo} rotulo="Logo" tamanho={240} />
              <FotoUpload nome="capa" inicial={b.capa} rotulo="Foto de capa" formato="largo" tamanho={480} />
            </div>
            <div><label className="label" htmlFor="nome">Nome da barbearia</label><input id="nome" name="nome" defaultValue={b.nome} className="input" required /></div>
            <div><label className="label" htmlFor="descricao">Apresentação</label><textarea id="descricao" name="descricao" defaultValue={b.descricao ?? ""} rows={3} className="input" placeholder="Ex.: Barbearia clássica no centro, com cerveja gelada e sinuca enquanto você espera." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="telefone">WhatsApp</label><input id="telefone" name="telefone" defaultValue={b.telefone ? formatarTelefone(b.telefone) : ""} className="input" inputMode="tel" /></div>
              <div><label className="label" htmlFor="instagram">Instagram</label><input id="instagram" name="instagram" defaultValue={b.instagram ? `@${b.instagram}` : ""} className="input" placeholder="@suabarbearia" /></div>
            </div>
            <div><label className="label" htmlFor="endereco">Endereço</label><input id="endereco" name="endereco" defaultValue={b.endereco ?? ""} className="input" /></div>
            <div className="flex items-center gap-3">
              <input id="cor" name="cor" type="color" defaultValue={b.corDestaque} className="h-10 w-14 cursor-pointer rounded-lg border border-black/10 bg-white p-1" />
              <label htmlFor="cor" className="text-sm">
                <span className="font-semibold">Cor da página de agendamento</span>
                <span className="block text-xs text-couro-400">Use a cor principal da sua marca.</span>
              </label>
            </div>
          </div>
        </Secao>

        <div className="space-y-4">
          <Secao titulo="Horário de funcionamento">
            <div className="space-y-2">
              {NOMES_DIAS.map((nome, d) => {
                const h = b.horarios.find((x) => x.diaSemana === d);
                return (
                  <div key={d} className="grid grid-cols-[7.5rem_1fr_1fr] items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" name={`aberto_${d}`} defaultChecked={!!h} /> {nome}
                    </label>
                    <input type="time" name={`abre_${d}`} className="input py-2" defaultValue={h?.abre ?? "09:00"} aria-label={`${nome}: abre`} />
                    <input type="time" name={`fecha_${d}`} className="input py-2" defaultValue={h?.fecha ?? "19:00"} aria-label={`${nome}: fecha`} />
                  </div>
                );
              })}
            </div>
          </Secao>

          <Secao titulo="Regras">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="intervalo">Horários a cada</label>
                <select id="intervalo" name="intervalo" className="input" defaultValue={b.intervaloMin}>
                  {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutos</option>)}
                </select>
              </div>
              <div><label className="label" htmlFor="antecedencia">Agendar até (dias à frente)</label><input id="antecedencia" name="antecedencia" type="number" min={1} max={90} className="input" defaultValue={b.antecedenciaDias} /></div>
              <div><label className="label" htmlFor="cancelamento">Cliente cancela até (horas antes)</label><input id="cancelamento" name="cancelamento" type="number" min={0} max={72} className="input" defaultValue={b.cancelamentoHoras} /></div>
              <div>
                <label className="label" htmlFor="cashback">Cashback (%)</label>
                <input id="cashback" name="cashback" type="number" min={0} max={50} className="input" defaultValue={b.cashbackPct} />
                <p className="mt-1 text-xs text-couro-400">Parte do valor pago que vira crédito para a próxima visita. 0 = desligado.</p>
              </div>
            </div>
          </Secao>
          <button className="btn-destaque w-full py-3">Salvar configurações</button>
        </div>
      </FormAcao>

      <Secao titulo="Minha senha" className="mt-4 max-w-xl">
        <FormAcao acao={alterarMinhaSenha} limparAoSalvar className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div><label className="label" htmlFor="atual">Senha atual</label><input id="atual" name="atual" type="password" className="input" required autoComplete="current-password" /></div>
          <div><label className="label" htmlFor="nova">Nova senha</label><input id="nova" name="nova" type="password" className="input" required minLength={6} autoComplete="new-password" /></div>
          <button className="btn-secundario">Alterar</button>
        </FormAcao>
      </Secao>
    </div>
  );
}
