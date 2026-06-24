import type { DiscoverProfile, UserProfile } from './user.types';

export type ApiErrorBody = {
  error: string;
};

export type SuccessResponse = {
  success: boolean;
};

export type AuthResult = {
  user: UserProfile;
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  birthDate: string;
  gender: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LikeResult = {
  matched: boolean;
  matchId: number | null;
  likesRemainingToday: number;
};

export type ReceivedLike = {
  id: number;
  fromUser: DiscoverProfile;
  createdAt: string;
  isSuperlike: boolean;
};

export type SentLike = {
  userId: number;
  displayName: string;
  age: number;
  gender: string;
  profilePhotoUrl: string | null;
  location: string | null;
  isSuperlike: boolean;
  createdAt: string;
};

export type FavoritedUser = {
  userId: number;
  displayName: string;
  age: number;
  gender: string;
  profilePhotoUrl: string | null;
  location: string | null;
  createdAt: string;
};

export type FavoriteStatus = {
  isFavorited: boolean;
};

export type LikeStats = {
  likesReceivedCount: number;
  likesSentToday: number;
  dailyLikeLimit: number;
  isPremium: boolean;
  matchesCount: number;
};

export type MediaItem = {
  id: number;
  url: string;
  mediaType: 'photo' | 'video' | 'audio';
  isNude: boolean;
  isProfilePhoto: boolean;
  createdAt: string;
};

export type NudeStatus = {
  unlocked: boolean;
  hasNudeMedia: boolean;
  credits: number;
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type GuardianStats = {
  totalUsers: number;
  totalReports: number;
  bannedUsers: number;
  premiumUsers: number;
};

export type GuardianAuth = {
  authenticated: boolean;
  role: string | null;
  username: string | null;
};

export type GuardianUserSummary = {
  id: number;
  email: string;
  displayName: string;
  gender: string;
  location: string | null;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  credits: number;
  suspendedUntil: string | null;
  isOnline: boolean;
  isPaused: boolean;
  profilePhotoUrl: string | null;
  createdAt: string;
};

export type GuardianUsersResponse = {
  users: GuardianUserSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type GuardianReport = {
  id: number;
  reporter: { id: number; displayName: string; email: string; profilePhotoUrl: string | null } | null;
  reported: { id: number; displayName: string; email: string; profilePhotoUrl: string | null; suspendedUntil: string | null } | null;
  reason: string;
  description: string | null;
  screenshotUrl: string | null;
  matchId: number | null;
  createdAt: string;
};
