// Cadastra uma nova barbearia cliente e o login do dono.
// Uso: npm run criar-barbearia
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

const db = new PrismaClient();
const rl = createInterface({ input: process.stdin, output: process.stdout });

function gerarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("\n=== Nova barbearia ===\n");
  const nome = (await rl.question("Nome da barbearia: ")).trim();
  const sugestao = gerarSlug(nome);
  const slug = gerarSlug((await rl.question(`Endereço do link (/b/...) [${sugestao}]: `)) || sugestao);
  const dono = (await rl.question("Nome do dono: ")).trim();
  const email = (await rl.question("E-mail de login: ")).trim().toLowerCase();
  const senha = await rl.question("Senha (mín. 6 caracteres): ");

  if (!nome || !slug || !dono || !email || senha.length < 6) throw new Error("Dados incompletos.");
  if (await db.barbearia.findUnique({ where: { slug } })) throw new Error(`O link /b/${slug} já está em uso.`);
  if (await db.usuario.findUnique({ where: { email } })) throw new Error(`O e-mail ${email} já está em uso.`);

  const barbearia = await db.barbearia.create({
    data: {
      nome,
      slug,
      // Padrão: segunda a sábado, 9h às 19h (pode ser alterado em Configurações).
      horarios: { create: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, abre: "09:00", fecha: "19:00" })) },
      usuarios: { create: { nome: dono, email, senhaHash: await bcrypt.hash(senha, 10) } },
    },
  });

  console.log(`\n✅ Barbearia criada!`);
  console.log(`   Painel: /login  (${email})`);
  console.log(`   Link para os clientes: /b/${barbearia.slug}\n`);
}

main()
  .catch((e) => {
    console.error(`\n❌ ${e.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await db.$disconnect();
  });
