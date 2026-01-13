-- Create table for saved cost calculations
CREATE TABLE public.saved_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  images TEXT[] DEFAULT '{}',
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved costs" 
ON public.saved_costs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved costs" 
ON public.saved_costs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved costs" 
ON public.saved_costs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved costs" 
ON public.saved_costs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_costs_updated_at
BEFORE UPDATE ON public.saved_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster search
CREATE INDEX idx_saved_costs_user_id ON public.saved_costs(user_id);
CREATE INDEX idx_saved_costs_model_name ON public.saved_costs USING gin(to_tsvector('turkish', model_name));