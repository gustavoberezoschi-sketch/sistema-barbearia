import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { limparVariavel } from "./env";

// Criptografia de segredos guardados no banco (ex.: chave da subconta do Asaas),
// com chave derivada do AUTH_SECRET.
function chave() {
  const segredo = limparVariavel(process.env.AUTH_SECRET);
  if (!segredo) throw new Error("Defina AUTH_SECRET");
  return createHash("sha256").update(`cofre:${segredo}`).digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), dados.toString("base64")].join(":");
}

export function decifrar(cifrado: string): string {
  const [versao, iv, tag, dados] = cifrado.split(":");
  if (versao !== "v1") throw new Error("Formato de segredo desconhecido");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
}

/** Token que o Asaas envia no webhook (derivado do AUTH_SECRET, não precisa configurar). */
export function tokenWebhookAsaas() {
  const segredo = limparVariavel(process.env.AUTH_SECRET) ?? "";
  return createHmac("sha256", segredo).update("asaas-webhook").digest("hex");
}

export function tokenConfere(recebido: string | null) {
  if (!recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(tokenWebhookAsaas());
  return a.length === b.length && timingSafeEqual(a, b);
}
