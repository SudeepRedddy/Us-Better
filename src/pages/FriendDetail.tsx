import { useParams, useNavigate } from 'react-router-dom';
import { useHabits } from '@/hooks/useHabits';
import { HabitCard } from '@/components/HabitCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Flame, Calendar } from 'lucide-react';

export default function FriendDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { getUserData, habits, isLoading } = useHabits();

  const friendData = userId ? getUserData(userId, true) : null;
  const friendHabits = habits.filter(h => h.user_id === userId && h.is_public);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft font-display">Loading...</div>
      </div>
    );
  }

  if (!friendData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="font-display text-lg mb-4">Friend not found</p>
        <Button onClick={() => navigate('/friend')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary/5 px-4 pt-4 pb-6">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/friend')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          
          <div className="flex items-center gap-4">
            <Avatar 
              type={friendData.profile.avatar_type} 
              size="lg" 
              imageUrl={friendData.profile.avatar_url}
            />
            <div>
              <h1 className="font-display font-bold text-xl">{friendData.profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">{friendHabits.length} public habits</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-card/50 rounded-xl p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
              <div className="font-display font-bold">{friendData.averageCompletion}%</div>
              <div className="text-xs text-muted-foreground">Avg</div>
            </div>
            <div className="bg-card/50 rounded-xl p-3 text-center">
              <Flame className="w-4 h-4 mx-auto mb-1 text-secondary" />
              <div className="font-display font-bold">
                {Math.max(...friendData.habits.map(h => h.currentStreak), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
            <div className="bg-card/50 rounded-xl p-3 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-accent" />
              <div className="font-display font-bold">{friendData.totalScore}</div>
              <div className="text-xs text-muted-foreground">Check-ins</div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        <WeekCalendar habits={friendHabits} />
        
        <h2 className="font-display font-bold text-lg">Their Habits</h2>
        
        <div className="space-y-3">
          {friendHabits.map(habit => (
            <HabitCard 
              key={habit.id} 
              habit={habit} 
              isOwner={false} 
              onToggle={() => {}} 
            />
          ))}
        </div>

        {friendHabits.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No public habits to show</p>
            <p className="text-sm text-muted-foreground mt-1">
              This friend has made all their habits private
            </p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
