"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterOuCriarCliente, temConflito } from "@/lib/agenda";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { FORMAS_PAGAMENTO, lerDinheiro, somenteDigitos } from "@/lib/formato";
import { criarDataHora, diaValido } from "@/lib/tempo";

export type Resultado = { erro?: string; ok?: string } | null;

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

// ---------- Serviços ----------

export async function salvarServico(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirSessao();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const precoCentavos = lerDinheiro(texto(form, "preco"));
  const duracaoMin = Number(texto(form, "duracao"));

  if (!nome) return { erro: "Informe o nome do serviço." };
  if (precoCentavos === null) return { erro: "Preço inválido. Ex.: 35,00" };
  if (!Number.isInteger(duracaoMin) || duracaoMin < 5 || duracaoMin > 480)
    return { erro: "Duração deve ser entre 5 e 480 minutos." };

  if (id) {
    await db.servico.updateMany({ where: { id, barbeariaId }, data: { nome, precoCentavos, duracaoMin } });
  } else {
    await db.servico.create({ data: { barbeariaId, nome, precoCentavos, duracaoMin } });
  }
  revalidatePath("/painel/servicos");
  return { ok: "Serviço salvo." };
}

export async function alternarServico(form: FormData) {
  const { barbeariaId } = await exigirSessao();
  const servico = await db.servico.findFirst({ where: { id: texto(form, "id"), barbeariaId } });
  if (servico) await db.servico.update({ where: { id: servico.id }, data: { ativo: !servico.ativo } });
  revalidatePath("/painel/servicos");
}

// ---------- Barbeiros ----------

export async function salvarBarbeiro(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirSessao();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const telefone = somenteDigitos(texto(form, "telefone")) || null;
  const comissaoPct = Number(texto(form, "comissao"));

  if (!nome) return { erro: "Informe o nome do barbeiro." };
  if (!Number.isInteger(comissaoPct) || comissaoPct < 0 || comissaoPct > 100)
    return { erro: "Comissão deve ser entre 0 e 100%." };

  if (id) {
    await db.barbeiro.updateMany({ where: { id, barbeariaId }, data: { nome, telefone, comissaoPct } });
  } else {
    await db.barbeiro.create({ data: { barbeariaId, nome, telefone, comissaoPct } });
  }
  revalidatePath("/painel/barbeiros");
  return { ok: "Barbeiro salvo." };
}

export async function alternarBarbeiro(form: FormData) {
  const { barbeariaId } = await exigirSessao();
  const barbeiro = await db.barbeiro.findFirst({ where: { id: texto(form, "id"), barbeariaId } });
  if (barbeiro) await db.barbeiro.update({ where: { id: barbeiro.id }, data: { ativo: !barbeiro.ativo } });
  revalidatePath("/painel/barbeiros");
}

// ---------- Clientes ----------

export async function salvarCliente(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirSessao();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const telefone = somenteDigitos(texto(form, "telefone"));
  const observacao = texto(form, "observacao") || null;

  if (!nome) return { erro: "Informe o nome do cliente." };
  if (telefone.length < 10 || telefone.length > 11) return { erro: "Telefone deve ter DDD + número." };

  const mesmoTelefone = await db.cliente.findUnique({
    where: { barbeariaId_telefone: { barbeariaId, telefone } },
  });
  if (mesmoTelefone && mesmoTelefone.id !== id)
    return { erro: `Já existe um cliente com esse telefone (${mesmoTelefone.nome}).` };

  if (id) {
    await db.cliente.updateMany({ where: { id, barbeariaId }, data: { nome, telefone, observacao } });
  } else {
    await db.cliente.create({ data: { barbeariaId, nome, telefone, observacao } });
  }
  revalidatePath("/painel/clientes");
  return { ok: "Cliente salvo." };
}

// ---------- Agendamentos ----------

