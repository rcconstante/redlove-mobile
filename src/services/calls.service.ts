import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { IncomingCall } from '@/types/chat.types';

export type CallStatus = {
  status: 'pending' | 'active' | 'declined' | 'ended' | string;
  answer: string | null;
  call_type: 'audio' | 'video' | string;
  reoffer?: string | null;
  reanswer?: string | null;
  reoffer_from_id?: number | null;
};

export type IceCandidatePayload = {
  id: number;
  candidate: string;
};

export const callsService = {
  initiate(matchId: number, callType: 'audio' | 'video', offer: string) {
    return apiRequest<{ callId: number }>(endpoints.calls.initiate, {
      method: 'POST',
      body: { matchId, callType, offer },
    });
  },
  incoming() {
    return apiRequest<{ incoming: IncomingCall | null }>(endpoints.calls.incoming);
  },
  answer(id: number, answer: string) {
    return apiRequest<{ ok: boolean }>(endpoints.calls.answer(id), { method: 'POST', body: { answer } });
  },
  decline(id: number) {
    return apiRequest<{ ok: boolean }>(endpoints.calls.decline(id), { method: 'POST' });
  },
  end(id: number, duration?: number) {
    return apiRequest<{ ok: boolean }>(endpoints.calls.end(id), { method: 'POST', body: { duration } });
  },
  status(id: number) {
    return apiRequest<CallStatus>(endpoints.calls.status(id));
  },
  reoffer(id: number, reoffer: string) {
    return apiRequest<{ ok: boolean }>(endpoints.calls.reoffer(id), { method: 'POST', body: { reoffer } });
  },
  reanswer(id: number, reanswer: string) {
    return apiRequest<{ ok: boolean }>(endpoints.calls.reanswer(id), { method: 'POST', body: { reanswer } });
  },
  addIceCandidate(id: number, candidate: string) {
    return apiRequest<{ ok: boolean }>(endpoints.calls.ice(id), { method: 'POST', body: { candidate } });
  },
  iceCandidates(id: number, since = 0) {
    return apiRequest<{ candidates: IceCandidatePayload[] }>(`${endpoints.calls.ice(id)}?since=${since}`);
  },
};
