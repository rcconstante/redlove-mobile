import { apiRequest } from '@/lib/api';
import { endpoints } from '@/lib/api-endpoints';
import type { CreditPack, PaymentRecord, PremiumPlan, PremiumStatus } from '@/types/payment.types';

export const premiumService = {
  status() {
    return apiRequest<PremiumStatus>(endpoints.premium.status);
  },
  plans() {
    return apiRequest<PremiumPlan[]>(endpoints.premium.plans);
  },
  creditPacks() {
    return apiRequest<CreditPack[]>(endpoints.premium.creditPacks);
  },
  promoStatus() {
    return apiRequest<{ total: number; claimed: number; remaining: number; active: boolean; monthlyPrice: string }>(
      endpoints.premium.promoStatus,
    );
  },
  paypalConfig() {
    return apiRequest<{ clientId: string; mode: string }>(endpoints.premium.paypalConfig);
  },
  createOrder(itemType: 'premium_plan' | 'credit_pack', itemId: string) {
    return apiRequest<{ orderId: string; approvalUrl?: string }>(endpoints.payments.createOrder, {
      method: 'POST',
      body: { itemType, itemId },
    });
  },
  captureOrder(orderId: string) {
    return apiRequest<PremiumStatus>(endpoints.payments.captureOrder, { method: 'POST', body: { orderId } });
  },
  history() {
    return apiRequest<PaymentRecord[]>(endpoints.payments.history);
  },
};
