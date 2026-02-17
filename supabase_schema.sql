
-- Drop the table if it exists to start fresh and avoid conflicts
DROP TABLE IF EXISTS public.orders CASCADE;

-- Create the orders table with the exact columns requested
CREATE TABLE public.orders (
    id TEXT PRIMARY KEY,
    
    -- Requested Columns
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    street_address TEXT,
    city TEXT,
    product_name TEXT,
    total_amount NUMERIC,
    
    -- "date-time" column (standardized as created_at)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Additional App Requirements
    phone TEXT,
    zip_code TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    payment_status TEXT DEFAULT 'Pending',
    order_status TEXT DEFAULT 'Pending',
    customer_notes TEXT,
    courier_name TEXT,
    courier_tracking_id TEXT,
    customer_courier_preference TEXT,
    
    -- Legacy field support
    customer_name TEXT
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies to allow the app to function (Read, Write, Update)
CREATE POLICY "Enable insert for public" ON public.orders 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for public" ON public.orders 
    FOR SELECT USING (true);

CREATE POLICY "Enable update for public" ON public.orders 
    FOR UPDATE USING (true);
