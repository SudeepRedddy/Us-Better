import { motion, AnimatePresence } from 'framer-motion';
import { Check, Flame, Calendar, MoreVertical, Trash2, Edit3, ChevronRight, EyeOff } from 'lucide-react';
import { HabitWithStats } from '@/types/habits';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

interface HabitCardProps {
  habit: HabitWithStats;
  isOwner: boolean;
  onToggle: (date: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const HabitCard = ({ habit, isOwner, onToggle, onEdit, onDelete }: HabitCardProps) => {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const isCheckedToday = habit.checkIns.some(c => c.check_in_date === today);
  
  const startDate = parseISO(habit.start_date);
  const endDate = parseISO(habit.end_date);
  const isActiveToday = isWithinInterval(new Date(), { start: startDate, end: endDate });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwner && isActiveToday) {
      onToggle(today);
    }
  };

  const handleCardClick = () => {
    navigate(`/habit/${habit.id}`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={handleCardClick}
      className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {isOwner && isActiveToday ? (
            <motion.button
              onClick={handleToggle}
              className={`tap-target w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isCheckedToday
                  ? 'bg-primary shadow-glow'
                  : 'bg-muted border-2 border-dashed border-primary/30 hover:border-primary/60'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {isCheckedToday && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <Check className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ) : (
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isCheckedToday ? 'bg-primary/80' : 'bg-muted'
            }`}>
              {isCheckedToday && <Check className="w-6 h-6 text-primary-foreground" strokeWidth={3} />}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground truncate">
                {habit.title}
              </h3>
              {!habit.is_public && isOwner && (
                <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-accent" />
                {habit.currentStreak}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>{habit.completionPercentage}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={handleMenuClick}
                  className="tap-target p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="gap-2">
                  <Edit3 className="w-4 h-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
        </div>
      </div>
      
      <div className="mt-4">
        <Progress value={habit.completionPercentage} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{habit.totalCompleted} / {habit.totalDays} days</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(endDate, 'MMM d')}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
