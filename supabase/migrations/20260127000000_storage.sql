-- 1. Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- (Removed the ALTER TABLE command that caused the error)

-- 2. Policy: Public Access
-- Everyone can view any avatar (needed for friends to see your pic)
-- We use DO $$ blocks to safely create policies without errors if they already exist

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Avatar images are publicly accessible'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'avatars' );
    END IF;
END
$$;

-- 3. Policy: Authenticated Uploads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload their own avatar'
    ) THEN
        CREATE POLICY "Users can upload their own avatar"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'avatars' 
            AND auth.role() = 'authenticated'
            AND (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END
$$;

-- 4. Policy: Authenticated Updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update their own avatar'
    ) THEN
        CREATE POLICY "Users can update their own avatar"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'avatars' 
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END
$$;

-- 5. Policy: Authenticated Deletes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete their own avatar'
    ) THEN
        CREATE POLICY "Users can delete their own avatar"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'avatars' 
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END
$$;