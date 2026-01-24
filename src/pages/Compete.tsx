import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { Leaderboard } from '@/components/Leaderboard';
import { BottomNav } from '@/components/BottomNav';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Compete() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myData, getAllUsersData, isLoading: habitsLoading } = useHabits();
  const { friendIds, isLoading: friendsLoading } = useFriends();

  const isLoading = habitsLoading || friendsLoading;

  // Get all friends' data for leaderboard
  const friendsData = getAllUsersData(friendIds);
  
  // Combine current user + friends for leaderboard
  const allUsers = myData ? [myData, ...friendsData] : friendsData;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft font-display">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-6">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Trophy className="w-6 h-6 text-accent" />
          <h1 className="font-display font-bold text-xl">Leaderboard</h1>
          <span className="ml-auto text-sm text-muted-foreground">
            {allUsers.length} {allUsers.length === 1 ? 'person' : 'people'}
          </span>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        {allUsers.length > 1 ? (
          <Leaderboard users={allUsers} currentUserId={user?.id} />
        ) : (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-display font-semibold text-lg mb-2">No competition yet</h3>
            <p className="text-muted-foreground mb-4">
              Add friends to start competing!
            </p>
            <Button onClick={() => navigate('/profile')}>
              Invite Friends
            </Button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
