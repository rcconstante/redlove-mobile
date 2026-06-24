import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { SuccessResponse } from '@/types/api.types';
import type { Match } from '@/types/chat.types';

export const matchesService = {
  list() {
    return apiRequest<Match[]>(endpoints.matches.root);
  },
  startConversation(targetUserId: number) {
    return apiRequest<{ matchId: number }>(endpoints.matches.startConversation, {
      method: 'POST',
      body: { targetUserId },
    });
  },
  submitDateFeedback(matchId: number, wentOnDate: boolean, rating?: number) {
    return apiRequest<SuccessResponse>(endpoints.matches.dateFeedback(matchId), {
      method: 'POST',
      body: { wentOnDate, rating },
    });
  },
  remove(matchId: number) {
    return apiRequest<SuccessResponse>(endpoints.matches.item(matchId), { method: 'DELETE' });
  },
};
