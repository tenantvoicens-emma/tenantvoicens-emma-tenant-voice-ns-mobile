BEGIN;

-- Properties and landlords are public reference data: anyone may read them,
-- but only the service role (server-side code and admins) may change them.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.properties FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.landlords FROM anon, authenticated;

GRANT SELECT ON public.properties TO anon, authenticated;
GRANT SELECT ON public.landlords TO anon, authenticated;

DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS landlords_public_read ON public.landlords;
CREATE POLICY landlords_public_read
  ON public.landlords
  FOR SELECT
  TO anon, authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';

COMMIT;
