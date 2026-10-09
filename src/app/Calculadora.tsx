"use client";

import { useState } from "react";
import { formatarDinheiro } from "@/lib/formato";

/** Simulador da receita do clube de assinatura, na landing page. */
export function Calculadora() {
  const [assinantes, setAssinantes] = useState(80);
  const [preco, setPreco] = useState(89);
  const mensal = assinantes * preco * 100;
  return (
    <div className="rounded-3xl border border-white/10 bg-couro-900 p-6 text-white sm:p-8">
      <p className="text-sm font-semibold text-latao-500">Simule o seu clube</p>
      <div className="mt-6 space-y-6">
        <label className="block">
          <span className="flex justify-between text-sm text-couro-300">
            Assinantes <strong className="numero text-lg text-white">{assinantes}</strong>
          </span>
          <input type="range" min={10} max={300} step={5} value={assinantes} onChange={(e) => setAssinantes(+e.target.value)} className="mt-2 w-full accent-latao-500" aria-label="Número de assinantes" />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm text-couro-300">
            Mensalidade do plano <strong className="numero text-lg text-white">{formatarDinheiro(preco * 100).replace(",00", "")}</strong>
          </span>
          <input type="range" min={39} max={199} step={5} value={preco} onChange={(e) => setPreco(+e.target.value)} className="mt-2 w-full accent-latao-500" aria-label="Valor da mensalidade" />
        </label>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
        <div>
          <p className="text-xs text-couro-400">Por mês</p>
          <p className="numero text-3xl text-latao-500 sm:text-4xl">{formatarDinheiro(mensal).replace(",00", "")}</p>
        </div>
        <div>
          <p className="text-xs text-couro-400">Por ano</p>
          <p className="numero text-3xl sm:text-4xl">{formatarDinheiro(mensal * 12).replace(",00", "")}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-couro-400">Valores brutos, antes das taxas do meio de pagamento.</p>
    </div>
  );
}
