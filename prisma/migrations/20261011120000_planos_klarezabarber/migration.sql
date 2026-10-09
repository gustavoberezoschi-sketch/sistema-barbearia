-- AlterTable
ALTER TABLE "Barbearia" ADD COLUMN     "ciclo" TEXT NOT NULL DEFAULT 'MENSAL',
ADD COLUMN     "pagoAte" TEXT,
ADD COLUMN     "plano" TEXT NOT NULL DEFAULT 'BAIRRO',
ADD COLUMN     "suspensa" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PagamentoSistema" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "ciclo" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "referenteAte" TEXT NOT NULL,
    "observacao" TEXT,
    "pagoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigSistema" (
    "id" TEXT NOT NULL DEFAULT 'geral',
    "whatsappSuporte" TEXT,

    CONSTRAINT "ConfigSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagamentoSistema_barbeariaId_pagoEm_idx" ON "PagamentoSistema"("barbeariaId", "pagoEm");

-- AddForeignKey
ALTER TABLE "PagamentoSistema" ADD CONSTRAINT "PagamentoSistema_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

