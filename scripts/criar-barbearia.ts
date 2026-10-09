// Cadastra uma nova barbearia cliente e o login do dono pelo terminal.
// (Também é possível fazer isso pelo navegador, na área /admin.)
// Uso: npm run criar-barbearia
import { createInterface } from "node:readline/promises";
import { criarBarbearia, gerarSlug } from "../src/lib/barbearias";
import { db } from "../src/lib/db";

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log("\n=== Nova barbearia ===\n");
  const nome = await rl.question("Nome da barbearia: ");
  const sugestao = gerarSlug(nome);
  const slug = (await rl.question(`Endereço do link (/b/...) [${sugestao}]: `)) || sugestao;
  const dono = await rl.question("Nome do dono: ");
  const email = await rl.question("E-mail de login: ");
  const senha = await rl.question("Senha (mín. 6 caracteres): ");

  const barbearia = await criarBarbearia({ nome, slug, dono, email, senha });
  console.log(`\n✅ Barbearia criada!`);
  console.log(`   Painel: /login  (${email.trim().toLowerCase()})`);
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
