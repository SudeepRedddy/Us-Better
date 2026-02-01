import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Eye, EyeOff, Bell, BellOff } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Habit } from '@/types/habits';

type ReminderFrequency = 'daily' | 'hourly' | 'custom';

interface HabitFormProps {
  habit?: Habit;
  onSubmit: (data: { 
    title: string; 
    description: string; 
    start_date: string; 
    end_date: string; 
    color: string; 
    is_public: boolean;
    reminder_enabled: boolean;
    reminder_frequency: ReminderFrequency;
    reminder_times: string[];
  }) => void;
  onClose: () => void;
}

const PRESET_TIMES = [
  { label: 'Morning (9 AM)', value: '09:00' },
  { label: 'Noon (12 PM)', value: '12:00' },
  { label: 'Afternoon (3 PM)', value: '15:00' },
  { label: 'Evening (6 PM)', value: '18:00' },
  { label: 'Night (9 PM)', value: '21:00' },
];

export const HabitForm = ({ habit, onSubmit, onClose }: HabitFormProps) => {
  const [title, setTitle] = useState(habit?.title || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [startDate, setStartDate] = useState(habit?.start_date || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(habit?.end_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [color, setColor] = useState(habit?.color || 'sage');
  const [isPublic, setIsPublic] = useState(habit?.is_public ?? true);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminder_enabled ?? false);
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>(habit?.reminder_frequency ?? 'daily');
  const [reminderTimes, setReminderTimes] = useState<string[]>(habit?.reminder_times ?? ['19:00']);

  const colors = [
    { name: 'sage', class: 'bg-sage' },
    { name: 'coral', class: 'bg-coral' },
    { name: 'terracotta', class: 'bg-terracotta' },
  ];

  const handleFrequencyChange = (value: ReminderFrequency) => {
    setReminderFrequency(value);
    if (value === 'daily') {
      setReminderTimes(['19:00']);
    } else if (value === 'hourly') {
      // Every 2 hours from 8 AM to 8 PM
      setReminderTimes(['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']);
    }
  };

  const toggleCustomTime = (time: string) => {
    if (reminderTimes.includes(time)) {
      setReminderTimes(reminderTimes.filter(t => t !== time));
    } else {
      setReminderTimes([...reminderTimes, time].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({ 
        title: title.trim(), 
        description: description.trim(), 
        start_date: startDate, 
        end_date: endDate,
        color,
        is_public: isPublic,
        reminder_enabled: reminderEnabled,
        reminder_frequency: reminderFrequency,
        reminder_times: reminderTimes,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        // UPDATED: Added max-h-[85vh] and overflow-y-auto here
        className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-medium p-6 pb-safe-bottom max-h-[85vh] overflow-y-auto scrollbar-hide"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-card z-10 pb-2">
          <h2 className="font-display text-xl font-bold">
            {habit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button 
            onClick={onClose}
            className="tap-target p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Habit Name
            </Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Morning meditation"
              className="mt-1.5 h-12 rounded-xl"
              autoFocus
            />
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's your goal?"
              className="mt-1.5 rounded-xl resize-none"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Start
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> End
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex gap-3 mt-2">
              {colors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-10 h-10 rounded-full ${c.class} transition-all ${
                    color === c.name ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Eye className="w-5 h-5 text-primary" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">Visible to Friends</Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Friends can see this habit' : 'Only you can see this habit'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              aria-label="Toggle habit visibility"
            />
          </div>

          {/* Reminder Settings */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {reminderEnabled ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-sm font-medium">Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    {reminderEnabled ? 'Get notified for this habit' : 'No reminders'}
                  </p>
                </div>
              </div>
              <Switch
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
                aria-label="Toggle reminders"
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <Label className="text-sm font-medium">Frequency</Label>
                <RadioGroup
                  value={reminderFrequency}
                  onValueChange={(v) => handleFrequencyChange(v as ReminderFrequency)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="text-sm cursor-pointer">
                      Once a day (7 PM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="hourly" id="hourly" />
                    <Label htmlFor="hourly" className="text-sm cursor-pointer">
                      Every 2 hours (8 AM - 8 PM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="text-sm cursor-pointer">
                      Custom times
                    </Label>
                  </div>
                </RadioGroup>

                {reminderFrequency === 'custom' && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground">Select times:</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TIMES.map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleCustomTime(value)}
                          className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                            reminderTimes.includes(value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl font-semibold text-base"
            disabled={!title.trim()}
          >
            {habit ? 'Save Changes' : 'Create Habit'}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
};