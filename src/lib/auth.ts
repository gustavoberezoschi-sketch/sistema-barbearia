import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { limparVariavel } from "./env";

const COOKIE = "sessao";
const DURACAO_DIAS = 30;

export type Sessao = { usuarioId: string; barbeariaId: string; nome: string };

function chave() {
  const segredo = limparVariavel(process.env.AUTH_SECRET);
  if (!segredo) throw new Error("Defina AUTH_SECRET no arquivo .env");
  return new TextEncoder().encode(segredo);
}

export async function criarSessao(sessao: Sessao) {
  const token = await new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(chave());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 60 * 60,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export async function lerSessao(): Promise<Sessao | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    return {
      usuarioId: String(payload.usuarioId),
      barbeariaId: String(payload.barbeariaId),
      nome: String(payload.nome),
    };
  } catch {
    return null;
  }
}

/** Use em páginas e ações do painel: redireciona para o login se não houver sessão. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  return sessao;
}
