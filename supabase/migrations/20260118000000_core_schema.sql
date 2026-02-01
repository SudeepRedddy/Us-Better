-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_type TEXT NOT NULL CHECK (avatar_type IN ('male', 'female')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create habits table (Consolidated with all columns)
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT DEFAULT 'sage',
  -- Consolidated columns from later migrations:
  is_public BOOLEAN DEFAULT true, 
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_frequency TEXT DEFAULT 'daily',
  reminder_times TEXT[] DEFAULT ARRAY['19:00'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create daily check-ins table
CREATE TABLE public.daily_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, check_in_date)
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

-- 6. Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. Habits Policies (Fixed: includes public visibility logic)
CREATE POLICY "Users can view own habits and public habits" ON public.habits
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_public = true
  );

CREATE POLICY "Users can insert their own habits" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Daily Check-ins Policies (Fixed: checks parent habit visibility)
CREATE POLICY "Users can view check-ins for visible habits" ON public.daily_check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM habits h
      WHERE h.id = daily_check_ins.habit_id 
      AND (h.user_id = auth.uid() OR h.is_public = true)
    )
  );

CREATE POLICY "Users can insert check-ins for their habits" ON public.daily_check_ins
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_id AND habits.user_id = auth.uid())
  );

CREATE POLICY "Users can delete check-ins for their habits" ON public.daily_check_ins
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_id AND habits.user_id = auth.uid())
  );

-- 9. Triggers & Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Friend'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_type', 'male')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();