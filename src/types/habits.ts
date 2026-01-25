export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_type: 'male' | 'female';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckIn {
  id: string;
  habit_id: string;
  check_in_date: string;
  created_at: string;
}

export interface HabitWithStats extends Habit {
  checkIns: DailyCheckIn[];
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalDays: number;
  completionPercentage: number;
}

export interface UserWithHabits {
  profile: Profile;
  habits: HabitWithStats[];
  totalScore: number;
  averageCompletion: number;
}
