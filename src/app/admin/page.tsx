import type { Metadata } from "next";
import Link from "next/link";
import { FormAcao } from "@/components/FormAcao";
import { Marca } from "@/components/Marca";
import { Etiqueta, Indicador, Secao } from "@/components/ui";
import { db } from "@/lib/db";
import { formatarDinheiro, formatarTelefone } from "@/lib/formato";
import { CODIGOS_PLANO, PLANOS_SISTEMA, type Situacao, planoDe, situacaoDaBarbearia, valorDoCiclo } from "@/lib/planosSistema";
import { formatarDia, formatarDataHora } from "@/lib/tempo";
import {
  alterarPlano,
  alternarSuspensao,
  eAdmin,
  entrarAdmin,
  novaBarbearia,
  registrarPagamento,
  sairAdmin,
  salvarConfigSistema,
  trocarSenha,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administração", robots: { index: false } };

const SITUACAO: Record<Situacao, { r: string; t: "verde" | "latao" | "vermelho" | "neutro" }> = {
  EM_DIA: { r: "Em dia", t: "verde" },
  VENCENDO: { r: "Vence em breve", t: "latao" },
  ATRASADA: { r: "Atrasada", t: "vermelho" },
  SUSPENSA: { r: "Suspensa", t: "neutro" },
  SEM_CONTROLE: { r: "Sem vencimento", t: "neutro" },
};

export default async function Admin() {
  if (!(await eAdmin())) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
        <div className="mb-4 flex justify-center"><Marca tamanho="md" /></div>
        <h1 className="mb-6 text-center text-xl font-bold">Administração</h1>
        <FormAcao acao={entrarAdmin} className="card space-y-4">
          <div>
            <label className="label" htmlFor="senha">Senha de administrador</label>
            <input className="input" id="senha" name="senha" type="password" required />
          </div>
          <button className="btn-primario w-full">Entrar</button>
        </FormAcao>
      </main>
    );
  }

  const [barbearias, config, pagamentos] = await Promise.all([
    db.barbearia.findMany({
      orderBy: { criadoEm: "desc" },
      include: {
        usuarios: { where: { papel: { not: "BARBEIRO" } }, select: { email: true } },
        _count: {
          select: {
            agendamentos: true,
            clientes: true,
            filiais: { where: { ativo: true } },
            assinaturas: { where: { status: "ATIVA" } },
          },
        },
      },
    }),
    db.configSistema.findUnique({ where: { id: "geral" } }),
    db.pagamentoSistema.findMany({ include: { barbearia: { select: { nome: true } } }, orderBy: { pagoEm: "desc" }, take: 15 }),
  ]);

  const ativas = barbearias.filter((b) => !b.suspensa);
  const recorrente = ativas.reduce((s, b) => s + (b.ciclo === "ANUAL" ? Math.round(planoDe(b.plano).anual / 12) : planoDe(b.plano).mensal), 0);
  const atrasadas = barbearias.filter((b) => situacaoDaBarbearia(b) === "ATRASADA").length;
  const mes = new Date().toISOString().slice(0, 7);
  const recebidoMes = pagamentos.filter((p) => p.pagoEm.toISOString().slice(0, 7) === mes).reduce((s, p) => s + p.valorCentavos, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Marca tamanho="sm" />
          <h1 className="titulo mt-2">Barbearias clientes</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/planos" target="_blank" className="btn-secundario">Página de planos</Link>
          <form action={sairAdmin}><button className="btn-secundario">Sair</button></form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Barbearias ativas" valor={ativas.length} />
        <Indicador rotulo="Receita recorrente / mês" valor={formatarDinheiro(recorrente)} destaque detalhe="Anuais divididos por 12" />
        <Indicador rotulo="Recebido neste mês" valor={formatarDinheiro(recebidoMes)} />
        <Indicador rotulo="Mensalidades atrasadas" valor={atrasadas} />
      </div>

      <div className="space-y-3">
        {barbearias.map((b) => {
          const plano = planoDe(b.plano);
          const sit = SITUACAO[situacaoDaBarbearia(b)];
          const acimaUnidades = plano.unidades !== null && b._count.filiais > plano.unidades;
          const acimaAssinantes = plano.assinantes !== null && b._count.assinaturas > plano.assinantes;
          return (
            <section key={b.id} className={`card ${b.suspensa ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
                    {b.nome} <Etiqueta tom={sit.t}>{sit.r}</Etiqueta>
                  </p>
                  <p className="text-sm text-couro-400">
                    <Link href={`/b/${b.slug}`} target="_blank" className="text-latao-700 underline">/b/{b.slug}</Link> · {b.usuarios.map((u) => u.email).join(", ")}
                  </p>
                  <p className="mt-1 text-sm">
                    Plano <strong>{plano.nome}</strong> {b.ciclo === "ANUAL" ? "anual" : "mensal"} · {formatarDinheiro(valorDoCiclo(b.plano, b.ciclo))}
                    {b.pagoAte && <> · pago até <strong>{formatarDia(b.pagoAte)}</strong></>}
                  </p>
                  <p className="mt-1 text-xs text-couro-400">
                    <span className={acimaUnidades ? "font-semibold text-poste-vermelho" : ""}>
                      {b._count.filiais}/{plano.unidades ?? "∞"} unidade(s)
                    </span>{" "}
                    ·{" "}
                    <span className={acimaAssinantes ? "font-semibold text-poste-vermelho" : ""}>
                      {b._count.assinaturas}/{plano.assinantes ?? "∞"} assinantes ativos
                    </span>{" "}
                    · {b._count.clientes} clientes · {b._count.agendamentos} agendamentos
                  </p>
                </div>
                <form action={alternarSuspensao}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className={b.suspensa ? "btn-primario btn-pequeno" : "btn-perigo btn-pequeno"}>{b.suspensa ? "Reativar acesso" : "Suspender acesso"}</button>
                </form>
              </div>

              <div className="mt-4 grid gap-3 border-t border-black/[0.06] pt-4 lg:grid-cols-2">
                <FormAcao acao={registrarPagamento} className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <div>
                    <label className="label" htmlFor={`valor-${b.id}`}>Registrar pagamento (R$)</label>
                    <input id={`valor-${b.id}`} name="valor" className="input" placeholder={(valorDoCiclo(b.plano, b.ciclo) / 100).toFixed(2).replace(".", ",")} inputMode="decimal" />
                  </div>
                  <button className="btn-destaque">Recebi</button>
                  <p className="col-span-2 text-xs text-couro-400">Estende o vencimento em 1 {b.ciclo === "ANUAL" ? "ano" : "mês"} e reativa o acesso, se estiver suspenso.</p>
                </FormAcao>
                {/* Os campos têm key com o valor salvo: quando ele muda (ex.: depois de "Recebi"), o campo mostra o valor novo. */}
                <FormAcao acao={alterarPlano} className="grid grid-cols-3 items-end gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <div>
                    <label className="label" htmlFor={`plano-${b.id}`}>Plano</label>
                    <select key={b.plano} id={`plano-${b.id}`} name="plano" defaultValue={b.plano} className="input">
                      {CODIGOS_PLANO.map((c) => <option key={c} value={c}>{PLANOS_SISTEMA[c].nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`ciclo-${b.id}`}>Ciclo</label>
                    <select key={b.ciclo} id={`ciclo-${b.id}`} name="ciclo" defaultValue={b.ciclo} className="input">
                      <option value="MENSAL">Mensal</option>
                      <option value="ANUAL">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`pago-${b.id}`}>Pago até</label>
                    <input key={b.pagoAte ?? "-"} id={`pago-${b.id}`} name="pagoAte" type="date" defaultValue={b.pagoAte ?? ""} className="input" />
                  </div>
                  <button className="btn-secundario col-span-3">Salvar plano</button>
                </FormAcao>
              </div>
            </section>
          );
        })}
        {barbearias.length === 0 && <p className="card text-couro-400">Nenhuma barbearia cadastrada ainda.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Cadastrar nova barbearia">
          <FormAcao acao={novaBarbearia} limparAoSalvar className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="n-nome">Nome da barbearia</label><input id="n-nome" name="nome" className="input" required /></div>
            <div><label className="label" htmlFor="n-slug">Link (opcional)</label><input id="n-slug" name="slug" className="input" placeholder="gerado a partir do nome" /></div>
            <div><label className="label" htmlFor="n-dono">Nome do dono</label><input id="n-dono" name="dono" className="input" required /></div>
            <div><label className="label" htmlFor="n-email">E-mail de login</label><input id="n-email" name="email" type="email" className="input" required /></div>
            <div><label className="label" htmlFor="n-senha">Senha inicial</label><input id="n-senha" name="senha" className="input" minLength={6} required /></div>
            <div>
              <label className="label" htmlFor="n-plano">Plano</label>
              <select id="n-plano" name="plano" className="input">
                {CODIGOS_PLANO.map((c) => <option key={c} value={c}>{PLANOS_SISTEMA[c].nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="n-ciclo">Ciclo</label>
              <select id="n-ciclo" name="ciclo" className="input"><option value="MENSAL">Mensal</option><option value="ANUAL">Anual</option></select>
            </div>
            <div><label className="label" htmlFor="n-pago">Pago até (opcional)</label><input id="n-pago" name="pagoAte" type="date" className="input" /></div>
            <button className="btn-primario sm:col-span-2">Cadastrar</button>
          </FormAcao>
        </Secao>

        <div className="space-y-4">
          <Secao titulo="Últimos pagamentos recebidos">
            {pagamentos.length === 0 ? (
              <p className="text-sm text-couro-400">Nenhum pagamento registrado.</p>
            ) : (
              <ul className="divide-y divide-black/[0.06] text-sm">
                {pagamentos.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 py-2">
                    <span>
                      {p.barbearia.nome} · {planoDe(p.plano).nome} {p.ciclo === "ANUAL" ? "anual" : "mensal"}
                      <span className="block text-xs text-couro-400">{formatarDataHora(p.pagoEm)} · até {formatarDia(p.referenteAte)}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatarDinheiro(p.valorCentavos)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <Secao titulo="Seu WhatsApp de suporte">
            <FormAcao acao={salvarConfigSistema} className="grid grid-cols-[1fr_auto] gap-2">
              <input name="whatsappSuporte" defaultValue={config?.whatsappSuporte ? formatarTelefone(config.whatsappSuporte) : ""} className="input" placeholder="(41) 99999-9999" inputMode="tel" aria-label="WhatsApp de suporte" />
              <button className="btn-secundario">Salvar</button>
            </FormAcao>
            <p className="mt-2 text-xs text-couro-400">Aparece para as barbearias pedirem mudança de plano, regularizar pagamento e suporte.</p>
          </Secao>
          <Secao titulo="Redefinir senha de um dono">
            <FormAcao acao={trocarSenha} limparAoSalvar className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input name="email" type="email" className="input" placeholder="E-mail do login" required />
              <input name="senha" className="input" placeholder="Nova senha" minLength={6} required />
              <button className="btn-secundario">Alterar</button>
            </FormAcao>
          </Secao>
        </div>
      </div>
    </main>
  );
}
