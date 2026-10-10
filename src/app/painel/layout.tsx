import { RegistrarApp } from "@/components/AppDaBarbearia";
import { Menu } from "@/components/Menu";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { filialDoPainel } from "@/lib/filial";
import { linkWhatsApp } from "@/lib/formato";
import { situacaoDaBarbearia } from "@/lib/planosSistema";
import { formatarDia } from "@/lib/tempo";
import Link from "next/link";
import { sair } from "../login/actions";
import { trocarFilial } from "./unidades/actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const barbearia = await db.barbearia.findUnique({
    where: { id: sessao.barbeariaId },
    select: { nome: true, logo: true, suspensa: true, pagoAte: true },
  });
  const suporte = (await db.configSistema.findUnique({ where: { id: "geral" } }))?.whatsappSuporte ?? null;
  const situacao = barbearia ? situacaoDaBarbearia(barbearia) : "EM_DIA";

  if (situacao === "SUSPENSA") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <p className="font-display text-2xl font-bold">Acesso suspenso</p>
          <p className="mt-2 text-couro-700">
            O acesso da {barbearia?.nome} ao KlarezaBarber está suspenso por falta de pagamento. Os dados estão guardados e voltam assim que a
            mensalidade for regularizada.
          </p>
          {suporte && (
            <a href={linkWhatsApp(suporte, `Olá! Sou da ${barbearia?.nome} e quero regularizar a mensalidade do KlarezaBarber.`)} target="_blank" className="btn-destaque mt-5">
              Falar com o KlarezaBarber
            </a>
          )}
          <form action={sair} className="mt-3">
            <button className="text-sm text-couro-400 underline">Sair</button>
          </form>
        </div>
      </main>
    );
  }
  const { filiais, atual } = await filialDoPainel(sessao);

  return (
    <div className="min-h-screen">
      <RegistrarApp />
      <Menu
        barbearia={barbearia?.nome ?? ""}
        logo={barbearia?.logo ?? null}
        usuario={sessao.nome}
        papel={sessao.papel}
        sair={sair}
        filiais={filiais.filter((f) => f.ativo).map((f) => ({ id: f.id, nome: f.nome }))}
        filialAtual={atual}
        trocarFilial={trocarFilial}
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        {(situacao === "ATRASADA" || situacao === "VENCENDO") && sessao.papel !== "BARBEIRO" && (
          <div className={`mx-auto mb-5 flex max-w-[1400px] flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm ${situacao === "ATRASADA" ? "bg-poste-vermelho/10 text-poste-vermelho" : "bg-latao-100 text-latao-700"}`}>
            <span>
              {situacao === "ATRASADA" ? "A mensalidade do KlarezaBarber venceu em " : "A mensalidade do KlarezaBarber vence em "}
              <strong>{formatarDia(barbearia!.pagoAte!)}</strong>.
            </span>
            <Link href="/painel/plano" className="font-semibold underline">Ver meu plano</Link>
          </div>
        )}
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
