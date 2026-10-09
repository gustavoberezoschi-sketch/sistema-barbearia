// Dados de demonstração: duas barbearias com equipe, serviços, produtos, clube,
// clientes e 3 semanas de movimento. Uso: npm run db:seed
// Logins (senha 123456): dono@navalha.com · dono@corteforte.com · carlos@navalha.com (barbeiro)
// Área do cliente: /b/navalha-de-ouro/entrar com WhatsApp 11987654321 e senha 123456
import bcrypt from "bcryptjs";
import { abrirComanda, adicionarProduto, fecharComanda } from "../src/lib/comandas";
import { db } from "../src/lib/db";
import { criarDataHora, diaDaSemana, diaLocal, somarDias, somarMeses } from "../src/lib/tempo";

function bannerSvg(fundo: string, destaque: string, titulo: string, sub: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="500"><rect width="1300" height="500" fill="${fundo}"/><g opacity=".18">${Array.from({ length: 30 }, (_, i) => `<rect x="${i * 60 - 300}" y="-50" width="22" height="700" fill="${destaque}" transform="rotate(35 ${i * 60} 250)"/>`).join("")}</g><text x="80" y="230" font-family="Arial Black,Arial" font-weight="900" font-size="84" fill="#fff">${titulo}</text><text x="84" y="310" font-family="Arial" font-size="40" fill="${destaque}">${sub}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const DEMOS = [
  { nome: "Barbearia Navalha de Ouro", slug: "navalha-de-ouro", email: "dono@navalha.com", cor: "#c9a14a", barbeiros: ["Carlos Mendes", "Rafael Lima", "Diego Souza"] },
  { nome: "Corte Forte Barber Shop", slug: "corte-forte", email: "dono@corteforte.com", cor: "#2f5d8a", barbeiros: ["Lucas Prado", "Mateus Rocha"] },
];

const SERVICOS = [
  { nome: "Corte", categoria: "Cabelo", precoCentavos: 4500, duracaoMin: 30, descricao: "Tesoura e máquina, lavagem e finalização." },
  { nome: "Corte degradê", categoria: "Cabelo", precoCentavos: 5000, duracaoMin: 40, descricao: "Degradê navalhado com acabamento na navalha." },
  { nome: "Barba", categoria: "Barba", precoCentavos: 3500, duracaoMin: 30, descricao: "Toalha quente, navalha e balm." },
  { nome: "Corte + barba", categoria: "Combos", precoCentavos: 7500, duracaoMin: 60, descricao: "O combo completo com toalha quente." },
  { nome: "Pezinho", categoria: "Cabelo", precoCentavos: 1500, duracaoMin: 15, descricao: null },
  { nome: "Sobrancelha", categoria: "Estética", precoCentavos: 1500, duracaoMin: 15, descricao: null },
  { nome: "Luzes", categoria: "Química", precoCentavos: 12000, duracaoMin: 90, descricao: "Mechas com descoloração e tonalização." },
];

const PRODUTOS = [
  { nome: "Pomada modeladora", categoria: "Cabelo", precoCentavos: 4500, custoCentavos: 2000, estoque: 12, estoqueMinimo: 3 },
  { nome: "Óleo para barba", categoria: "Barba", precoCentavos: 3900, custoCentavos: 1500, estoque: 2, estoqueMinimo: 3 },
  { nome: "Shampoo anticaspa", categoria: "Cabelo", precoCentavos: 3200, custoCentavos: 1400, estoque: 8, estoqueMinimo: 2 },
  { nome: "Cerveja long neck", categoria: "Bebidas", precoCentavos: 1200, custoCentavos: 500, estoque: 24, estoqueMinimo: 6 },
];

const CLIENTES = [
  ["João Silva", "11987654321", "1990-10-12"], ["Pedro Souza", "11976543210", null], ["Marcos Lima", "11965432109", "1988-03-02"],
  ["André Costa", "11954321098", null], ["Bruno Alves", "11943210987", "1995-10-14"], ["Felipe Rocha", "11932109876", null],
  ["Gustavo Reis", "11921098765", null], ["Henrique Dias", "11910987654", "1992-07-30"], ["Igor Martins", "11909876543", null],
  ["Thiago Nunes", "11998765432", null],
] as const;

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);
  const hoje = diaLocal();

  for (const [n, demo] of DEMOS.entries()) {
    const antiga = await db.barbearia.findUnique({ where: { slug: demo.slug } });
    if (antiga) {
      await db.comanda.deleteMany({ where: { barbeariaId: antiga.id } });
      await db.assinatura.deleteMany({ where: { barbeariaId: antiga.id } });
      await db.agendamento.deleteMany({ where: { barbeariaId: antiga.id } });
      await db.barbearia.delete({ where: { id: antiga.id } });
    }
    const b = await db.barbearia.create({
      data: {
        nome: demo.nome,
        slug: demo.slug,
        telefone: "11999990000",
        endereco: "Rua Augusta, 1200 - Consolação, São Paulo",
        instagram: demo.slug.replace(/-/g, ""),
        descricao: "Barbearia clássica com atendimento sem pressa, café passado na hora e cerveja gelada.",
        corDestaque: demo.cor,
        cashbackPct: 5,
        horarios: { create: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, abre: "09:00", fecha: diaSemana === 6 ? "17:00" : "20:00" })) },
        usuarios: { create: { nome: "Roberto", email: demo.email, senhaHash } },
        barbeiros: { create: demo.barbeiros.map((nome, i) => ({ nome, comissaoPct: i === 0 ? 50 : 45, destaque: i < 2 })) },
        banners: {
          create: [
            { imagem: bannerSvg("#1f1a17", demo.cor, "Corte + barba", "R$ 75 · toalha quente inclusa"), ordem: 0 },
            { imagem: bannerSvg("#2b2420", demo.cor, "Clube do corte", "Cortes ilimitados por R$ 99,90/mês"), ordem: 1 },
          ],
        },
        parceiros: {
          create: [
            { nome: "Stilo Cell", descricao: "15% de desconto em capinhas e películas", cupom: "BARBA15" },
            { nome: "Academia Força Total", descricao: "Isenção da matrícula para clientes da barbearia", cupom: "CORTEFIT" },
          ],
        },
        servicos: { create: SERVICOS },
        produtos: { create: PRODUTOS },
        clientes: { create: CLIENTES.map(([nome, telefone, nascimento], i) => ({ nome, telefone, nascimento, senhaHash: i === 0 ? senhaHash : null })) },
      },
      include: { barbeiros: true, servicos: true, clientes: true, produtos: true },
    });
    const [s] = [b.servicos];
    const porNome = (nome: string) => s.find((x) => x.nome === nome)!;

    // Só o primeiro barbeiro faz luzes
    await db.servico.update({ where: { id: porNome("Luzes").id }, data: { barbeiros: { connect: { id: b.barbeiros[0].id } } } });

    if (n === 0) {
      await db.usuario.create({ data: { barbeariaId: b.id, barbeiroId: b.barbeiros[0].id, nome: "Carlos Mendes", email: "carlos@navalha.com", papel: "BARBEIRO", senhaHash } });
    }

    // Almoço de todos os barbeiros hoje
    for (const bb of b.barbeiros) {
      await db.bloqueio.create({ data: { barbeariaId: b.id, barbeiroId: bb.id, inicio: criarDataHora(hoje, "12:00"), fim: criarDataHora(hoje, "13:00"), motivo: "Almoço" } });
    }

    // Clube de assinatura
    const plano = await db.plano.create({
      data: { barbeariaId: b.id, nome: "Clube do corte", descricao: "Cortes ilimitados no mês.", precoCentavos: 9990, servicos: { connect: [{ id: porNome("Corte").id }, { id: porNome("Corte degradê").id }] } },
    });
    await db.plano.create({
      data: { barbeariaId: b.id, nome: "Clube completo", descricao: "4 combos de corte + barba por mês.", precoCentavos: 19990, usosPorMes: 4, servicos: { connect: [{ id: porNome("Corte + barba").id }] } },
    });
    for (const [i, cli] of [b.clientes[0], b.clientes[1]].entries()) {
      const ass = await db.assinatura.create({ data: { barbeariaId: b.id, clienteId: cli.id, planoId: plano.id, pagoAte: i === 0 ? somarMeses(hoje, 1) : somarDias(hoje, -3) } });
      await db.pagamentoAssinatura.create({ data: { assinaturaId: ass.id, valorCentavos: plano.precoCentavos, formaPagamento: "PIX", pagoEm: criarDataHora(somarDias(hoje, -20 - i * 5), "10:00") } });
    }

    // Contas a pagar
    await db.contaPagar.createMany({
      data: [
        { barbeariaId: b.id, descricao: "Aluguel", categoria: "Aluguel", valorCentavos: 250000, vencimento: somarDias(hoje, 3) },
        { barbeariaId: b.id, descricao: "Conta de luz", categoria: "Água e luz", valorCentavos: 38000, vencimento: somarDias(hoje, -1) },
        { barbeariaId: b.id, descricao: "Internet", categoria: "Internet e telefone", valorCentavos: 12000, vencimento: somarDias(hoje, -8), pagoEm: criarDataHora(somarDias(hoje, -8), "11:00"), formaPagamento: "PIX" },
      ],
    });

    // 3 semanas de atendimentos concluídos + agenda de hoje e amanhã
    const comuns = ["Corte", "Corte degradê", "Barba", "Corte + barba", "Corte", "Pezinho"].map(porNome);
    let k = 0;
    for (let d = -20; d <= 1; d++) {
      const dia = somarDias(hoje, d);
      if (diaDaSemana(dia) === 0) continue;
      const horas = d === 0 ? ["09:00", "10:00", "11:00", "14:00", "15:30", "17:00", "18:30"] : d === 1 ? ["09:30", "11:00", "15:00"] : ["09:00", "10:30", "14:00", "16:00", "18:00"].slice(0, 3 + (k % 3));
      for (const [j, hora] of horas.entries()) {
        k++;
        const servico = comuns[(k + j) % comuns.length];
        const barbeiro = b.barbeiros[(k + j) % b.barbeiros.length];
        const cliente = b.clientes[(k * 3 + j) % b.clientes.length];
        const inicio = criarDataHora(dia, hora);
        const passado = inicio.getTime() + servico.duracaoMin * 60_000 < Date.now();
        const falta = passado && k % 13 === 0;
        const ag = await db.agendamento.create({
          data: {
            barbeariaId: b.id, barbeiroId: barbeiro.id, servicoId: servico.id, clienteId: cliente.id, inicio,
            fim: new Date(inicio.getTime() + servico.duracaoMin * 60_000), precoCentavos: servico.precoCentavos,
            origem: k % 3 === 0 ? "PAINEL" : "ONLINE", status: falta ? "FALTOU" : k % 4 === 0 && !passado ? "CONFIRMADO" : "AGENDADO",
          },
        });
        if (!passado || falta) continue;
        const comanda = await abrirComanda({ barbeariaId: b.id, agendamentoId: ag.id });
        if (k % 4 === 0) await adicionarProduto(b.id, comanda.id, b.produtos[k % b.produtos.length].id, 1, barbeiro.id);
        await fecharComanda(b.id, comanda.id, { formaPagamento: ["PIX", "CARTAO_DEBITO", "DINHEIRO", "CARTAO_CREDITO"][k % 4], descontoCentavos: 0, usarCashback: k % 5 === 0 });
        const fechada = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
        await db.comanda.update({ where: { id: comanda.id }, data: { fechadaEm: fechada, abertaEm: inicio } });
      }
    }
    console.log(`✅ ${demo.nome}: login ${demo.email} / 123456 · link /b/${demo.slug}`);
  }
  console.log("✅ Barbeiro: carlos@navalha.com / 123456");
  console.log("✅ Cliente (área do cliente): WhatsApp 11987654321 / 123456");
}

main().finally(() => db.$disconnect());
