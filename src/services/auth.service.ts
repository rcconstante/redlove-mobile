import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { AuthResult, LoginInput, RegisterInput, SuccessResponse } from '@/types/api.types';
import type { UserProfile } from '@/types/user.types';

export const authService = {
  register(input: RegisterInput) {
    return apiRequest<AuthResult>(endpoints.auth.register, { method: 'POST', body: input });
  },
  login(input: LoginInput) {
    return apiRequest<AuthResult>(endpoints.auth.login, { method: 'POST', body: input });
  },
  logout() {
    return apiRequest<SuccessResponse>(endpoints.auth.logout, { method: 'POST' });
  },
  me() {
    return apiRequest<UserProfile>(endpoints.auth.me);
  },
  forgotPassword(email: string) {
    return apiRequest<{ token: string | null; message: string }>(endpoints.auth.forgotPassword, {
      method: 'POST',
      body: { email },
    });
  },
  resetPassword(token: string, newPassword: string) {
    return apiRequest<SuccessResponse>(endpoints.auth.resetPassword, {
      method: 'POST',
      body: { token, newPassword },
    });
  },
  changePassword(currentPassword: string, newPassword: string) {
    return apiRequest<SuccessResponse>(endpoints.auth.changePassword, {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },
  connectPaypal(paypalEmail: string) {
    return apiRequest<{ user: UserProfile }>(endpoints.auth.connectPaypal, {
      method: 'POST',
      body: { paypalEmail },
    });
  },
};
