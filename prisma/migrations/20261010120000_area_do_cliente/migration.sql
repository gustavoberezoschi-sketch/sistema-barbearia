-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "grupo" TEXT;

-- AlterTable
ALTER TABLE "Barbeiro" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "destaque" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "senhaHash" TEXT;

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "link" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parceiro" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cupom" TEXT,
    "imagem" TEXT,
    "link" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agendamento_grupo_idx" ON "Agendamento"("grupo");

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parceiro" ADD CONSTRAINT "Parceiro_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "Barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

