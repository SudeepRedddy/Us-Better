import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { HabitWithStats } from '@/types/habits';
import { Check } from 'lucide-react';

interface WeekCalendarProps {
  habits: HabitWithStats[];
  onToggle?: (habitId: string, date: string) => void;
  isOwner?: boolean;
}

export const WeekCalendar = ({ habits, onToggle, isOwner = false }: WeekCalendarProps) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map(day => {
          const isToday = isSameDay(day, today);
          return (
            <div 
              key={day.toISOString()} 
              className={`text-center ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}
            >
              <div className="text-xs uppercase">{format(day, 'EEE')}</div>
              <div className={`text-sm mt-0.5 ${
                isToday ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground mx-auto flex items-center justify-center' : ''
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Habit Rows */}
      <div className="space-y-2">
        {habits.slice(0, 5).map(habit => {
          const startDate = parseISO(habit.start_date);
          const endDate = parseISO(habit.end_date);
          
          return (
            <div key={habit.id} className="flex items-center gap-2">
              <div className="w-20 truncate text-sm font-medium text-foreground">
                {habit.title}
              </div>
              <div className="grid grid-cols-7 gap-2 flex-1">
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isChecked = habit.checkIns.some(c => c.check_in_date === dateStr);
                  const isInRange = isWithinInterval(day, { start: startDate, end: endDate });
                  const isClickable = isOwner && isInRange && isSameDay(day, today);
                  
                  return (
                    <motion.button
                      key={dateStr}
                      disabled={!isClickable}
                      onClick={() => isClickable && onToggle?.(habit.id, dateStr)}
                      className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                        !isInRange 
                          ? 'bg-muted/30 cursor-not-allowed' 
                          : isChecked 
                            ? 'bg-primary' 
                            : isClickable
                              ? 'bg-muted hover:bg-primary/20 cursor-pointer'
                              : 'bg-muted'
                      }`}
                      whileTap={isClickable ? { scale: 0.85 } : {}}
                    >
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', bounce: 0.5 }}
                        >
                          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {habits.length === 0 && (
        <p className="text-center py-4 text-muted-foreground text-sm">
          No habits to display
        </p>
      )}
    </div>
  );
};
