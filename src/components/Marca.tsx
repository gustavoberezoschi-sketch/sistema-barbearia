/** Marca do sistema: KlarezaBarber. */
export function Marca({ tamanho = "md", clara = false }: { tamanho?: "sm" | "md" | "lg"; clara?: boolean }) {
  const texto = { sm: "text-sm", md: "text-xl", lg: "text-3xl" }[tamanho];
  const icone = { sm: "size-6 text-[11px] rounded-md", md: "size-9 text-base rounded-xl", lg: "size-12 text-xl rounded-2xl" }[tamanho];
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid shrink-0 place-items-center bg-latao-500 font-display font-extrabold text-couro-950 ${icone}`} aria-hidden>
        K
      </span>
      <span className={`font-display font-bold tracking-tight ${texto} ${clara ? "text-white" : "text-tinta"}`}>
        Klareza<span className="text-latao-500">Barber</span>
      </span>
    </span>
  );
}
