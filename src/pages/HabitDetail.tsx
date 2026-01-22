import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Trash2, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { MonthlyCalendar } from '@/components/MonthlyCalendar';
import { HabitStats } from '@/components/HabitStats';
import { HabitForm } from '@/components/HabitForm';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { format, parseISO } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function HabitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { habits, toggleCheckIn, updateHabit, deleteHabit, isLoading } = useHabits();
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const habit = habits.find(h => h.id === id);
  const isOwner = habit?.user_id === user?.id;

  const handleSubmit = async (data: any) => {
    if (habit) {
      await updateHabit.mutateAsync({ id: habit.id, ...data });
    }
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (habit) {
      await deleteHabit.mutateAsync(habit.id);
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-5xl mb-4">🔍</p>
        <p className="font-display text-lg text-muted-foreground mb-4">Habit not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-lg">{habit.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(habit.start_date), 'MMM d')} - {format(parseISO(habit.end_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          
          {isOwner && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowForm(true)}
                className="h-9 w-9"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-9 w-9 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {habit.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-soft border border-border/50"
          >
            <p className="text-sm text-muted-foreground">{habit.description}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-display font-bold text-lg mb-3">Statistics</h2>
          <HabitStats habit={habit} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display font-bold text-lg mb-3">Monthly Calendar</h2>
          <MonthlyCalendar
            habit={habit}
            onToggle={date => toggleCheckIn.mutate({ habitId: habit.id, date })}
            isOwner={isOwner}
          />
        </motion.div>
      </main>

      {/* Edit Form */}
      <AnimatePresence>
        {showForm && (
          <HabitForm
            habit={habit}
            onSubmit={handleSubmit}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{habit.title}" and all its check-ins. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
