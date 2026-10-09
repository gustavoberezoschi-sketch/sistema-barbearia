import { linkWhatsApp } from "./formato";
import { diaLocal, formatarDiaExtenso, horaLocal, somarDias } from "./tempo";

export const MSG_CONFIRMACAO_PADRAO =
  "Olá, {nome}! Seu horário na {barbearia} está agendado ✂️\n\n📅 {data} às {hora}\n💈 {servico} com {barbeiro}\n📍 {endereco}\n\nPara confirmar ou cancelar: {link}";

export const MSG_LEMBRETE_PADRAO =
  "Oi, {nome}! Passando para lembrar do seu horário na {barbearia} {quando} às {hora} ✂️\n\n💈 {servico} com {barbeiro}\n📍 {endereco}\n\nConfirme sua presença aqui: {link}\nTe esperamos!";

export const VARIAVEIS = [
  ["{nome}", "primeiro nome do cliente"],
  ["{barbearia}", "nome da barbearia"],
  ["{data}", "ex.: sexta-feira, 10 de outubro"],
  ["{quando}", "hoje, amanhã ou a data"],
  ["{hora}", "horário"],
  ["{servico}", "serviço(s)"],
  ["{barbeiro}", "barbeiro"],
  ["{unidade}", "nome da unidade"],
  ["{endereco}", "endereço da unidade"],
  ["{link}", "link para o cliente confirmar ou cancelar"],
] as const;

export type DadosMensagem = {
  cliente: string;
  barbearia: string;
  inicio: Date;
  servicos: string[];
  barbeiro: string;
  unidade: string;
  endereco: string | null;
  link: string;
};

export function preencherMensagem(modelo: string, d: DadosMensagem) {
  const dia = diaLocal(d.inicio);
  const hoje = diaLocal();
  const data = formatarDiaExtenso(dia);
  const quando = dia === hoje ? "hoje" : dia === somarDias(hoje, 1) ? "amanhã" : `${data}`;
  const valores: Record<string, string> = {
    "{nome}": d.cliente.split(" ")[0],
    "{barbearia}": d.barbearia,
    "{data}": data,
    "{quando}": quando,
    "{hora}": horaLocal(d.inicio),
    "{servico}": d.servicos.join(" + "),
    "{barbeiro}": d.barbeiro,
    "{unidade}": d.unidade,
    "{endereco}": d.endereco ?? "",
    "{link}": d.link,
  };
  return modelo
    .replace(/\{(nome|barbearia|data|quando|hora|servico|barbeiro|unidade|endereco|link)\}/g, (v) => valores[v] ?? v)
    .split("\n")
    .filter((linha) => !/^📍\s*$/.test(linha.trim())) // some a linha do endereço se não tiver endereço
    .join("\n");
}

export function linkDaMensagem(telefone: string, modelo: string, d: DadosMensagem) {
  return linkWhatsApp(telefone, preencherMensagem(modelo, d));
}
