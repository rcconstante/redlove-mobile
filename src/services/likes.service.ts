import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { FavoriteStatus, FavoritedUser, LikeResult, LikeStats, ReceivedLike, SentLike } from '@/types/api.types';

export const likesService = {
  send(targetUserId: number, action: 'like' | 'pass') {
    return apiRequest<LikeResult>(endpoints.likes.root, { method: 'POST', body: { targetUserId, action } });
  },
  superlike(targetUserId: number) {
    return apiRequest<LikeResult>(endpoints.likes.superlike, { method: 'POST', body: { targetUserId } });
  },
  received() {
    return apiRequest<ReceivedLike[]>(endpoints.likes.root);
  },
  sent() {
    return apiRequest<SentLike[]>(endpoints.likes.sent);
  },
  stats() {
    return apiRequest<LikeStats>(endpoints.likes.stats);
  },
  favorites() {
    return apiRequest<FavoritedUser[]>(endpoints.favorites.root);
  },
  favoriteStatus(userId: number) {
    return apiRequest<FavoriteStatus>(endpoints.favorites.status(userId));
  },
  addFavorite(targetUserId: number) {
    return apiRequest<FavoriteStatus>(endpoints.favorites.root, { method: 'POST', body: { targetUserId } });
  },
  removeFavorite(userId: number) {
    return apiRequest<FavoriteStatus>(endpoints.favorites.item(userId), { method: 'DELETE' });
  },
};
