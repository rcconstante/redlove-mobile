import { useCallback, useEffect, useState } from 'react';

import { callsService } from '@/services/calls.service';
import { notificationsService } from '@/services/notifications.service';
import type { NotificationItem } from '@/types/api.types';
import type { IncomingCall } from '@/types/chat.types';

const NOTIFICATION_POLL_INTERVAL_MS = 3000;

export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const [items, call] = await Promise.all([notificationsService.list(), callsService.incoming()]);
      setNotifications(items);
      setIncomingCall(call.incoming);
    } catch {
      // Notification polling is best-effort. Keep the current UI state on transient failures.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    void Promise.all([notificationsService.list(), callsService.incoming()])
      .then(([items, call]) => {
        if (!alive) return;
        setNotifications(items);
        setIncomingCall(call.incoming);
      })
      .catch(() => undefined);
    const timer = setInterval(() => void refresh(), NOTIFICATION_POLL_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled, refresh]);

  return { notifications, incomingCall, refresh, unreadCount: notifications.filter((item) => !item.is_read).length };
}
