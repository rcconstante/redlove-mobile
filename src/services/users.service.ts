import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { SuccessResponse } from '@/types/api.types';
import type { Preferences, ProfileUpdate, UserProfile } from '@/types/user.types';

export const usersService = {
  profile(userId: number) {
    return apiRequest<UserProfile>(endpoints.users.profile(userId));
  },
  updateProfile(input: ProfileUpdate) {
    return apiRequest<UserProfile>(endpoints.users.meProfile, { method: 'PATCH', body: input });
  },
  preferences() {
    return apiRequest<Preferences>(endpoints.users.preferences);
  },
  updatePreferences(input: Partial<Preferences>) {
    return apiRequest<Preferences>(endpoints.users.preferences, { method: 'PATCH', body: input });
  },
  setOnlineStatus(isOnline: boolean) {
    return apiRequest<SuccessResponse>(endpoints.users.onlineStatus, { method: 'PATCH', body: { isOnline } });
  },
  setPauseStatus(isPaused: boolean) {
    return apiRequest<SuccessResponse>(endpoints.users.pauseStatus, { method: 'PATCH', body: { isPaused } });
  },
  visit(userId: number) {
    return apiRequest<{ ok: boolean }>(endpoints.users.visit(userId), { method: 'POST' });
  },
  deleteAccount() {
    return apiRequest<SuccessResponse>(endpoints.users.deleteMe, { method: 'DELETE' });
  },
  block(userId: number) {
    return apiRequest<SuccessResponse>(endpoints.blocks.item(userId), { method: 'POST' });
  },
  unblock(userId: number) {
    return apiRequest<SuccessResponse>(endpoints.blocks.item(userId), { method: 'DELETE' });
  },
  report(userId: number, reason: string, description: string) {
    const form = new FormData();
    form.append('reason', reason);
    if (description.trim()) form.append('description', description.trim());
    return apiRequest<SuccessResponse>(endpoints.reports.item(userId), { method: 'POST', body: form });
  },
};
