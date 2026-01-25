import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  const fetchVapidPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      
      if (error) throw error;
      
      const key = typeof data?.vapidPublicKey === 'string' ? data.vapidPublicKey.trim() : null;
      if (key) setVapidPublicKey(key);
      return key;
    } catch (error) {
      console.error('Error fetching VAPID key:', error);
      return null;
    }
  }, []);

  // Check if push notifications are supported and fetch VAPID key
  useEffect(() => {
    const init = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        await fetchVapidPublicKey();
      }
    };
    
    init();
  }, [fetchVapidPublicKey]);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Check if subscription exists in database using Supabase client
          const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();

          if (error) throw error;
          setIsSubscribed(!!data);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast.error('Push notifications are not available on this device');
      return false;
    }

    // Always fetch latest VAPID key right before subscribing
    const latestVapidKey = await fetchVapidPublicKey();
    if (!latestVapidKey) {
      toast.error('Notification service is not ready. Please try again.');
      return false;
    }

    try {
      setIsLoading(true);

      const currentPermission = Notification.permission;
      if (currentPermission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
        return false;
      }

      let permissionResult: NotificationPermission = currentPermission;
      if (currentPermission === 'default') {
        permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
      }
      
      if (permissionResult !== 'granted') {
        toast.error('Please allow notifications to receive reminders');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(latestVapidKey),
      });

      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Save to database using Supabase client
      // Using 'any' cast to bypass potential strict typing issues if types aren't updated
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
        } as any, {
          onConflict: 'user_id, endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Notifications enabled! You\'ll get reminders at 7 PM IST.');
      return true;

    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      if (error.message?.includes('permission')) {
        toast.error('Please allow notifications in your browser settings');
      } else {
        toast.error('Failed to enable notifications: ' + (error.message || 'Unknown error'));
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, fetchVapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database using Supabase client
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }

      setIsSubscribed(false);
      toast.success('Notifications disabled');
      return true;

    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    toggleSubscription,
  };
};