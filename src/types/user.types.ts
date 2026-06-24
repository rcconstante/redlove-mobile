import type { GENDERS } from '@/utils/constants';

export type Gender = (typeof GENDERS)[number];

export type UserProfile = {
  id: number;
  email: string;
  displayName: string;
  bio: string | null;
  gender: Gender;
  age: number;
  heightCm: number | null;
  location: string | null;
  ethnicity: string | null;
  religion: string | null;
  relationshipStatus: string | null;
  lookingFor: string | null;
  bodyType: string | null;
  hasTattoos: boolean | null;
  hasPiercings: boolean | null;
  smokingHabit: string | null;
  drinkingHabit: string | null;
  usesDrugs: boolean | null;
  childrenStatus: string | null;
  pregnancyStatus: boolean | null;
  profilePhotoUrl: string | null;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  credits: number;
  likesRemainingToday: number;
  isOnline: boolean;
  isPaused: boolean;
  isVerified?: boolean;
  freePremiumGrantedAt: string | null;
  paypalConnected: boolean;
  freePremiumPaused: boolean;
  interests: string[];
  createdAt: string;
};

export type DiscoverProfile = {
  id: number;
  displayName: string;
  age: number;
  gender: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  heightCm: number | null;
  location: string | null;
  ethnicity: string | null;
  religion: string | null;
  lookingFor: string | null;
  hasTattoos: boolean | null;
  hasPiercings: boolean | null;
  isVerified?: boolean;
  interests?: string[];
  isOnline?: boolean;
  distance: number | null;
};

export type Preferences = {
  interestedInGenders: string[];
  minAge: number;
  maxAge: number;
  minHeightCm: number | null;
  maxHeightCm: number | null;
  ethnicities: string[];
  religions: string[];
  lookingFor: string[];
  requireNoTattoos: boolean | null;
  requireNoPiercings: boolean | null;
  countries: string[];
  discoverLocation: string | null;
};

export type ProfileUpdate = Partial<{
  displayName: string;
  bio: string;
  heightCm: number | null;
  location: string;
  ethnicity: string;
  religion: string;
  relationshipStatus: string;
  lookingFor: string;
  bodyType: string;
  hasTattoos: boolean | null;
  hasPiercings: boolean | null;
  smokingHabit: string;
  drinkingHabit: string;
  usesDrugs: boolean | null;
  childrenStatus: string;
  pregnancyStatus: boolean | null;
  profilePhotoUrl: string;
  interests: string[];
}>;
