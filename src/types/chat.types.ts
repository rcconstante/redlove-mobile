import type { DiscoverProfile } from './user.types';

export type Match = {
  id: number;
  otherUser: DiscoverProfile;
  createdAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'gif' | 'call_event';

export type Message = {
  id: number;
  matchId: number;
  senderId: number;
  text: string;
  messageType: MessageType;
  mediaUrl: string | null;
  isNude: boolean;
  isViewOnce: boolean;
  isViewed: boolean;
  createdAt: string;
};

export type IncomingCall = {
  id: number;
  caller_id: number;
  match_id: number;
  call_type: 'audio' | 'video';
  offer: string;
  display_name: string;
  profile_photo_url: string | null;
};
