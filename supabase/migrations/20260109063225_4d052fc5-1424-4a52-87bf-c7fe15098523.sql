-- Create fabric_prices table for fabric quality pricing
CREATE TABLE public.fabric_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fabric_name TEXT NOT NULL,
  en INTEGER NOT NULL DEFAULT 0,
  gramaj INTEGER NOT NULL DEFAULT 0,
  fiyat DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fabric_name)
);

-- Enable RLS
ALTER TABLE public.fabric_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own fabric prices"
ON public.fabric_prices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fabric prices"
ON public.fabric_prices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fabric prices"
ON public.fabric_prices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fabric prices"
ON public.fabric_prices FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_fabric_prices_updated_at
BEFORE UPDATE ON public.fabric_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();