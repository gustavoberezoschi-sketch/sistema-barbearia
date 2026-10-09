-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "confirmacaoEnviadaEm" TIMESTAMP(3),
ADD COLUMN     "lembreteEnviadoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Barbearia" ADD COLUMN     "msgConfirmacao" TEXT,
ADD COLUMN     "msgLembrete" TEXT;

