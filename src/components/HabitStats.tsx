import { motion } from 'framer-motion';
import { Flame, Target, TrendingUp, Calendar, Award, BarChart3 } from 'lucide-react';
import { HabitWithStats } from '@/types/habits';
import { format, parseISO, differenceInDays, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface HabitStatsProps {
  habit: HabitWithStats;
}

export const HabitStats = ({ habit }: HabitStatsProps) => {
  const startDate = parseISO(habit.start_date);
  const endDate = parseISO(habit.end_date);
  const today = new Date();
  
  const totalDuration = differenceInDays(endDate, startDate) + 1;
  const daysElapsed = Math.max(0, Math.min(differenceInDays(today, startDate) + 1, totalDuration));
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));
  
  // Calculate weekly data for mini chart
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
  const weeklyData = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekCheckIns = habit.checkIns.filter(c => {
      const checkDate = parseISO(c.check_in_date);
      return isWithinInterval(checkDate, { start: weekStart, end: weekEnd });
    });
    return {
      week: format(weekStart, 'MMM d'),
      count: weekCheckIns.length,
      max: 7
    };
  });

  const stats = [
    {
      icon: Flame,
      label: 'Current Streak',
      value: habit.currentStreak,
      suffix: 'days',
      color: 'text-accent'
    },
    {
      icon: Award,
      label: 'Longest Streak',
      value: habit.longestStreak,
      suffix: 'days',
      color: 'text-primary'
    },
    {
      icon: Target,
      label: 'Completion Rate',
      value: habit.completionPercentage,
      suffix: '%',
      color: 'text-secondary-foreground'
    },
    {
      icon: TrendingUp,
      label: 'Total Check-ins',
      value: habit.totalCompleted,
      suffix: `/ ${habit.totalDays}`,
      color: 'text-muted-foreground'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card rounded-2xl p-4 shadow-soft border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="font-display font-bold text-2xl text-foreground">
              {stat.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {stat.suffix}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl p-4 shadow-soft border border-border/50"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Challenge Timeline</span>
        </div>
        
        <div className="space-y-3">
          <Progress value={(daysElapsed / totalDuration) * 100} className="h-3" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="text-left">
              <div className="font-medium text-foreground">{format(startDate, 'MMM d')}</div>
              <div>Start</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">{daysElapsed} / {totalDuration}</div>
              <div>Days Elapsed</div>
            </div>
            <div className="text-right">
              <div className="font-medium text-foreground">{format(endDate, 'MMM d')}</div>
              <div>{daysRemaining} days left</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weekly Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-2xl p-4 shadow-soft border border-border/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Weekly Performance</span>
        </div>
        
        <div className="flex items-end justify-between gap-1 h-24">
          {weeklyData.slice(-8).map((week, index) => {
            const height = (week.count / week.max) * 100;
            return (
              <div key={week.week} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 5)}%` }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.3 }}
                  className={`w-full rounded-t-sm ${
                    week.count === 0 
                      ? 'bg-muted/50' 
                      : week.count >= 5 
                        ? 'bg-primary' 
                        : 'bg-primary/60'
                  }`}
                  style={{ minHeight: '4px' }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {index === 0 || index === weeklyData.slice(-8).length - 1 ? week.week.split(' ')[0] : ''}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Weeks in challenge</span>
          <span>{weeklyData.length} total</span>
        </div>
      </motion.div>
    </div>
  );
};
