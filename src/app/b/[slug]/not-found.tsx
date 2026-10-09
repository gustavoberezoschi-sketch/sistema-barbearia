import Link from "next/link";
import { Scissors } from "lucide-react";

export default function BarbeariaNaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
      <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-couro-900 text-latao-500">
        <Scissors className="size-6" />
      </span>
      <h1 className="titulo">Barbearia não encontrada</h1>
      <p className="mt-2 text-couro-400">
        Confira se o endereço está certo. O link de cada barbearia aparece no painel, em Configurações, e na área de administração.
      </p>
      <Link href="/" className="btn-primario mt-6">Ver barbearias</Link>
    </main>
  );
}
