-- Create user_type enum for different user roles
CREATE TYPE public.user_type AS ENUM (
  'admin',
  'buyer',
  'fabric',
  'planlama',
  'fason',
  'kesim_takip',
  'tedarik_muduru',
  'isletme_muduru',
  'tedarik_sorumlusu'
);

-- Add user_type column to profiles
ALTER TABLE public.profiles 
ADD COLUMN user_type public.user_type DEFAULT 'admin';

-- Create buyer_orders table for buyer-specific orders
CREATE TABLE public.buyer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  po_number TEXT NOT NULL UNIQUE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_code TEXT,
  model_name TEXT NOT NULL,
  model_image TEXT,
  customer_name TEXT NOT NULL DEFAULT 'TAHA GİYİM SAN. VE TİC. A.Ş.',
  brand TEXT,
  season TEXT,
  mal_tanimi TEXT,
  merch_alt_grup TEXT,
  yi_inspection_date DATE,
  yd_inspection_date DATE,
  teslim_yeri TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  kdv_rate NUMERIC DEFAULT 10,
  kdv_amount NUMERIC DEFAULT 0,
  total_with_kdv NUMERIC DEFAULT 0,
  profit_margin NUMERIC DEFAULT 0,
  profit_amount NUMERIC DEFAULT 0,
  fabric_price NUMERIC DEFAULT 0,
  option_price TEXT,
  kumesci TEXT DEFAULT 'TAHA GİYİM SAN. VE TİC. A.Ş.',
  assigned_to UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create buyer_order_items for size breakdowns
CREATE TABLE public.buyer_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  jit BOOLEAN DEFAULT false,
  satis_bolgesi TEXT DEFAULT 'Yurt İçi',
  model TEXT,
  option_name TEXT,
  inspection_date DATE,
  -- Açık Adet (open quantities)
  size_0m_1m INTEGER DEFAULT 0,
  size_1m_3m INTEGER DEFAULT 0,
  size_3m_6m INTEGER DEFAULT 0,
  size_6m_9m INTEGER DEFAULT 0,
  -- Asorti Adet
  asorti_0m_1m INTEGER DEFAULT 0,
  asorti_1m_3m INTEGER DEFAULT 0,
  asorti_3m_6m INTEGER DEFAULT 0,
  asorti_6m_9m INTEGER DEFAULT 0,
  asorti_count INTEGER DEFAULT 0,
  asorti_per_set INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create country details table
CREATE TABLE public.buyer_order_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  color TEXT,
  rota TEXT,
  size_0m_1m INTEGER DEFAULT 0,
  size_1m_3m INTEGER DEFAULT 0,
  size_3m_6m INTEGER DEFAULT 0,
  size_6m_9m INTEGER DEFAULT 0,
  ana_beden INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_order_countries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buyer_orders
CREATE POLICY "Buyers can view their own orders"
ON public.buyer_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Buyers can create orders"
ON public.buyer_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Buyers can update their own orders"
ON public.buyer_orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Buyers can delete their own orders"
ON public.buyer_orders FOR DELETE
USING (auth.uid() = user_id);

-- Assigned users can view orders
CREATE POLICY "Assigned users can view orders"
ON public.buyer_orders FOR SELECT
USING (auth.uid() = assigned_to);

-- Admins can view all orders
CREATE POLICY "Admins can view all buyer orders"
ON public.buyer_orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS for order items
CREATE POLICY "Users can manage order items through orders"
ON public.buyer_order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.buyer_orders
  WHERE buyer_orders.id = buyer_order_items.order_id
  AND (buyer_orders.user_id = auth.uid() OR buyer_orders.assigned_to = auth.uid())
));

-- RLS for countries
CREATE POLICY "Users can manage order countries through orders"
ON public.buyer_order_countries FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.buyer_orders
  WHERE buyer_orders.id = buyer_order_countries.order_id
  AND (buyer_orders.user_id = auth.uid() OR buyer_orders.assigned_to = auth.uid())
));

-- Update trigger for buyer_orders
CREATE TRIGGER update_buyer_orders_updated_at
BEFORE UPDATE ON public.buyer_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();