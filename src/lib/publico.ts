import { assinaturaVigente, usosDoPlanoNoMes } from "./comandas";
import { db } from "./db";
import { corDoTexto } from "./formato";
import { diaDaSemana, diaLocal, somarDias } from "./tempo";

/** Variáveis de cor da marca para as páginas do cliente. */
export function estiloDaMarca(cor: string) {
  return { "--cor": cor, "--cor-texto": corDoTexto(cor) } as React.CSSProperties;
}

/** Plano vigente do cliente, com os serviços cobertos e quantos usos ainda restam no mês. */
export async function planoDoCliente(clienteId: string) {
  const a = await assinaturaVigente(clienteId);
  if (!a) return null;
  const usados = await usosDoPlanoNoMes(clienteId);
  return {
    nome: a.plano.nome,
    servicoIds: a.plano.servicos.map((s) => s.id),
    restantes: a.plano.usosPorMes === null ? null : Math.max(0, a.plano.usosPorMes - usados),
    usados,
    limite: a.plano.usosPorMes,
    pagoAte: a.pagoAte,
    precoCentavos: a.plano.precoCentavos,
    descricao: a.plano.descricao,
  };
}

/** Dados para montar o agendamento online. */
export async function dadosDoAgendamento(slug: string) {
  const b = await db.barbearia.findUnique({
    where: { slug },
    include: {
      horarios: true,
      servicos: { where: { ativo: true, exibirOnline: true }, include: { barbeiros: { select: { id: true } } }, orderBy: [{ categoria: "asc" }, { precoCentavos: "asc" }] },
      barbeiros: { where: { ativo: true }, orderBy: [{ destaque: "desc" }, { nome: "asc" }] },
    },
  });
  if (!b) return null;
  const abertos = new Set(b.horarios.map((h) => h.diaSemana));
  const hoje = diaLocal();
  const dias = Array.from({ length: b.antecedenciaDias + 1 }, (_, i) => somarDias(hoje, i)).filter((d) => abertos.has(diaDaSemana(d)));
  return {
    barbearia: b,
    dias,
    servicos: b.servicos.map((s) => ({
      id: s.id,
      nome: s.nome,
      categoria: s.categoria,
      descricao: s.descricao,
      foto: s.foto,
      precoCentavos: s.precoCentavos,
      duracaoMin: s.duracaoMin,
      barbeiroIds: s.barbeiros.map((x) => x.id),
    })),
    barbeiros: b.barbeiros.map((x) => ({ id: x.id, nome: x.nome, foto: x.foto, destaque: x.destaque, bio: x.bio })),
  };
}
