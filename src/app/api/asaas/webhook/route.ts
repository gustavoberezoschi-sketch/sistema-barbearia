import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { FORMA_ASAAS } from "@/lib/asaas";
import { tokenConfere } from "@/lib/cripto";
import { db } from "@/lib/db";
import { somarMeses } from "@/lib/tempo";

// Avisos do Asaas (conta principal e subcontas). Responde 200 para tudo que não é
// erro de autenticação, para o Asaas não travar a fila de envios.

type Pagamento = {
  id: string;
  subscription?: string | null;
  value: number;
  netValue?: number;
  billingType?: string;
  dueDate: string;
  invoiceUrl?: string;
};

const PAGO = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const NOVA_COBRANCA = new Set(["PAYMENT_CREATED", "PAYMENT_OVERDUE"]);

const maior = (a: string | null, b: string) => (a && a > b ? a : b);

export async function POST(req: Request) {
  if (!tokenConfere(req.headers.get("asaas-access-token"))) return NextResponse.json({ erro: "token inválido" }, { status: 401 });

  let corpo: { event?: string; payment?: Pagamento };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignorado: "corpo inválido" });
  }
  const { event, payment } = corpo;
  if (!event || !payment?.subscription) return NextResponse.json({ ok: true, ignorado: "sem assinatura" });

  // 1) Mensalidade do clube de uma barbearia (subconta)
  const assinatura = await db.assinatura.findUnique({ where: { asaasId: payment.subscription } });
  if (assinatura) {
    if (NOVA_COBRANCA.has(event) && payment.invoiceUrl) {
      await db.assinatura.update({ where: { id: assinatura.id }, data: { linkPagamento: payment.invoiceUrl } });
    }
    if (PAGO.has(event) && !(await db.pagamentoAssinatura.findUnique({ where: { asaasPagamentoId: payment.id } }))) {
      await db.$transaction([
        db.pagamentoAssinatura.create({
          data: {
            assinaturaId: assinatura.id,
            valorCentavos: Math.round(payment.value * 100),
            formaPagamento: FORMA_ASAAS[payment.billingType ?? ""] ?? "PIX",
            asaasPagamentoId: payment.id,
            valorLiquidoCentavos: payment.netValue !== undefined ? Math.round(payment.netValue * 100) : null,
          },
        }),
        db.assinatura.update({
          where: { id: assinatura.id },
          data: {
            status: assinatura.status === "CANCELADA" ? "CANCELADA" : "ATIVA",
            pagoAte: maior(assinatura.pagoAte, somarMeses(payment.dueDate, 1)),
            linkPagamento: null,
          },
        }),
      ]);
    }
    revalidatePath("/painel", "layout");
    revalidatePath("/b", "layout");
    return NextResponse.json({ ok: true, tipo: "clube" });
  }

  // 2) Mensalidade do KlarezaBarber paga por uma barbearia (conta principal)
  const barbearia = await db.barbearia.findUnique({ where: { asaasAssinaturaSistema: payment.subscription } });
  if (barbearia) {
    if (NOVA_COBRANCA.has(event) && payment.invoiceUrl) {
      await db.barbearia.update({ where: { id: barbearia.id }, data: { linkPagamentoSistema: payment.invoiceUrl } });
    }
    if (PAGO.has(event) && !(await db.pagamentoSistema.findUnique({ where: { asaasPagamentoId: payment.id } }))) {
      const ate = maior(barbearia.pagoAte, somarMeses(payment.dueDate, barbearia.ciclo === "ANUAL" ? 12 : 1));
      await db.$transaction([
        db.pagamentoSistema.create({
          data: {
            barbeariaId: barbearia.id,
            plano: barbearia.plano,
            ciclo: barbearia.ciclo,
            valorCentavos: Math.round(payment.value * 100),
            referenteAte: ate,
            observacao: "Pago pelo Asaas",
            asaasPagamentoId: payment.id,
          },
        }),
        db.barbearia.update({ where: { id: barbearia.id }, data: { pagoAte: ate, suspensa: false, linkPagamentoSistema: null } }),
      ]);
    }
    revalidatePath("/painel", "layout");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true, tipo: "sistema" });
  }

  return NextResponse.json({ ok: true, ignorado: "assinatura desconhecida" });
}
