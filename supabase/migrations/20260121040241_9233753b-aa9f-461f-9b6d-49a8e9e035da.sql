-- Fotos adicionais por propriedade
CREATE TABLE IF NOT EXISTS public.property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON public.property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_sort ON public.property_photos(property_id, sort_order);

ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotos são visíveis para todos"
ON public.property_photos
FOR SELECT
USING (true);

-- Apenas o host da propriedade pode gerenciar fotos
CREATE POLICY "Hosts podem adicionar fotos"
ON public.property_photos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = property_photos.property_id
      AND p.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts podem atualizar fotos"
ON public.property_photos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = property_photos.property_id
      AND p.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts podem remover fotos"
ON public.property_photos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = property_photos.property_id
      AND p.host_id = auth.uid()
  )
);


-- Avaliações/reviews por propriedade
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating numeric NOT NULL,
  comment text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_reviews_property_id ON public.property_reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_user_id ON public.property_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_created_at ON public.property_reviews(property_id, created_at DESC);

ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliações são visíveis para todos"
ON public.property_reviews
FOR SELECT
USING (true);

CREATE POLICY "Usuários podem criar suas avaliações"
ON public.property_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar suas avaliações"
ON public.property_reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem apagar suas avaliações"
ON public.property_reviews
FOR DELETE
USING (auth.uid() = user_id);
