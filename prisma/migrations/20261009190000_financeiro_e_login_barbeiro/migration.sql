-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "barbeiroId" TEXT;

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Outros',
    "valorCentavos" INTEGER NOT NULL,
    "vencimento" TEXT NOT NULL,
    "pagoEm" TIMESTAMP(3),
    "formaPagamento" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContaPagar_barbeariaId_vencimento_idx" ON "ContaPagar"("barbeariaId", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_barbeiroId_key" ON "Usuario"("barbeiroId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_barbeiroId_fkey" FOREIGN KEY ("barbeiroId") REFERENCES "Barbeiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

