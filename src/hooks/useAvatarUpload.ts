import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useAvatarUpload = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setIsUploading(true);
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return null;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return null;
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile photo updated!');
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile photo removed');
      return true;
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove photo');
      return false;
    }
  };

  return {
    uploadAvatar,
    removeAvatar,
    isUploading,
  };
};
