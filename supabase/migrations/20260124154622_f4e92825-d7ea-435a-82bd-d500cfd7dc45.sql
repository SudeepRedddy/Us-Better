-- =============================================
-- MULTI-FRIEND SYSTEM WITH PRIVACY + PHOTO UPLOAD
-- =============================================

-- 1. Create friendships table (invite-based)
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- 2. Create invite codes table
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_by UUID,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add visibility column to habits (default public for backwards compat)
ALTER TABLE public.habits ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- 4. Add avatar_url to profiles for photo uploads
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- 5. Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- 6. Enable RLS on new tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR FRIENDSHIPS
-- =============================================

-- Users can view friendships where they're either party
CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests
CREATE POLICY "Users can create friendships"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friendships (accept/reject) where they're the friend_id
CREATE POLICY "Users can update friendships they received"
ON public.friendships FOR UPDATE
USING (auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =============================================
-- RLS POLICIES FOR INVITE CODES
-- =============================================

-- Users can view their own invite codes
CREATE POLICY "Users can view their own invite codes"
ON public.invite_codes FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own invite codes
CREATE POLICY "Users can create invite codes"
ON public.invite_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can view unexpired codes (to use them)
CREATE POLICY "Anyone can view valid invite codes to use them"
ON public.invite_codes FOR SELECT
USING (auth.uid() IS NOT NULL AND used_by IS NULL AND expires_at > now());

-- Users can update invite codes (mark as used)
CREATE POLICY "Users can use invite codes"
ON public.invite_codes FOR UPDATE
USING (auth.uid() IS NOT NULL AND used_by IS NULL AND expires_at > now());

-- =============================================
-- STORAGE POLICIES FOR AVATARS
-- =============================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar (folder = user_id)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- HELPER FUNCTION TO CHECK IF USERS ARE FRIENDS
-- =============================================

CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (user_id = user1_id AND friend_id = user2_id)
      OR (user_id = user2_id AND friend_id = user1_id)
    )
  )
$$;

-- =============================================
-- UPDATE HABITS RLS TO RESPECT VISIBILITY
-- =============================================

-- Drop existing select policy
DROP POLICY IF EXISTS "Authenticated users can view all habits" ON public.habits;

-- New policy: view own habits OR friends' public habits
CREATE POLICY "Users can view own habits and friends public habits"
ON public.habits FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    is_public = true 
    AND public.are_friends(auth.uid(), user_id)
  )
);

-- =============================================
-- UPDATE DAILY_CHECK_INS RLS TO RESPECT FRIENDSHIPS
-- =============================================

-- Drop existing select policy  
DROP POLICY IF EXISTS "Authenticated users can view all check-ins" ON public.daily_check_ins;

-- New policy: view check-ins for own habits OR friends' habits (always visible for progress)
CREATE POLICY "Users can view own and friends check-ins"
ON public.daily_check_ins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = daily_check_ins.habit_id
    AND (
      h.user_id = auth.uid()
      OR public.are_friends(auth.uid(), h.user_id)
    )
  )
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();