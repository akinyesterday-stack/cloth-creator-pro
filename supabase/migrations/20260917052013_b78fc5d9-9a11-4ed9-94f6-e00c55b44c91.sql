ALTER TABLE public.sas_items
  ADD COLUMN IF NOT EXISTS composition text,
  ADD COLUMN IF NOT EXISTS width_cm numeric,
  ADD COLUMN IF NOT EXISTS gsm_m2 numeric,
  ADD COLUMN IF NOT EXISTS dyehouse text,
  ADD COLUMN IF NOT EXISTS dye_price numeric;

ALTER TABLE public.sas_items DROP COLUMN line_total;

ALTER TABLE public.sas_items
  ADD COLUMN line_total numeric
  GENERATED ALWAYS AS (
    round(((COALESCE(gramaj, 0::numeric) * order_quantity::numeric) / 1000.0)
      * (COALESCE(unit_price, 0::numeric) + COALESCE(dye_price, 0::numeric)), 2)
  ) STORED;

ALTER TABLE public.sas_forms
  ADD COLUMN IF NOT EXISTS cost_opened_by uuid,
  ADD COLUMN IF NOT EXISTS cost_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

UPDATE public.sas_forms s
SET total_amount = COALESCE((SELECT SUM(line_total) FROM public.sas_items i WHERE i.sas_id = s.id), 0);