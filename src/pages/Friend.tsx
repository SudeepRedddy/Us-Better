import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { ChevronRight, Users, Flame, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Friend() {
  const { user } = useAuth();
  const { friendProfiles, getUserWithHabits, isLoading } = useHabits();
  const navigate = useNavigate();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-6">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="font-display font-bold text-xl">Friends</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-3">
        {friendProfiles.length > 0 ? (
          friendProfiles.map((profile, index) => {
            const userData = getUserWithHabits(profile);
            const bestStreak = userData ? Math.max(...userData.habits.map(h => h.longestStreak), 0) : 0;
            
            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/friend/${profile.user_id}`)}
                className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <Avatar 
                  type={profile.avatar_type} 
                  avatarUrl={profile.avatar_url}
                  size="lg" 
                />
                
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg">{profile.display_name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>{userData?.habits.length || 0} habits</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Flame className="w-4 h-4" />
                      <span>{bestStreak} best</span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">👋</p>
            <p className="font-display text-muted-foreground">No friends yet!</p>
            <p className="text-sm text-muted-foreground mt-2">Invite someone using your invite code</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}