import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Gift, Image as IconeImagem, Trash2 } from "lucide-react";
import { FormAcao } from "@/components/FormAcao";
import { FotoUpload } from "@/components/FotoUpload";
import { Cabecalho, Etiqueta, Secao, Vazio } from "@/components/ui";
import { exigirGestor } from "@/lib/auth";
import { db } from "@/lib/db";
import { enderecoDoSite } from "@/lib/site";
import { alternarParceiro, moverBanner, novoBanner, removerBanner, removerParceiro, salvarParceiro } from "./actions";

export const metadata: Metadata = { title: "Página do cliente" };
export const dynamic = "force-dynamic";

export default async function Vitrine({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { barbeariaId } = await exigirGestor();
  const p = await searchParams;
  const [b, banners, parceiros, contas] = await Promise.all([
    db.barbearia.findUniqueOrThrow({ where: { id: barbeariaId }, select: { slug: true } }),
    db.banner.findMany({ where: { barbeariaId }, orderBy: { ordem: "asc" } }),
    db.parceiro.findMany({ where: { barbeariaId }, orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    db.cliente.count({ where: { barbeariaId, senhaHash: { not: null } } }),
  ]);
  const editar = parceiros.find((x) => x.id === p.editar);
  const site = await enderecoDoSite();

  return (
    <div>
      <Cabecalho
        titulo="Página do cliente"
        descricao={`O que o cliente vê no site e na área dele. ${contas} cliente(s) já criaram conta.`}
        acoes={<Link href={`/b/${b.slug}`} target="_blank" className="btn-secundario"><ExternalLink className="size-4" /> Abrir página</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-couro-900 px-5 py-4 text-sm text-couro-300">
        <span>Link para os clientes:</span>
        <code className="rounded-lg bg-white/10 px-2.5 py-1 text-verde-claro">{site}/b/{b.slug}</code>
        <span className="text-xs">Eles agendam, criam conta e acompanham tudo por ali.</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Secao titulo="Banners">
          <p className="mb-4 text-sm text-couro-400">Aparecem no topo da página e da área do cliente, passando sozinhos. Use imagens largas (proporção 2,6 × 1, ex.: 1300 × 500).</p>
          <FormAcao acao={novoBanner} limparAoSalvar className="mb-5 grid gap-3 rounded-2xl border border-dashed border-black/10 p-4">
            <FotoUpload nome="imagem" rotulo="Imagem" formato="largo" tamanho={500} />
            <input name="link" className="input" placeholder="Link ao clicar (opcional)" aria-label="Link do banner" />
            <button className="btn-primario">Adicionar banner</button>
          </FormAcao>
          {banners.length === 0 ? (
            <Vazio icone={IconeImagem} titulo="Nenhum banner" texto="Divulgue promoções, combos e parceiros." />
          ) : (
            <ul className="space-y-3">
              {banners.map((x, i) => (
                <li key={x.id} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.imagem} alt="" className="aspect-[2.6/1] w-48 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm text-couro-400">{x.link ?? "Sem link"}</span>
                  {[{ d: "subir", I: ArrowUp, off: i === 0 }, { d: "descer", I: ArrowDown, off: i === banners.length - 1 }].map(({ d, I, off }) => (
                    <form key={d} action={moverBanner}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="direcao" value={d} />
                      <button disabled={off} className="rounded-lg p-1.5 text-couro-400 hover:bg-fundo disabled:opacity-30" aria-label={d === "subir" ? "Subir" : "Descer"}><I className="size-4" /></button>
                    </form>
                  ))}
                  <form action={removerBanner}>
                    <input type="hidden" name="id" value={x.id} />
                    <button className="rounded-lg p-1.5 text-couro-400 hover:bg-poste-vermelho/10 hover:text-poste-vermelho" aria-label="Remover banner"><Trash2 className="size-4" /></button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Clube de vantagens (parceiros e cupons)" acoes={editar && <Link href="/painel/vitrine" className="text-sm text-couro-400">Cancelar edição</Link>}>
          <p className="mb-4 text-sm text-couro-400">Lojas e serviços parceiros que dão desconto para seus clientes. Aparece como "Clube de vantagens" na área do cliente.</p>
          <FormAcao key={editar?.id ?? "novo"} acao={salvarParceiro} limparAoSalvar={!editar} className="mb-5 grid gap-3 rounded-2xl border border-dashed border-black/10 p-4">
            {editar && <input type="hidden" name="id" value={editar.id} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="nome" defaultValue={editar?.nome} className="input" placeholder="Nome do parceiro" required aria-label="Nome do parceiro" />
              <input name="cupom" defaultValue={editar?.cupom ?? ""} className="input uppercase" placeholder="Cupom (ex.: BARBA10)" aria-label="Cupom" />
            </div>
            <input name="descricao" defaultValue={editar?.descricao ?? ""} className="input" placeholder="Benefício (ex.: 10% de desconto em toda a loja)" aria-label="Benefício" />
            <input name="link" defaultValue={editar?.link ?? ""} className="input" placeholder="Site ou Instagram do parceiro (opcional)" aria-label="Link" />
            <FotoUpload nome="imagem" inicial={editar?.imagem} rotulo="Imagem (opcional)" formato="largo" tamanho={400} />
            <button className="btn-primario">{editar ? "Salvar parceiro" : "Adicionar parceiro"}</button>
          </FormAcao>
          {parceiros.length === 0 ? (
            <Vazio icone={Gift} titulo="Nenhum parceiro" texto="Ex.: loja de roupas, academia, tatuador, hamburgueria do bairro." />
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {parceiros.map((x) => (
                <li key={x.id} className={`flex flex-wrap items-center gap-3 py-3 ${x.ativo ? "" : "opacity-50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{x.nome} {x.cupom && <Etiqueta tom="latao">{x.cupom}</Etiqueta>}</p>
                    {x.descricao && <p className="text-sm text-couro-400">{x.descricao}</p>}
                  </div>
                  <Link href={`/painel/vitrine?editar=${x.id}`} className="btn-secundario btn-pequeno">Editar</Link>
                  <form action={alternarParceiro}><input type="hidden" name="id" value={x.id} /><button className="btn-secundario btn-pequeno">{x.ativo ? "Ocultar" : "Mostrar"}</button></form>
                  <form action={removerParceiro}><input type="hidden" name="id" value={x.id} /><button className="rounded-lg p-1.5 text-couro-400 hover:text-poste-vermelho" aria-label={`Remover ${x.nome}`}><Trash2 className="size-4" /></button></form>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>
    </div>
  );
}
