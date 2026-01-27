-- Add explicit deny policies to satisfy RLS linter (server uses service role bypass)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Deny select payment_transactions'
  ) THEN
    CREATE POLICY "Deny select payment_transactions"
    ON public.payment_transactions
    FOR SELECT
    TO public
    USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Deny insert payment_transactions'
  ) THEN
    CREATE POLICY "Deny insert payment_transactions"
    ON public.payment_transactions
    FOR INSERT
    TO public
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Deny update payment_transactions'
  ) THEN
    CREATE POLICY "Deny update payment_transactions"
    ON public.payment_transactions
    FOR UPDATE
    TO public
    USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Deny delete payment_transactions'
  ) THEN
    CREATE POLICY "Deny delete payment_transactions"
    ON public.payment_transactions
    FOR DELETE
    TO public
    USING (false);
  END IF;
END $$;