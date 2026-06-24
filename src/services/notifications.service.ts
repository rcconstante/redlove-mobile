import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { NotificationItem, SuccessResponse } from '@/types/api.types';

export type NotificationThread = {
  notification: NotificationItem;
  replies: { id: number; sender: string; message: string; created_at: string }[];
};

export const notificationsService = {
  list() {
    return apiRequest<NotificationItem[]>(endpoints.notifications.root);
  },
  markAllRead() {
    return apiRequest<SuccessResponse>(endpoints.notifications.readAll, { method: 'PUT' });
  },
  markRead(id: number) {
    return apiRequest<SuccessResponse>(endpoints.notifications.read(id), { method: 'PUT' });
  },
  thread(id: number) {
    return apiRequest<NotificationThread>(endpoints.notifications.thread(id));
  },
  reply(id: number, message: string) {
    return apiRequest<{ id: number; sender: string; message: string; created_at: string }>(endpoints.notifications.reply(id), {
      method: 'POST',
      body: { message },
    });
  },
};
