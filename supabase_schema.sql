
-- 1. Reset: Drop existing table/policies to avoid conflicts
DROP TABLE IF EXISTS public.orders CASCADE;

-- 2. Create the table with specific columns requested
CREATE TABLE public.orders (
    -- Primary Key
    id TEXT PRIMARY KEY,

    -- Customer Details (Requested)
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    street_address TEXT,
    city TEXT,
    
    -- Order Details (Requested)
    product_name TEXT,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- Date-Time

    -- Essential App Columns (Required for functionality)
    phone TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    zip_code TEXT,
    payment_status TEXT DEFAULT 'Pending',
    order_status TEXT DEFAULT 'Pending',
    customer_notes TEXT,
    courier_name TEXT,
    courier_tracking_id TEXT,
    customer_courier_preference TEXT,
    customer_name TEXT
);

-- 3. Enable Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Create Access Policies
-- Allow anyone to insert (Checkout)
CREATE POLICY "Enable insert for public" ON public.orders 
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read (Admin Panel)
CREATE POLICY "Enable select for public" ON public.orders 
    FOR SELECT USING (true);

-- Allow anyone to update (Admin Status Updates)
CREATE POLICY "Enable update for public" ON public.orders 
    FOR UPDATE USING (true);
