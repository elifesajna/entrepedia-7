-- Drop the incorrect foreign key constraint referencing auth.users
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;

-- Add correct foreign key constraint referencing profiles table
ALTER TABLE public.reports 
ADD CONSTRAINT reports_reporter_id_fkey 
FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;