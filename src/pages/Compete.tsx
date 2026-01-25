import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Leaderboard } from '@/components/Leaderboard';
import { BottomNav } from '@/components/BottomNav';
import { Trophy } from 'lucide-react';

export default function Compete() {
  const { user } = useAuth();
  const { allUsersWithHabits, isLoading } = useHabits();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-6">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Trophy className="w-6 h-6 text-accent" />
          <h1 className="font-display font-bold text-xl">Competition</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        <Leaderboard users={allUsersWithHabits} currentUserId={user?.id} />
      </main>
      <BottomNav />
    </div>
  );
}
