import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { supabase } from '@/lib/supabase';
import { isOrderVisibleInAdmin } from '@wewala/shared';
import { useAdminAuth } from './AdminAuthContext';

export interface OrderNotification {
  id: string;
  orderId: string;
  title: string;
  message: string;
  amount: number;
  timestamp: string;
  isRead: boolean;
  type?: 'new_order' | 'paid' | 'status_update';
}

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface NotificationContextValue {
  notifications: OrderNotification[];
  unreadCount: number;
  connectionStatus: RealtimeStatus;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  testAlert: () => void;
  reconnect: () => void;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Synthesizes a crisp, pleasant two-tone store alert chime using HTML5 Web Audio API.
 * Requires zero external audio files.
 */
function playAudioChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio chime warning:', e);
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAdminAuth();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeStatus>('connecting');
  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    return localStorage.getItem('wewala_admin_muted') === 'true';
  });

  const processedOrderIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem('wewala_admin_muted', String(muted));
  };

  // Request system notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }, []);

  // Native desktop notification trigger
  const triggerDesktopNotification = useCallback(
    (order: any, customTitle?: string) => {
      // 1. Play audible chime if not muted
      if (!isMuted) {
        playAudioChime();
      }

      // 2. Display desktop system notification
      const title =
        customTitle || `🚨 New Store Order #${order.id?.slice(0, 8).toUpperCase() || ''}`;
      const amountStr = `Rs. ${Number(order.total || 0).toLocaleString()}`;
      const customer = order.shipping_address?.recipient_name || 'Customer';
      const body = `${amountStr} • ${order.payment_method?.toUpperCase()} • Customer: ${customer}`;

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            tag: order.id,
          });
        } catch (e) {
          console.warn('Native notification display error:', e);
        }
      }
    },
    [isMuted]
  );

  // Helper to add new notification
  const addNotification = useCallback(
    (
      order: any,
      type: 'new_order' | 'paid' | 'status_update' = 'new_order',
      customTitle?: string,
      customMsg?: string
    ) => {
      // If card payment has not completed, do NOT alert or show in admin
      if (!isOrderVisibleInAdmin(order)) {
        return;
      }

      const orderId = order.id;
      const key = `${orderId}-${type}-${order.status}-${order.payment_status}`;
      if (processedOrderIds.current.has(key)) return;
      processedOrderIds.current.add(key);

      const title =
        customTitle ||
        (type === 'paid'
          ? `💳 Order #${orderId.slice(0, 8).toUpperCase()} Paid`
          : `🚨 New Order #${orderId.slice(0, 8).toUpperCase()}`);

      const message =
        customMsg ||
        `Order for Rs. ${Number(order.total || 0).toLocaleString()} via ${(
          order.payment_method || 'card'
        ).toUpperCase()}`;

      const notifItem: OrderNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderId,
        title,
        message,
        amount: Number(order.total || 0),
        timestamp: new Date().toISOString(),
        isRead: false,
        type,
      };

      setNotifications((prev) => [notifItem, ...prev.slice(0, 49)]);
      triggerDesktopNotification(order, title);
    },
    [triggerDesktopNotification]
  );

  // Initial load of latest orders to populate notifications
  useEffect(() => {
    if (!user) return;

    async function loadRecentOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, total, status, payment_method, payment_status, created_at, shipping_address')
          .order('created_at', { ascending: false })
          .limit(25);

        if (!error && data) {
          const visibleOrders = data.filter(isOrderVisibleInAdmin).slice(0, 6);
          const initialItems: OrderNotification[] = visibleOrders.map((o) => {
            const key = `${o.id}-new_order-${o.status}-${o.payment_status}`;
            processedOrderIds.current.add(key);
            return {
              id: `notif-init-${o.id}`,
              orderId: o.id,
              title: `Order #${o.id.slice(0, 8).toUpperCase()}`,
              message: `Rs. ${Number(o.total || 0).toLocaleString()} • ${o.status.toUpperCase()} (${(o.payment_method || 'cod').toUpperCase()})`,
              amount: Number(o.total || 0),
              timestamp: o.created_at,
              isRead: true, // Marked as read initially
              type: 'new_order',
            };
          });
          setNotifications(initialItems);
        }
      } catch (err) {
        console.warn('Initial orders load error:', err);
      }
    }

    loadRecentOrders();
  }, [user]);

  // Main Realtime Connection Function
  const setupRealtimeChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set auth token on Realtime client if session is present
    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    setConnectionStatus('connecting');

    const channelName = `admin-orders-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new;
          // Only alert if the order is visible (COD or already completed card payment)
          if (!isOrderVisibleInAdmin(newOrder)) {
            return;
          }
          addNotification(newOrder, 'new_order');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new;
          const old = payload.old;

          // If payment was just marked as paid (e.g. card order transitioned from pending to paid)
          if (updated.payment_status === 'paid' && old?.payment_status !== 'paid') {
            addNotification(
              updated,
              'paid',
              `💳 Payment Received #${updated.id.slice(0, 8).toUpperCase()}`,
              `Rs. ${Number(updated.total || 0).toLocaleString()} successfully paid via ${(updated.payment_method || 'card').toUpperCase()}`
            );
          } else if (isOrderVisibleInAdmin(updated)) {
            if (updated.status !== old?.status) {
              addNotification(
                updated,
                'status_update',
                `Status Update #${updated.id.slice(0, 8).toUpperCase()}`,
                `Order status changed to ${updated.status?.toUpperCase()}`
              );
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Subscription error:', err);
          setConnectionStatus('error');
          // Schedule auto-reconnect
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeChannel();
          }, 5000);
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('connecting');
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeChannel();
          }, 3000);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [session, addNotification]);

  // Connect on auth or reconnect
  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected');
      return;
    }

    setupRealtimeChannel();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, session, setupRealtimeChannel]);

  // Smart Polling Backup: Runs every 15 seconds to ensure zero missed orders
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const fifteenSecondsAgo = new Date(Date.now() - 25000).toISOString();
        const { data, error } = await supabase
          .from('orders')
          .select('id, total, status, payment_method, payment_status, created_at, shipping_address')
          .gt('created_at', fifteenSecondsAgo)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          data.forEach((o) => {
            addNotification(o, 'new_order');
          });
        }
      } catch (err) {
        console.warn('Polling check error:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user, addNotification]);

  // Test Alert Function
  const testAlert = () => {
    const demoOrder = {
      id: 'demo-order-test',
      total: 3450,
      payment_method: 'card',
      shipping_address: { recipient_name: 'Test Customer' },
      status: 'pending',
      payment_status: 'paid',
    };
    addNotification(demoOrder, 'new_order', '🔔 Test Store Alert (Working!)', 'Sound & Realtime notification operational.');
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        connectionStatus,
        isMuted,
        setIsMuted,
        markAllAsRead,
        clearNotifications,
        testAlert,
        reconnect: setupRealtimeChannel,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
