-- Add reminder settings to habits table
ALTER TABLE public.habits 
ADD COLUMN reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN reminder_frequency text NOT NULL DEFAULT 'daily',
ADD COLUMN reminder_times text[] DEFAULT ARRAY['19:00']::text[];

-- Comment on columns
COMMENT ON COLUMN public.habits.reminder_enabled IS 'Whether reminders are enabled for this habit';
COMMENT ON COLUMN public.habits.reminder_frequency IS 'Frequency: daily, hourly, custom';
COMMENT ON COLUMN public.habits.reminder_times IS 'Array of times in HH:MM format (24h) for reminders';