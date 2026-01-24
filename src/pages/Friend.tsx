import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, ChevronRight, TrendingUp, UserMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Friend() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserData, isLoading: habitsLoading } = useHabits();
  const { friends, pendingRequests, isLoading: friendsLoading, acceptRequest, removeFriend } = useFriends();
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null);

  const isLoading = habitsLoading || friendsLoading;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-6">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="font-display font-bold text-xl">Friends</h1>
          <span className="ml-auto text-sm text-muted-foreground">{friends.length} friends</span>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Friend Requests ({pendingRequests.length})
            </h2>
            {pendingRequests.map(({ friendship, profile }) => (
              <motion.div
                key={friendship.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-accent/10 rounded-2xl p-4 border border-accent/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar type={profile.avatar_type} size="md" imageUrl={profile.avatar_url} />
                  <div className="flex-1">
                    <h3 className="font-display font-semibold">{profile.display_name}</h3>
                    <p className="text-sm text-muted-foreground">Wants to be friends</p>
                  </div>
                  <Button size="sm" onClick={() => acceptRequest.mutate(friendship.id)}>
                    <UserPlus className="w-4 h-4 mr-1" /> Accept
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Friends List */}
        {friends.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Your Friends
            </h2>
            <AnimatePresence>
              {friends.map(({ friendship, profile }, index) => {
                const friendData = getUserData(profile.user_id, true);
                return (
                  <motion.div
                    key={friendship.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 cursor-pointer hover:bg-card/80 transition-colors group"
                    onClick={() => navigate(`/friend/${profile.user_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar type={profile.avatar_type} size="md" imageUrl={profile.avatar_url} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold truncate">{profile.display_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>{friendData?.averageCompletion ?? 0}% avg</span>
                          <span>•</span>
                          <span>{friendData?.habits.length ?? 0} habits</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFriendToRemove(friendship.id);
                        }}
                      >
                        <UserMinus className="w-4 h-4 text-destructive" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-display font-semibold text-lg mb-2">No friends yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate an invite code in your Profile to add friends!
            </p>
            <Button onClick={() => navigate('/profile')}>
              Go to Profile
            </Button>
          </div>
        )}
      </main>

      {/* Remove Friend Dialog */}
      <AlertDialog open={!!friendToRemove} onOpenChange={() => setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this friend? You can always add them back with a new invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (friendToRemove) {
                  removeFriend.mutate(friendToRemove);
                  setFriendToRemove(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
