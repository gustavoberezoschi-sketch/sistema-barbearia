"use client";

import { useEffect, useState, useTransition } from "react";
import { formatarDinheiro } from "@/lib/formato";
import { criarDataHora, FUSO } from "@/lib/tempo";
import { agendar, buscarHorarios, type Confirmacao } from "./actions";

type Servico = { id: string; nome: string; precoCentavos: number; duracaoMin: number };
type Barbeiro = { id: string; nome: string };

const SEM_PREFERENCIA = "";
const CHAVE_CONTATO = "barbearia:contato";

function rotuloDia(dia: string) {
  const data = criarDataHora(dia, "12:00");
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short" }).format(data);
  const numero = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" }).format(data);
  return { semana: semana.replace(".", ""), numero };
}

export function Agendar({ slug, servicos, barbeiros, dias }: {
  slug: string;
  servicos: Servico[];
  barbeiros: Barbeiro[];
  dias: string[];
}) {
  const [servico, setServico] = useState<Servico | null>(null);
  const [barbeiroId, setBarbeiroId] = useState<string | null>(null);
  const [dia, setDia] = useState(dias[0]);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<Extract<Confirmacao, { ok: true }>["resumo"] | null>(null);
  const [carregando, iniciar] = useTransition();

  // Lembra nome e telefone do cliente neste aparelho.
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CONTATO) ?? "null");
      if (salvo) {
        setNome(salvo.nome ?? "");
        setTelefone(salvo.telefone ?? "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!servico || barbeiroId === null) return;
    setHora(null);
    setHorarios(null);
    let ativo = true;
    buscarHorarios(slug, servico.id, barbeiroId || null, dia).then((h) => ativo && setHorarios(h));
    return () => {
      ativo = false;
    };
  }, [slug, servico, barbeiroId, dia]);

  function confirmar() {
    if (!servico || barbeiroId === null || !hora) return;
    setErro(null);
    iniciar(async () => {
      const r = await agendar(slug, { servicoId: servico.id, barbeiroId: barbeiroId || null, dia, hora, nome, telefone });
      if (r.ok) {
        try {
          localStorage.setItem(CHAVE_CONTATO, JSON.stringify({ nome, telefone }));
        } catch {}
        setConfirmado(r.resumo);
      } else {
        setErro(r.erro);
        if (r.horarioOcupado) {
          setHora(null);
          setHorarios(await buscarHorarios(slug, servico.id, barbeiroId || null, dia));
        }
      }
    });
  }

  if (confirmado) {
    return (
      <div className="card space-y-2 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="text-xl font-bold">Horário agendado!</h2>
        <p className="first-letter:uppercase">{confirmado.dia}, às {confirmado.hora}</p>
        <p className="text-stone-600">{confirmado.servico} com {confirmado.barbeiro}</p>
        <button className="btn-secundario mt-2" onClick={() => location.reload()}>Fazer outro agendamento</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Etapa numero={1} titulo="Escolha o serviço">
        <div className="space-y-2">
          {servicos.map((s) => (
            <button
              key={s.id}
              onClick={() => setServico(s)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${servico?.id === s.id ? "border-amber-600 bg-amber-50" : "border-stone-200 bg-white"}`}
            >
              <span>
                <span className="font-medium">{s.nome}</span>
                <span className="block text-sm text-stone-500">{s.duracaoMin} min</span>
              </span>
              <span className="font-semibold">{formatarDinheiro(s.precoCentavos)}</span>
            </button>
          ))}
        </div>
      </Etapa>

      {servico && (
        <Etapa numero={2} titulo="Escolha o barbeiro">
          <div className="flex flex-wrap gap-2">
            {[{ id: SEM_PREFERENCIA, nome: "Sem preferência" }, ...barbeiros].map((b) => (
              <button
                key={b.id}
                onClick={() => setBarbeiroId(b.id)}
                className={`rounded-full border px-4 py-2 text-sm ${barbeiroId === b.id ? "border-amber-600 bg-amber-600 text-white" : "border-stone-300 bg-white"}`}
              >
                {b.nome}
              </button>
            ))}
          </div>
        </Etapa>
      )}

      {servico && barbeiroId !== null && (
        <Etapa numero={3} titulo="Escolha o dia e horário">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {dias.map((d) => {
              const { semana, numero } = rotuloDia(d);
              return (
                <button
                  key={d}
                  onClick={() => setDia(d)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-center ${dia === d ? "border-amber-600 bg-amber-600 text-white" : "border-stone-200 bg-white"}`}
                >
                  <span className="block text-xs capitalize">{semana}</span>
                  <span className="font-semibold">{numero}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            {horarios === null ? (
              <p className="text-sm text-stone-500">Carregando horários...</p>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-stone-500">Sem horários livres neste dia. Tente outro dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {horarios.map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      setHora(h);
                      setErro(null);
                    }}
                    className={`rounded-lg border py-2 text-sm font-medium ${hora === h ? "border-amber-600 bg-amber-600 text-white" : "border-stone-200 bg-white"}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
          {erro && !hora && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
        </Etapa>
      )}

      {hora && (
        <Etapa numero={4} titulo="Seus dados">
          <div className="space-y-3">
            <input className="input" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input
              className="input"
              placeholder="WhatsApp com DDD"
              inputMode="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            {erro && <p className="text-sm text-rose-700">{erro}</p>}
            <button className="btn-primario w-full py-3" onClick={confirmar} disabled={carregando || !nome || !telefone}>
              {carregando ? "Agendando..." : `Confirmar ${hora}`}
            </button>
          </div>
        </Etapa>
      )}
    </div>
  );
}

function Etapa({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-xs text-white">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}
