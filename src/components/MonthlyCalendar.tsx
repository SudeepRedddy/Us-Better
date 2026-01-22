import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  isBefore,
  isAfter
} from 'date-fns';
import { HabitWithStats } from '@/types/habits';
import { Button } from '@/components/ui/button';

interface MonthlyCalendarProps {
  habit: HabitWithStats;
  onToggle?: (date: string) => void;
  isOwner?: boolean;
}

export const MonthlyCalendar = ({ habit, onToggle, isOwner = false }: MonthlyCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const startDate = parseISO(habit.start_date);
  const endDate = parseISO(habit.end_date);
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getDayStatus = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isChecked = habit.checkIns.some(c => c.check_in_date === dateStr);
    const isInRange = isWithinInterval(day, { start: startDate, end: endDate });
    const isPast = isBefore(day, today) && !isSameDay(day, today);
    const isFuture = isAfter(day, today);
    const isClickable = isOwner && isInRange && isSameDay(day, today);
    
    return { isChecked, isInRange, isPast, isFuture, isClickable, dateStr };
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToPreviousMonth}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          {!isSameMonth(currentMonth, today) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="text-xs h-7"
            >
              Today
            </Button>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToNextMonth}
          className="h-9 w-9"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const { isChecked, isInRange, isPast, isFuture, isClickable, dateStr } = getDayStatus(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          
          return (
            <motion.button
              key={day.toISOString()}
              onClick={() => isClickable && onToggle?.(dateStr)}
              disabled={!isClickable}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-sm relative
                transition-all duration-200
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${!isInRange && isCurrentMonth ? 'bg-muted/30' : ''}
                ${isInRange && isChecked ? 'bg-primary text-primary-foreground' : ''}
                ${isInRange && !isChecked && isPast ? 'bg-destructive/20 text-destructive-foreground' : ''}
                ${isInRange && !isChecked && !isPast && !isFuture ? 'bg-muted hover:bg-primary/20' : ''}
                ${isInRange && isFuture && !isChecked ? 'bg-muted/50' : ''}
                ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : 'cursor-default'}
                ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
              `}
              whileTap={isClickable ? { scale: 0.9 } : {}}
            >
              <span className={isToday ? 'font-bold' : ''}>
                {format(day, 'd')}
              </span>
              {isChecked && isCurrentMonth && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive/20" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/50" />
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/30" />
          <span>Outside Range</span>
        </div>
      </div>
    </div>
  );
};