export async function criarAgendamento(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirSessao();
  const dia = texto(form, "dia");
  const hora = texto(form, "hora");
  const encaixe = form.get("encaixe") === "on";

  const [barbeiro, servico] = await Promise.all([
    db.barbeiro.findFirst({ where: { id: texto(form, "barbeiroId"), barbeariaId, ativo: true } }),
    db.servico.findFirst({ where: { id: texto(form, "servicoId"), barbeariaId, ativo: true } }),
  ]);
  if (!barbeiro) return { erro: "Escolha o barbeiro." };
  if (!servico) return { erro: "Escolha o serviço." };
  if (!diaValido(dia) || !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Informe data e hora." };

  let clienteId = texto(form, "clienteId");
  if (clienteId) {
    const existe = await db.cliente.findFirst({ where: { id: clienteId, barbeariaId } });
    if (!existe) return { erro: "Cliente não encontrado." };
  } else {
    const nome = texto(form, "clienteNome");
    const telefone = somenteDigitos(texto(form, "clienteTelefone"));
    if (!nome || telefone.length < 10) return { erro: "Escolha um cliente ou informe nome e telefone." };
    clienteId = (await obterOuCriarCliente(barbeariaId, nome, telefone)).id;
  }

  const inicio = criarDataHora(dia, hora);
  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
  if (!encaixe && (await temConflito(barbeiro.id, inicio, fim)))
    return { erro: `${barbeiro.nome} já tem atendimento nesse horário. Marque "encaixe" para agendar mesmo assim.` };

  await db.agendamento.create({
    data: {
      barbeariaId,
      barbeiroId: barbeiro.id,
      servicoId: servico.id,
      clienteId,
      inicio,
      fim,
      precoCentavos: servico.precoCentavos,
      origem: "PAINEL",
      observacao: texto(form, "observacao") || null,
    },
  });
  revalidatePath("/painel");
  redirect(`/painel?dia=${dia}`);
}

export async function mudarStatus(form: FormData) {
  const { barbeariaId } = await exigirSessao();
  const status = texto(form, "status");
  if (!["AGENDADO", "CONCLUIDO", "CANCELADO", "FALTOU"].includes(status)) return;

  const formaPagamento = texto(form, "formaPagamento");
  await db.agendamento.updateMany({
    where: { id: texto(form, "id"), barbeariaId },
    data: {
      status,
      formaPagamento: status === "CONCLUIDO" && formaPagamento in FORMAS_PAGAMENTO ? formaPagamento : null,
    },
  });
  revalidatePath("/painel");
}

// ---------- Configurações ----------

export async function salvarConfiguracoes(_: Resultado, form: FormData): Promise<Resultado> {
  const { barbeariaId } = await exigirSessao();
  const nome = texto(form, "nome");
  const intervaloMin = Number(texto(form, "intervalo"));
  const antecedenciaDias = Number(texto(form, "antecedencia"));

  if (!nome) return { erro: "Informe o nome da barbearia." };
  if (![10, 15, 20, 30, 45, 60].includes(intervaloMin)) return { erro: "Intervalo inválido." };
  if (!Number.isInteger(antecedenciaDias) || antecedenciaDias < 1 || antecedenciaDias > 90)
    return { erro: "Antecedência deve ser entre 1 e 90 dias." };

  const horarios: { diaSemana: number; abre: string; fecha: string }[] = [];
  for (let d = 0; d < 7; d++) {
    if (form.get(`aberto_${d}`) !== "on") continue;
    const abre = texto(form, `abre_${d}`);
    const fecha = texto(form, `fecha_${d}`);
    if (!/^\d{2}:\d{2}$/.test(abre) || !/^\d{2}:\d{2}$/.test(fecha) || abre >= fecha)
      return { erro: "Confira os horários de abertura e fechamento." };
    horarios.push({ diaSemana: d, abre, fecha });
  }

  await db.$transaction([
    db.barbearia.update({
      where: { id: barbeariaId },
      data: {
        nome,
        telefone: somenteDigitos(texto(form, "telefone")) || null,
        endereco: texto(form, "endereco") || null,
        intervaloMin,
        antecedenciaDias,
      },
    }),
    db.horarioFuncionamento.deleteMany({ where: { barbeariaId } }),
    db.horarioFuncionamento.createMany({ data: horarios.map((h) => ({ ...h, barbeariaId })) }),
  ]);
  revalidatePath("/painel", "layout");
  return { ok: "Configurações salvas." };
}
