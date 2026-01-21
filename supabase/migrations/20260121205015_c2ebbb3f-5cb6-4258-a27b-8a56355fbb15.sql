-- Allow hosts (authenticated users) to delete their own properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND policyname = 'Hosts podem remover suas propriedades'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Hosts podem remover suas propriedades"
      ON public.properties
      FOR DELETE
      USING (auth.uid() = host_id)
    $pol$;
  END IF;
END $$;