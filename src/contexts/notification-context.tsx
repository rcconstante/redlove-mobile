import { createContext, type ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import type { NotificationItem } from '@/types/api.types';
import type { IncomingCall } from '@/types/chat.types';

type NotificationContextValue = {
  notifications: NotificationItem[];
  incomingCall: IncomingCall | null;
  unreadCount: number;
  refresh: () => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const value = useNotifications(authenticated);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
