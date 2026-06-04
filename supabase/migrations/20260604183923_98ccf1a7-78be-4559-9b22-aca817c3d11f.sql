CREATE TABLE public.payment_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  paddle_transaction_id text NOT NULL,
  reason text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_failures TO authenticated;
GRANT ALL ON public.payment_failures TO service_role;

ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment failures"
  ON public.payment_failures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages payment failures"
  ON public.payment_failures FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_payment_failures_user ON public.payment_failures(user_id, created_at DESC);

-- One-off admin grant by email lookup. No email is stored anywhere in code.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'paramista@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;