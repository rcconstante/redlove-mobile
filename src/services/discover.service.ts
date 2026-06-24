import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { DiscoverProfile } from '@/types/user.types';

export const discoverService = {
  profiles(limit: number) {
    return apiRequest<DiscoverProfile[]>(`${endpoints.discover}?limit=${limit}`);
  },
};
