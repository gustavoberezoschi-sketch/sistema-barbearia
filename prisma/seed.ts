// Dados de demonstração: duas barbearias com barbeiros, serviços e alguns agendamentos.
// Uso: npm run db:seed   (login: dono@navalha.com / 123456 e dono@corteforte.com / 123456)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { criarDataHora, diaLocal, somarDias } from "../src/lib/tempo";

const db = new PrismaClient();

const DEMOS = [
  {
    nome: "Barbearia Navalha de Ouro",
    slug: "navalha-de-ouro",
    email: "dono@navalha.com",
    barbeiros: ["Carlos", "Rafael", "Diego"],
  },
  {
    nome: "Corte Forte Barber Shop",
    slug: "corte-forte",
    email: "dono@corteforte.com",
    barbeiros: ["Lucas", "Mateus"],
  },
];

const SERVICOS = [
  { nome: "Corte", precoCentavos: 4000, duracaoMin: 30 },
  { nome: "Barba", precoCentavos: 3000, duracaoMin: 30 },
  { nome: "Corte + barba", precoCentavos: 6500, duracaoMin: 60 },
  { nome: "Pezinho", precoCentavos: 1500, duracaoMin: 15 },
  { nome: "Sobrancelha", precoCentavos: 1500, duracaoMin: 15 },
];

const CLIENTES = [
  ["João Silva", "11987654321"],
  ["Pedro Souza", "11976543210"],
  ["Marcos Lima", "11965432109"],
  ["André Costa", "11954321098"],
] as const;

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);
  const hoje = diaLocal();

  for (const demo of DEMOS) {
    await db.barbearia.deleteMany({ where: { slug: demo.slug } });
    const b = await db.barbearia.create({
      data: {
        nome: demo.nome,
        slug: demo.slug,
        telefone: "11999990000",
        endereco: "Rua Exemplo, 123 - Centro",
        horarios: { create: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, abre: "09:00", fecha: "19:00" })) },
        usuarios: { create: { nome: "Dono", email: demo.email, senhaHash } },
        barbeiros: { create: demo.barbeiros.map((nome) => ({ nome })) },
        servicos: { create: SERVICOS },
        clientes: { create: CLIENTES.map(([nome, telefone]) => ({ nome, telefone })) },
      },
      include: { barbeiros: true, servicos: true, clientes: true },
    });

    // Alguns atendimentos em dias passados (para os relatórios) e de hoje.
    const exemplos = [
      { dia: somarDias(hoje, -2), hora: "10:00", status: "CONCLUIDO", forma: "PIX" },
      { dia: somarDias(hoje, -2), hora: "11:00", status: "CONCLUIDO", forma: "DINHEIRO" },
      { dia: somarDias(hoje, -1), hora: "14:00", status: "CONCLUIDO", forma: "CARTAO_DEBITO" },
      { dia: somarDias(hoje, -1), hora: "15:00", status: "FALTOU", forma: null },
      { dia: hoje, hora: "16:00", status: "AGENDADO", forma: null },
      { dia: hoje, hora: "17:00", status: "AGENDADO", forma: null },
    ];
    for (const [i, ex] of exemplos.entries()) {
      const servico = b.servicos[i % b.servicos.length];
      const inicio = criarDataHora(ex.dia, ex.hora);
      await db.agendamento.create({
        data: {
          barbeariaId: b.id,
          barbeiroId: b.barbeiros[i % b.barbeiros.length].id,
          servicoId: servico.id,
          clienteId: b.clientes[i % b.clientes.length].id,
          inicio,
          fim: new Date(inicio.getTime() + servico.duracaoMin * 60_000),
          precoCentavos: servico.precoCentavos,
          status: ex.status,
          formaPagamento: ex.forma,
          origem: i % 2 ? "ONLINE" : "PAINEL",
        },
      });
    }
    console.log(`✅ ${demo.nome}: login ${demo.email} / 123456 · link /b/${demo.slug}`);
  }
}

main().finally(() => db.$disconnect());
