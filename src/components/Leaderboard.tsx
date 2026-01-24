import { motion } from 'framer-motion';
import { Trophy, Flame, TrendingUp } from 'lucide-react';
import { Avatar } from './Avatar';
import { UserWithHabits } from '@/types/habits';

interface LeaderboardProps {
  users: (UserWithHabits | null)[];
  currentUserId?: string;
}

export const Leaderboard = ({ users, currentUserId }: LeaderboardProps) => {
  const validUsers = users.filter((u): u is UserWithHabits => u !== null);
  
  // Sort by average completion, then by total score
  const sorted = [...validUsers].sort((a, b) => {
    if (b.averageCompletion !== a.averageCompletion) {
      return b.averageCompletion - a.averageCompletion;
    }
    return b.totalScore - a.totalScore;
  });

  const getLeaderStats = (user: UserWithHabits) => {
    const totalStreaks = user.habits.reduce((sum, h) => sum + h.currentStreak, 0);
    const longestStreak = Math.max(...user.habits.map(h => h.longestStreak), 0);
    return { totalStreaks, longestStreak };
  };

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-display">No competition data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((user, index) => {
        const isWinner = index === 0 && sorted.length > 1;
        const isCurrentUser = user.profile.user_id === currentUserId;
        const stats = getLeaderStats(user);
        
        return (
          <motion.div
            key={user.profile.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-card rounded-2xl p-4 shadow-soft border ${
              isWinner ? 'border-accent ring-2 ring-accent/20' : 'border-border/50'
            } ${isCurrentUser ? 'bg-primary/5' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`absolute -left-2 -top-2 w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                  index === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <Avatar 
                  type={user.profile.avatar_type} 
                  size="lg" 
                  isWinner={isWinner}
                  imageUrl={user.profile.avatar_url}
                />
              </div>
              
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg">
                  {user.profile.display_name}
                  {isCurrentUser && <span className="text-muted-foreground font-normal text-sm ml-2">(You)</span>}
                </h3>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="p-1 rounded-md bg-accent/10">
                      <TrendingUp className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-semibold">{user.averageCompletion}%</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="p-1 rounded-md bg-secondary/30">
                      <Flame className="w-4 h-4 text-secondary" />
                    </div>
                    <span className="font-semibold">{stats.longestStreak}</span>
                    <span className="text-muted-foreground">best</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-display font-bold text-primary">
                  {user.totalScore}
                </div>
                <div className="text-xs text-muted-foreground">check-ins</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
