import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { NotificationToggle } from '@/components/NotificationToggle';
import { LogOut, Flame, Target, Calendar } from 'lucide-react';

export default function Profile() {
  const { signOut } = useAuth();
  const { myData, isLoading } = useHabits();

  const stats = myData ? {
    totalHabits: myData.habits.length,
    totalCheckIns: myData.totalScore,
    bestStreak: Math.max(...myData.habits.map(h => h.longestStreak), 0),
    avgCompletion: myData.averageCompletion,
  } : null;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary/5 px-4 pt-12 pb-8">
        <div className="max-w-md mx-auto flex flex-col items-center">
          {myData && <Avatar type={myData.profile.avatar_type} size="xl" />}
          <h1 className="font-display font-bold text-2xl mt-4">{myData?.profile.display_name}</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Target, label: 'Habits', value: stats.totalHabits },
              { icon: Calendar, label: 'Check-ins', value: stats.totalCheckIns },
              { icon: Flame, label: 'Best Streak', value: stats.bestStreak },
              { icon: Target, label: 'Avg. Completion', value: `${stats.avgCompletion}%` },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                <stat.icon className="w-5 h-5 text-primary mb-2" />
                <div className="font-display font-bold text-xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <NotificationToggle />

        <Button variant="outline" className="w-full h-12 rounded-xl gap-2" onClick={signOut}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}
