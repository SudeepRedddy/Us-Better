import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile, Habit, DailyCheckIn, HabitWithStats, UserWithHabits } from '@/types/habits';
import { differenceInDays, parseISO, format, isBefore, isAfter } from 'date-fns';
import { useMemo } from 'react';

// --- Helper Functions (Pure Logic) ---

const calculateStreak = (dates: string[]): { current: number; longest: number } => {
  if (dates.length === 0) return { current: 0, longest: 0 };
  
  // Sort descending (newest first)
  // We use .getTime() for faster numeric comparison than string comparison
  const sortedDates = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  
  // Calculate current streak
  let currentStreak = 0;
  // Check if the most recent check-in is today or yesterday to keep streak alive
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
  // Use the already sorted array, but reverse iteration or resort ascending for this logic
  // Resorted ascending for longest streak calculation
  const ascending = [...sortedDates].reverse();
  
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

const calculateHabitStats = (habit: Habit, habitCheckIns: DailyCheckIn[]): HabitWithStats => {
  const startDate = parseISO(habit.start_date);
  const endDate = parseISO(habit.end_date);
  const today = new Date();
  
  const effectiveEndDate = isBefore(today, endDate) ? today : endDate;
  const effectiveStartDate = isAfter(startDate, today) ? today : startDate;
  
  const totalDays = differenceInDays(effectiveEndDate, effectiveStartDate) + 1;
  const totalCompleted = habitCheckIns.length;
  const completionPercentage = totalDays > 0 ? Math.round((totalCompleted / totalDays) * 100) : 0;
  
  // Optimization: extracting just the date strings for the streak calculator
  const checkInDates = habitCheckIns.map(c => c.check_in_date);
  const { current, longest } = calculateStreak(checkInDates);
  
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

// --- Hook ---

export const useHabits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch Profiles
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
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  // 2. Fetch Habits
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
    staleTime: 1000 * 60 * 1, // Cache for 1 min
  });

  // 3. Fetch Check-ins
  const { data: checkIns = [], isLoading: checkInsLoading } = useQuery({
    queryKey: ['check_ins'],
    queryFn: async () => {
      // OPTIMIZATION: In the future, you can limit this to the current year
      // .gte('check_in_date', `${new Date().getFullYear()}-01-01`)
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*');
      if (error) throw error;
      return data as DailyCheckIn[];
    },
    enabled: !!user,
  });

  // 4. OPTIMIZATION: Group check-ins by Habit ID
  // This turns the O(N*M) search into O(N) lookup.
  const checkInsByHabitId = useMemo(() => {
    const map = new Map<string, DailyCheckIn[]>();
    checkIns.forEach(c => {
      if (!map.has(c.habit_id)) {
        map.set(c.habit_id, []);
      }
      map.get(c.habit_id)!.push(c);
    });
    return map;
  }, [checkIns]);

  // 5. OPTIMIZATION: Memoize the heavy stat calculations
  const habitsWithStats: HabitWithStats[] = useMemo(() => {
    return habits.map(h => {
      const relevantCheckIns = checkInsByHabitId.get(h.id) || [];
      return calculateHabitStats(h, relevantCheckIns);
    });
  }, [habits, checkInsByHabitId]); // Only runs when data changes

  // Mutations (Create/Update/Delete/Toggle)
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
      // Optimistic look-up using our map is faster, but for mutation logic we'll stick to simple check
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

  const myProfile = profiles.find(p => p.user_id === user?.id);
  const friendProfiles = profiles.filter(p => p.user_id !== user?.id);

  // Memoize these getters too
  const getUserWithHabits = useMemo(() => (profile: Profile | undefined): UserWithHabits | null => {
    if (!profile) return null;
    
    const userHabits = habitsWithStats.filter(h => h.user_id === profile.user_id);
    const totalScore = userHabits.reduce((sum, h) => sum + h.totalCompleted, 0);
    const averageCompletion = userHabits.length > 0
      ? Math.round(userHabits.reduce((sum, h) => sum + h.completionPercentage, 0) / userHabits.length)
      : 0;
    
    return { profile, habits: userHabits, totalScore, averageCompletion };
  }, [habitsWithStats]);

  const allUsersWithHabits: UserWithHabits[] = useMemo(() => 
    profiles
      .map(p => getUserWithHabits(p))
      .filter((u): u is UserWithHabits => u !== null),
    [profiles, getUserWithHabits]
  );

  const myData = useMemo(() => getUserWithHabits(myProfile), [getUserWithHabits, myProfile]);

  return {
    profiles,
    habits: habitsWithStats,
    checkIns,
    myProfile,
    friendProfiles,
    myData,
    allUsersWithHabits,
    getUserWithHabits,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleCheckIn,
  };
};