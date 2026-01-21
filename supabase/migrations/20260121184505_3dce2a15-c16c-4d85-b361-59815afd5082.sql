-- Tornar user_id nullable para permitir reservas sem login
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- Adicionar policy para permitir INSERT sem autenticação
DO $$ BEGIN
  CREATE POLICY "Qualquer pessoa pode criar reservas"
  ON public.bookings
  FOR INSERT
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permitir SELECT público para ver reservas próprias via email
DO $$ BEGIN
  CREATE POLICY "Qualquer pessoa pode ver reservas por email"
  ON public.bookings
  FOR SELECT
  USING (guest_email IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;