import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { HabitCard } from '@/components/HabitCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';

export default function Friend() {
  const { user } = useAuth();
  const { friendData, habits, isLoading } = useHabits();
  const friendHabits = habits.filter(h => h.user_id !== user?.id);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {friendData ? <Avatar type={friendData.profile.avatar_type} size="md" /> : <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />}
          <div>
            <h1 className="font-display font-bold text-lg">{friendData?.profile.display_name || 'Waiting for friend...'}</h1>
            <p className="text-sm text-muted-foreground">{friendHabits.length} habits</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {friendData ? (
          <>
            <WeekCalendar habits={friendHabits} />
            <h2 className="font-display font-bold text-lg">Their Habits</h2>
            <div className="space-y-3">
              {friendHabits.map(habit => <HabitCard key={habit.id} habit={habit} isOwner={false} onToggle={() => {}} />)}
            </div>
            {friendHabits.length === 0 && <p className="text-center py-12 text-muted-foreground">No habits yet</p>}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">👋</p>
            <p className="font-display text-muted-foreground">Your friend hasn't joined yet!</p>
            <p className="text-sm text-muted-foreground mt-2">Share this app with them</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
