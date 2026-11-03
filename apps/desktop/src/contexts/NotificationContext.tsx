import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface OrderNotification {
  id: string;
  orderId: string;
  title: string;
  message: string;
  amount: number;
  timestamp: string;
  isRead: boolean;
}

interface NotificationContextValue {
  notifications: OrderNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  // Request browser / desktop notification permissions on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Native desktop notification trigger
  const triggerDesktopNotification = useCallback((order: any) => {
    const title = `🚨 New Store Order #${order.id?.slice(0, 8).toUpperCase() || ''}`;
    const amountStr = `Rs. ${Number(order.total || 0).toLocaleString()}`;
    const customer = order.shipping_address?.recipient_name || 'Customer';
    const body = `${amountStr} • ${order.payment_method?.toUpperCase()} • Recipient: ${customer}`;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          tag: order.id,
        });
      } catch (e) {
        console.warn('Native notification error:', e);
      }
    }
  }, []);

  // Supabase Realtime listener on public.orders
  useEffect(() => {
    const channel = supabase
      .channel('realtime-orders-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new;
          const notificationItem: OrderNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            orderId: newOrder.id,
            title: `New Order #${newOrder.id?.slice(0, 8).toUpperCase()}`,
            message: `Order for Rs. ${Number(newOrder.total || 0).toLocaleString()} via ${newOrder.payment_method?.toUpperCase()}`,
            amount: Number(newOrder.total || 0),
            timestamp: new Date().toISOString(),
            isRead: false,
          };

          setNotifications((prev) => [notificationItem, ...prev.slice(0, 29)]);
          triggerDesktopNotification(newOrder);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [triggerDesktopNotification]);

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
        markAllAsRead,
        clearNotifications,
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

