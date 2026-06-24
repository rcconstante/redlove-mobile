import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { Message, MessageType } from '@/types/chat.types';

export type GiphyResult = {
  id: string;
  title: string;
  images: {
    fixed_height_small?: { url: string; width: string; height: string };
    original: { url: string; width?: string; height?: string };
  };
};

export type GiphyResponse = {
  data: GiphyResult[];
};

export type SendMessageInput = {
  text?: string;
  messageType?: MessageType;
  mediaUrl?: string;
  isNude?: boolean;
  isViewOnce?: boolean;
};

export const messagesService = {
  thread(matchId: number) {
    return apiRequest<Message[]>(endpoints.messages.thread(matchId));
  },
  send(matchId: number, input: SendMessageInput) {
    return apiRequest<Message>(endpoints.messages.thread(matchId), { method: 'POST', body: input });
  },
  gifs(query: string, limit = 24) {
    const params = new URLSearchParams({ limit: String(limit) });
    const trimmed = query.trim();
    if (trimmed) params.set('q', trimmed);
    return apiRequest<GiphyResponse>(`${endpoints.gifs}?${params.toString()}`);
  },
};
