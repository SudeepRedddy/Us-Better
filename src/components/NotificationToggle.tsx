import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationToggle() {
  const { isSupported, isSubscribed, isLoading, toggleSubscription } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-display font-semibold">Notifications</div>
            <div className="text-sm text-muted-foreground">
              Not supported on this device. Try installing the app to your home screen.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <div className="font-display font-semibold">Daily Reminders</div>
          <div className="text-sm text-muted-foreground">
            Get notified at 7 PM if you have incomplete habits
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={isSubscribed}
            onCheckedChange={toggleSubscription}
            aria-label="Toggle notifications"
          />
        )}
      </div>
    </div>
  );
}