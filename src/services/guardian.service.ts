import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type {
  GuardianAuth,
  GuardianReport,
  GuardianStats,
  GuardianUsersResponse,
  MediaItem,
} from '@/types/api.types';
import type { UserProfile } from '@/types/user.types';

export const guardianService = {
  login(username: string, password: string) {
    return apiRequest<{ ok: boolean; role: string; username: string }>(endpoints.guardian.login, {
      method: 'POST',
      body: { username, password },
    });
  },
  logout() {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.logout, { method: 'POST' });
  },
  auth() {
    return apiRequest<GuardianAuth>(endpoints.guardian.auth);
  },
  stats() {
    return apiRequest<GuardianStats>(endpoints.guardian.stats);
  },
  users(search = '', page = 1) {
    return apiRequest<GuardianUsersResponse>(
      `${endpoints.guardian.users}?search=${encodeURIComponent(search)}&page=${page}&limit=25`,
    );
  },
  user(id: number) {
    return apiRequest<UserProfile & { reportCount: number; mediaCount: number; suspendedUntil: string | null }>(
      endpoints.guardian.user(id),
    );
  },
  userMedia(id: number) {
    return apiRequest<MediaItem[]>(endpoints.guardian.userMedia(id));
  },
  updateUser(id: number, body: Record<string, unknown>) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.user(id), { method: 'PUT', body });
  },
  ban(id: number) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.ban(id), { method: 'POST' });
  },
  unban(id: number) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.unban(id), { method: 'POST' });
  },
  grantPremium(id: number, months: number) {
    return apiRequest<{ ok: boolean; expiresAt: string }>(endpoints.guardian.grantPremium(id), {
      method: 'POST',
      body: { months },
    });
  },
  revokePremium(id: number) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.revokePremium(id), { method: 'POST' });
  },
  addCredits(id: number, amount: number) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.addCredits(id), { method: 'POST', body: { amount } });
  },
  deleteUser(id: number) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.user(id), { method: 'DELETE' });
  },
  reports() {
    return apiRequest<GuardianReport[]>(endpoints.guardian.reports);
  },
  deleteReport(id: number) {
    return apiRequest<{ ok: boolean }>(endpoints.guardian.report(id), { method: 'DELETE' });
  },
};
