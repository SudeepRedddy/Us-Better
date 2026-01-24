import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { HabitCard } from '@/components/HabitCard';
import { HabitForm } from '@/components/HabitForm';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { Habit } from '@/types/habits';

export default function Index() {
  const { user } = useAuth();
  const { myData, habits, toggleCheckIn, createHabit, updateHabit, deleteHabit, isLoading } = useHabits();
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const myHabits = habits.filter(h => h.user_id === user?.id);

  const handleSubmit = async (data: any) => {
    if (editingHabit) {
      await updateHabit.mutateAsync({ id: editingHabit.id, ...data });
    } else {
      await createHabit.mutateAsync(data);
    }
    setShowForm(false);
    setEditingHabit(null);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse-soft font-display text-xl">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            {myData && <Avatar type={myData.profile.avatar_type} size="sm" imageUrl={myData.profile.avatar_url} />}
            <div>
              <h1 className="font-display font-bold text-lg">Hi, {myData?.profile.display_name || 'Friend'}!</h1>
              <p className="text-sm text-muted-foreground">{myHabits.length} habits tracked</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        <WeekCalendar habits={myHabits} onToggle={(habitId, date) => toggleCheckIn.mutate({ habitId, date })} isOwner />

        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Your Habits</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(true)}
            className="tap-target p-2 rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {myHabits.map(habit => (
              <HabitCard key={habit.id} habit={habit} isOwner
                onToggle={date => toggleCheckIn.mutate({ habitId: habit.id, date })}
                onEdit={() => { setEditingHabit(habit); setShowForm(true); }}
                onDelete={() => deleteHabit.mutate(habit.id)} />
            ))}
          </AnimatePresence>
        </div>

        {myHabits.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-5xl mb-4">🌱</p>
            <p className="font-display text-lg text-muted-foreground">Start your first habit!</p>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {showForm && <HabitForm habit={editingHabit || undefined} onSubmit={handleSubmit} onClose={() => { setShowForm(false); setEditingHabit(null); }} />}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
