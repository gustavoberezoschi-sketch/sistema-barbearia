-- Nova cor padrão das barbearias (verde do KlarezaBarber).
ALTER TABLE "Barbearia" ALTER COLUMN "corDestaque" SET DEFAULT '#145c3c';

-- Quem ainda estava com o dourado padrão antigo passa para o verde.
UPDATE "Barbearia" SET "corDestaque" = '#145c3c' WHERE lower("corDestaque") = '#c9a14a';
