import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';

export type VerificationStatus = {
  isVerified: boolean;
  latest: {
    id: number;
    challenge: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
    rejection_reason: string | null;
    created_at: string;
  } | null;
};

export const verificationService = {
  status() {
    return apiRequest<VerificationStatus>(endpoints.verification.status);
  },
  submit(challenge: string, selfieData: string) {
    return apiRequest<{ ok: boolean }>(endpoints.verification.submit, {
      method: 'POST',
      body: { challenge, selfieData },
    });
  },
};
