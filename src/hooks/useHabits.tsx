import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile, Habit, DailyCheckIn, HabitWithStats, UserWithHabits } from '@/types/habits';
import { differenceInDays, parseISO, format, eachDayOfInterval, isWithinInterval, isBefore, isAfter } from 'date-fns';

const calculateStreak = (checkIns: DailyCheckIn[], startDate: string, endDate: string): { current: number; longest: number } => {
  if (checkIns.length === 0) return { current: 0, longest: 0 };
  
  const sortedDates = checkIns
    .map(c => c.check_in_date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  
  // Calculate current streak
  let currentStreak = 0;
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diff = differenceInDays(prevDate, currDate);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  const ascending = [...sortedDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  for (let i = 1; i < ascending.length; i++) {
    const prevDate = new Date(ascending[i - 1]);
    const currDate = new Date(ascending[i]);
    const diff = differenceInDays(currDate, prevDate);
    if (diff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { current: currentStreak, longest: longestStreak };
};

const calculateHabitStats = (habit: Habit, checkIns: DailyCheckIn[]): HabitWithStats => {
  const startDate = parseISO(habit.start_date);
  const endDate = parseISO(habit.end_date);
  const today = new Date();
  
  // Only count days up to today or end date, whichever is earlier
  const effectiveEndDate = isBefore(today, endDate) ? today : endDate;
  const effectiveStartDate = isAfter(startDate, today) ? today : startDate;
  
  const totalDays = differenceInDays(effectiveEndDate, effectiveStartDate) + 1;
  const habitCheckIns = checkIns.filter(c => c.habit_id === habit.id);
  const totalCompleted = habitCheckIns.length;
  const completionPercentage = totalDays > 0 ? Math.round((totalCompleted / totalDays) * 100) : 0;
  
  const { current, longest } = calculateStreak(habitCheckIns, habit.start_date, habit.end_date);
  
  return {
    ...habit,
    checkIns: habitCheckIns,
    currentStreak: current,
    longestStreak: longest,
    totalCompleted,
    totalDays: Math.max(totalDays, 0),
    completionPercentage: Math.min(completionPercentage, 100),
  };
};

export const useHabits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user,
  });

  const { data: checkIns = [], isLoading: checkInsLoading } = useQuery({
    queryKey: ['check_ins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*');
      if (error) throw error;
      return data as DailyCheckIn[];
    },
    enabled: !!user,
  });

  const createHabit = useMutation({
    mutationFn: async (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('habits')
        .insert({ ...habit, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      const { data, error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  const toggleCheckIn = useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      const existing = checkIns.find(c => c.habit_id === habitId && c.check_in_date === date);
      
      if (existing) {
        const { error } = await supabase.from('daily_check_ins').delete().eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        const { error } = await supabase
          .from('daily_check_ins')
          .insert({ habit_id: habitId, check_in_date: date });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['check_ins'] }),
  });

  const isLoading = profilesLoading || habitsLoading || checkInsLoading;

  const habitsWithStats: HabitWithStats[] = habits.map(h => calculateHabitStats(h, checkIns));

  const myProfile = profiles.find(p => p.user_id === user?.id);
  const friendProfiles = profiles.filter(p => p.user_id !== user?.id);

  const getUserWithHabits = (profile: Profile | undefined): UserWithHabits | null => {
    if (!profile) return null;
    
    const userHabits = habitsWithStats.filter(h => h.user_id === profile.user_id);
    const totalScore = userHabits.reduce((sum, h) => sum + h.totalCompleted, 0);
    const averageCompletion = userHabits.length > 0
      ? Math.round(userHabits.reduce((sum, h) => sum + h.completionPercentage, 0) / userHabits.length)
      : 0;
    
    return { profile, habits: userHabits, totalScore, averageCompletion };
  };

  // All users for leaderboard
  const allUsersWithHabits: UserWithHabits[] = profiles
    .map(p => getUserWithHabits(p))
    .filter((u): u is UserWithHabits => u !== null);

  return {
    profiles,
    habits: habitsWithStats,
    checkIns,
    myProfile,
    friendProfiles,
    myData: getUserWithHabits(myProfile),
    allUsersWithHabits,
    getUserWithHabits,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleCheckIn,
  };
};
