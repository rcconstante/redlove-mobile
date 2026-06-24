export type PremiumStatus = {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  credits: number;
  likesRemainingToday: number;
  dailyLikeLimit: number;
  planName: string | null;
  hasActiveSubscription?: boolean;
  paypalPromoClaimed?: boolean;
};

export type PremiumPlan = {
  id: string;
  name: string;
  durationDays: number;
  priceUsd: number;
  description: string;
  features: string[];
};

export type CreditPack = {
  id: string;
  credits: number;
  priceUsd: number;
  label: string;
  bonusCredits: number;
};

export type PaymentRecord = {
  id: number;
  amount: number;
  currency: string;
  itemType: string;
  itemId: string;
  status: string;
  paypalOrderId: string | null;
  createdAt: string;
};
