import { useState } from 'react';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function NotificationToggle() {
  const { isSupported, isSubscribed, isLoading, permission, toggleSubscription } = usePushNotifications();
  const [isTesting, setIsTesting] = useState(false);

  const sendTestNotification = async () => {
    if (!isSubscribed) {
      toast.error('Please enable notifications first');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-habit-reminders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ test: true }),
        }
      );
      
      if (response.ok) {
        toast.success('Test notification sent! Check your notifications.');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

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
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-3">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <div className="font-display font-semibold">Daily Reminders</div>
          <div className="text-sm text-muted-foreground">
            Get notified at 7 PM IST if you have incomplete habits
          </div>
          {permission === 'denied' && (
            <div className="text-xs text-destructive mt-1">
              Notifications are blocked. Please enable them in your browser settings.
            </div>
          )}
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={isSubscribed}
            onCheckedChange={toggleSubscription}
            aria-label="Toggle notifications"
            disabled={permission === 'denied'}
          />
        )}
      </div>
      
      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={sendTestNotification}
          disabled={isTesting}
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send Test Notification
        </Button>
      )}
    </div>
  );
}