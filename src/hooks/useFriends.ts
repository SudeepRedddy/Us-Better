import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Friendship, InviteCode, Profile, FriendWithProfile } from '@/types/habits';
import { toast } from 'sonner';

export const useFriends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all friendships where user is involved
  const { data: friendships = [], isLoading: friendshipsLoading } = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq('status', 'accepted');
      if (error) throw error;
      return data as Friendship[];
    },
    enabled: !!user,
  });

  // Fetch pending friend requests received
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
      return data as Friendship[];
    },
    enabled: !!user,
  });

  // Fetch all profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

  // Fetch user's invite codes
  const { data: inviteCodes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['invite-codes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('user_id', user!.id)
        .is('used_by', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InviteCode[];
    },
    enabled: !!user,
  });

  // Generate invite code
  const generateInviteCode = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({ user_id: user!.id, code })
        .select()
        .single();
      if (error) throw error;
      return data as InviteCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast.success('Invite code generated!');
    },
    onError: () => {
      toast.error('Failed to generate invite code');
    },
  });

  // Use invite code (join as friend)
  const useInviteCode = useMutation({
    mutationFn: async (code: string) => {
      // Find the invite code
      const { data: inviteData, error: findError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .is('used_by', null)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (findError || !inviteData) {
        throw new Error('Invalid or expired invite code');
      }

      if (inviteData.user_id === user!.id) {
        throw new Error('You cannot use your own invite code');
      }

      // Check if already friends
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user!.id},friend_id.eq.${inviteData.user_id}),and(user_id.eq.${inviteData.user_id},friend_id.eq.${user!.id})`)
        .single();

      if (existing) {
        throw new Error('You are already friends with this user');
      }

      // Create friendship (auto-accepted since invite-based)
      const { error: friendError } = await supabase
        .from('friendships')
        .insert({ 
          user_id: inviteData.user_id, 
          friend_id: user!.id, 
          status: 'accepted' 
        });
      
      if (friendError) throw friendError;

      // Mark invite as used
      await supabase
        .from('invite_codes')
        .update({ used_by: user!.id, used_at: new Date().toISOString() })
        .eq('id', inviteData.id);

      return inviteData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success('Friend added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Accept friend request
  const acceptRequest = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      toast.success('Friend request accepted!');
    },
  });

  // Remove friend
  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success('Friend removed');
    },
  });

  // Get friend IDs from friendships
  const friendIds = friendships.map(f => 
    f.user_id === user?.id ? f.friend_id : f.user_id
  );

  // Map friends with their profiles
  const friends: FriendWithProfile[] = friendships.map(f => {
    const friendUserId = f.user_id === user?.id ? f.friend_id : f.user_id;
    const profile = profiles.find(p => p.user_id === friendUserId);
    return {
      friendship: f,
      profile: profile!,
    };
  }).filter(f => f.profile);

  // Map pending requests with profiles
  const pendingWithProfiles = pendingRequests.map(f => {
    const profile = profiles.find(p => p.user_id === f.user_id);
    return { friendship: f, profile: profile! };
  }).filter(f => f.profile);

  return {
    friends,
    friendIds,
    pendingRequests: pendingWithProfiles,
    inviteCodes,
    isLoading: friendshipsLoading || profilesLoading || pendingLoading || codesLoading,
    generateInviteCode,
    useInviteCode,
    acceptRequest,
    removeFriend,
  };
};
