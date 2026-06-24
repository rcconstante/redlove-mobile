import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { MediaItem, NudeStatus, SuccessResponse } from '@/types/api.types';

export type UploadMediaInput = {
  uri: string;
  name: string;
  type: string;
  isNude: boolean;
  isProfilePhoto: boolean;
  context?: 'profile' | 'chat';
};

export const mediaService = {
  mine() {
    return apiRequest<MediaItem[]>(endpoints.media.mine);
  },
  user(userId: number) {
    return apiRequest<MediaItem[]>(endpoints.media.user(userId));
  },
  upload(input: UploadMediaInput) {
    const form = new FormData();
    const file = { uri: input.uri, name: input.name, type: input.type } as unknown as Blob;
    form.append('file', file);
    form.append('isNude', String(input.isNude));
    form.append('isProfilePhoto', String(input.isProfilePhoto));
    if (input.context) form.append('context', input.context);
    return apiRequest<MediaItem | Omit<MediaItem, 'id' | 'createdAt'>>(endpoints.media.upload, {
      method: 'POST',
      body: form,
    });
  },
  update(mediaId: number, input: Partial<Pick<MediaItem, 'isNude' | 'isProfilePhoto'>>) {
    return apiRequest<MediaItem>(endpoints.media.item(mediaId), { method: 'PATCH', body: input });
  },
  remove(mediaId: number) {
    return apiRequest<SuccessResponse>(endpoints.media.item(mediaId), { method: 'DELETE' });
  },
  nudeStatus(userId: number) {
    return apiRequest<NudeStatus>(endpoints.media.nudeStatus(userId));
  },
  unlockNude(userId: number) {
    return apiRequest<{ unlocked: boolean; credits: number }>(endpoints.media.unlockNude(userId), { method: 'POST' });
  },
};
