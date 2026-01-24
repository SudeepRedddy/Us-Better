import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationToggle } from '@/components/NotificationToggle';
import { LogOut, Flame, Target, Calendar, Camera, Copy, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { signOut } = useAuth();
  const { myData, myProfile, isLoading } = useHabits();
  const { inviteCodes, generateInviteCode, useInviteCode } = useFriends();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteInput, setInviteInput] = useState('');

  const stats = myData ? {
    totalHabits: myData.habits.length,
    totalCheckIns: myData.totalScore,
    bestStreak: Math.max(...myData.habits.map(h => h.longestStreak), 0),
    avgCompletion: myData.averageCompletion,
  } : null;

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  const handleShareCode = async (code: string) => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on Habit Tracker!',
        text: `Use my invite code: ${code}`,
      });
    } else {
      handleCopyCode(code);
    }
  };

  const handleJoinWithCode = () => {
    if (inviteInput.trim()) {
      useInviteCode.mutate(inviteInput.trim());
      setInviteInput('');
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft font-display">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary/5 px-4 pt-12 pb-8">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="relative">
            <Avatar 
              type={myProfile?.avatar_type || 'male'} 
              size="xl" 
              imageUrl={myProfile?.avatar_url}
            />
            <button
              onClick={handlePhotoClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
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

        {/* Invite Friends Section */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-4">
          <h3 className="font-display font-semibold">Invite Friends</h3>
          
          {inviteCodes.length > 0 ? (
            <div className="space-y-2">
              {inviteCodes.slice(0, 1).map(code => (
                <div key={code.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
                  <code className="flex-1 font-mono text-lg font-bold tracking-wider">{code.code}</code>
                  <Button variant="ghost" size="icon" onClick={() => handleCopyCode(code.code)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleShareCode(code.code)}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Button 
              onClick={() => generateInviteCode.mutate()} 
              disabled={generateInviteCode.isPending}
              className="w-full"
            >
              {generateInviteCode.isPending ? 'Generating...' : 'Generate Invite Code'}
            </Button>
          )}

          <div className="pt-2 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-2">Have a code? Join a friend:</p>
            <div className="flex gap-2">
              <Input
                value={inviteInput}
                onChange={e => setInviteInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="font-mono uppercase"
                maxLength={6}
              />
              <Button 
                onClick={handleJoinWithCode}
                disabled={!inviteInput.trim() || useInviteCode.isPending}
              >
                Join
              </Button>
            </div>
          </div>
        </div>

        <NotificationToggle />

        <Button variant="outline" className="w-full h-12 rounded-xl gap-2" onClick={signOut}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}
