# ✂️ Sistema Barbearia

Sistema de agendamento online e gestão para barbearias (no estilo CashBarber).
É **multi-barbearia**: um único sistema atende várias barbearias, cada uma com
o próprio login, os próprios dados e o próprio link de agendamento.

| Cliente agendando pelo celular | Agenda do dia | Relatórios e comissões |
| --- | --- | --- |
| ![](docs/telas/agendamento-cliente.png) | ![](docs/telas/agenda.png) | ![](docs/telas/relatorios.png) |

## O que já funciona (MVP)

**Página pública de agendamento** — `/b/<nome-da-barbearia>`
- O cliente escolhe o serviço, o barbeiro (ou "sem preferência"), o dia e o horário livre
- Informa nome e WhatsApp; o cadastro do cliente é criado automaticamente
- Só mostra horários realmente livres (respeita a duração do serviço e o horário de funcionamento)
- Proteção contra dois clientes reservarem o mesmo horário ao mesmo tempo

**Painel da barbearia** — `/login`
- **Agenda:** visão do dia por barbeiro, com faturamento do dia, ações de concluir (com forma de pagamento), faltou, cancelar e botão de WhatsApp para confirmar com o cliente
- **Novo agendamento** pelo balcão, com opção de encaixe
- **Clientes:** busca, histórico de atendimentos, total gasto e última visita
- **Serviços:** preço e duração
- **Barbeiros:** com percentual de comissão
- **Relatórios:** faturamento, ticket médio, comissão a pagar por barbeiro, serviços mais vendidos e formas de pagamento
- **Configurações:** dados da barbearia, horário de funcionamento por dia da semana, intervalo entre horários e até quantos dias à frente o cliente pode agendar

## Tecnologias

Next.js 15 (React 19) · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL (Supabase) · hospedagem na Vercel

## Colocando no ar (Supabase + Vercel)

Leva uns 15 minutos. Você só precisa de uma conta no GitHub (que já tem).

### 1. Banco de dados no Supabase

1. Crie uma conta em https://supabase.com (pode entrar com o GitHub)
2. Clique em **New project**
   - **Name:** `sistema-barbearia`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha**
   - **Region:** *South America (São Paulo)*
3. Com o projeto criado, clique em **Connect** (no topo) → aba **ORMs** → **Prisma**.
   Aparecem duas linhas: `DATABASE_URL` (porta 6543) e `DIRECT_URL` (porta 5432).
   Copie as duas e troque `[YOUR-PASSWORD]` pela senha do passo anterior.

### 2. Site na Vercel

1. Crie uma conta em https://vercel.com usando **Continue with GitHub**
2. Clique em **Add New… → Project**, escolha o repositório `sistema-barbearia` e clique em **Import**
3. Em **Environment Variables**, adicione as 4 variáveis:

   | Nome | Valor |
   | --- | --- |
   | `DATABASE_URL` | a linha da porta **6543** copiada do Supabase |
   | `DIRECT_URL` | a linha da porta **5432** copiada do Supabase |
   | `AUTH_SECRET` | uma sequência aleatória longa (ex.: gere em https://generate-secret.vercel.app/32) |
   | `ADMIN_SENHA` | uma senha forte, só sua, para a área de administração |

4. Clique em **Deploy**. A Vercel instala tudo, **cria as tabelas no Supabase sozinha** e
   publica o site num endereço como `https://sistema-barbearia.vercel.app`.

> Se o projeto for importado de um branch que não é o `main`, ajuste em
> **Settings → Git → Production Branch**, ou faça o merge para o `main` antes.

### 3. Cadastrando as barbearias clientes

1. Acesse `https://SEU-SITE.vercel.app/admin` e entre com a `ADMIN_SENHA`
2. Cadastre cada barbearia (nome, dono, e-mail e senha inicial)
3. Passe para o dono o endereço `/login` com o e-mail e a senha. Ele cadastra os barbeiros e
   serviços e ajusta o horário de funcionamento em **Configurações**
4. Divulgue o link de agendamento `/b/<link-da-barbearia>` (bio do Instagram, WhatsApp,
   Google Meu Negócio)

Na mesma página `/admin` dá para ver todas as barbearias e redefinir a senha de um dono.

### Domínio próprio (opcional)

Na Vercel, **Settings → Domains** permite usar um domínio seu (ex.: `agendabarber.com.br`,
registrado no https://registro.br por cerca de R$ 40/ano).

### Custos

- **Supabase:** gratuito até 500 MB de banco (sobra para várias barbearias). No plano
  gratuito, o projeto é pausado após 7 dias **sem nenhum acesso**; com as barbearias
  usando todo dia, isso não acontece.
- **Vercel:** o plano gratuito (Hobby) serve para testar, mas pelos termos da Vercel é
  só para uso **não comercial**. Quando começar a cobrar das barbearias, passe para o
  plano **Pro** (US$ 20/mês).

## Rodando no seu computador (para desenvolver)

Precisa do [Node.js](https://nodejs.org) 20+ e de um PostgreSQL (pode usar um segundo
projeto gratuito do Supabase só para testes).

```bash
npm install
cp .env.example .env          # preencha com os dados do seu banco de testes
npx prisma migrate dev        # cria as tabelas
npm run db:seed               # (opcional) cria 2 barbearias de demonstração
npm run dev
```

Abra http://localhost:3000. Logins da demonstração (senha `123456`):
`dono@navalha.com` (`/b/navalha-de-ouro`) e `dono@corteforte.com` (`/b/corte-forte`).

Também dá para cadastrar barbearias pelo terminal com `npm run criar-barbearia`.

## Próximas etapas sugeridas

- [ ] Lembretes automáticos por WhatsApp (1 dia antes / 2 horas antes)
- [ ] Cliente cancelar ou remarcar pelo link
- [ ] Folgas e horários individuais por barbeiro (bloqueio de agenda)
- [ ] Comanda com venda de produtos e controle de estoque
- [ ] Caixa (abertura/fechamento) e contas a pagar
- [ ] Planos de assinatura (ex.: corte ilimitado mensal) com cobrança recorrente via Pix/cartão
- [ ] Programa de fidelidade / cashback
- [ ] Login individual para cada barbeiro ver a própria agenda e comissão
- [ ] Controle das mensalidades das barbearias clientes na área /admin
