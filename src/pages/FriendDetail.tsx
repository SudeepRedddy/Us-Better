import { useParams, useNavigate } from 'react-router-dom';
import { useHabits } from '@/hooks/useHabits';
import { HabitCard } from '@/components/HabitCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Flame, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FriendDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profiles, habits, getUserWithHabits, isLoading } = useHabits();

  const profile = profiles.find(p => p.user_id === userId);
  const userData = getUserWithHabits(profile);
  const userHabits = habits.filter(h => h.user_id === userId);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-4">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <button onClick={() => navigate('/friend')} className="p-2 -ml-2 rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">User not found</h1>
          </div>
        </header>
        <BottomNav />
      </div>
    );
  }

  const stats = userData ? {
    totalHabits: userData.habits.length,
    totalCheckIns: userData.totalScore,
    bestStreak: Math.max(...userData.habits.map(h => h.longestStreak), 0),
    avgCompletion: userData.averageCompletion,
  } : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary/5 px-4 pt-6 pb-8">
        <div className="max-w-md mx-auto">
          <button 
            onClick={() => navigate('/friend')} 
            className="flex items-center gap-2 text-muted-foreground mb-4 -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <Avatar 
              type={profile.avatar_type} 
              avatarUrl={profile.avatar_url}
              size="xl" 
            />
            <h1 className="font-display font-bold text-2xl mt-4">{profile.display_name}</h1>
          </motion.div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Target, label: 'Habits', value: stats.totalHabits },
              { icon: TrendingUp, label: 'Check-ins', value: stats.totalCheckIns },
              { icon: Flame, label: 'Best Streak', value: stats.bestStreak },
              { icon: Target, label: 'Avg. Completion', value: `${stats.avgCompletion}%` },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-4 shadow-soft border border-border/50"
              >
                <stat.icon className="w-5 h-5 text-primary mb-2" />
                <div className="font-display font-bold text-xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        <WeekCalendar habits={userHabits} />
        
        <div>
          <h2 className="font-display font-bold text-lg mb-3">Their Habits</h2>
          <div className="space-y-3">
            {userHabits.map((habit, i) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <HabitCard habit={habit} isOwner={false} onToggle={() => {}} />
              </motion.div>
            ))}
          </div>
          {userHabits.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">No habits yet</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}