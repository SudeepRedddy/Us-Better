import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * Convert base64 VAPID key to Uint8Array
 * IMPORTANT: must return Uint8Array (not ArrayBuffer) for PWAs
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  /**
   * Fetch VAPID public key from backend
   */
  const fetchVapidPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-vapid-key`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const key =
        typeof data?.vapidPublicKey === 'string'
          ? data.vapidPublicKey.trim()
          : null;

      if (key) setVapidPublicKey(key);
      return key;
    } catch (error) {
      console.error('Error fetching VAPID key:', error);
      return null;
    }
  }, []);

  /**
   * Initial capability checks
   */
  useEffect(() => {
    const init = async () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        await fetchVapidPublicKey();
      }

      setIsLoading(false);
    };

    init();
  }, [fetchVapidPublicKey]);

  /**
   * Check if already subscribed
   */
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          setIsSubscribed(false);
          return;
        }

        const session = await supabase.auth.getSession();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(
            subscription.endpoint
          )}&select=id`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.data.session?.access_token}`,
            },
          }
        );

        const result = await response.json();
        setIsSubscribed(Array.isArray(result) && result.length > 0);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast.error('Push notifications are not supported on this device');
      return false;
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (!isStandalone) {
      toast.error('Please install the app to enable notifications');
      return false;
    }

    if (!navigator.serviceWorker.controller) {
      toast.error('Please reopen the app from the home screen');
      return false;
    }

    const latestVapidKey = await fetchVapidPublicKey();
    if (!latestVapidKey) {
      toast.error('Notification service not ready');
      return false;
    }

    try {
      setIsLoading(true);

      if (Notification.permission === 'denied') {
        toast.error(
          'Notifications are blocked. Enable them in system settings.'
        );
        return false;
      }

      if (Notification.permission !== 'granted') {
        await Notification.requestPermission();
        setPermission(Notification.permission);
      }

      if (Notification.permission !== 'granted') {
        toast.error('Please allow notifications');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(latestVapidKey),
      });

      const keys = subscription.toJSON().keys;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription keys');
      }

      const session = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth_key: keys.auth,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      toast.success('Notifications enabled 🎉');
      return true;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to enable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, fetchVapidPublicKey]);

  /**
   * Unsubscribe
   */
  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const session = await supabase.auth.getSession();

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(
            subscription.endpoint
          )}`,
          {
            method: 'DELETE',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.data.session?.access_token}`,
            },
          }
        );
      }

      setIsSubscribed(false);
      toast.success('Notifications disabled');
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to disable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const toggleSubscription = useCallback(async () => {
    return isSubscribed ? unsubscribe() : subscribe();
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
