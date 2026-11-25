export type Locale = 'ar' | 'en';

export interface LocalizedText {
  ar: string;
  en: string;
  enManual: boolean;
}

export type UserRole = 'OWNER' | 'SALES';
export type ImageProvider = 'CLOUDINARY' | 'STATIC';
export type PricePrefix = 'NONE' | 'STARTING_FROM';
export type PriceUnit = 'PER_PERSON' | 'PER_TRIP' | 'NONE';
export type TripStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
export type ActivityPricing = 'FREE' | 'EXTRA_COST';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  lastRefreshedAt: string;
  createdAt: string;
}

export interface LoginAttemptRecord {
  id: string;
  key: string;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  provider: ImageProvider;
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  createdAt: string;
}

export interface WhyUsItem {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
}

export interface SiteSettings {
  id: string;
  companyName: LocalizedText;
  logoImageId: string | null;
  faviconImageId: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  address: LocalizedText;
  mapUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappMessage: LocalizedText;
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
  ogImageId: string | null;
  aboutTitle: LocalizedText;
  aboutBody: LocalizedText;
  heroBadge: LocalizedText;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  heroDescription: LocalizedText;
  heroFeatures: LocalizedText[];
  heroIntervalSeconds: number;
  showTripsSection: boolean;
  showWhyUsSection: boolean;
  showGallerySection: boolean;
  showContactSection: boolean;
  whyUsItems: WhyUsItem[];
  tripsIntro: LocalizedText;
  galleryTitle: LocalizedText;
  contactIntro: LocalizedText;
  footerTagline: LocalizedText;
}

export interface HeroImageRecord {
  id: string;
  imageId: string;
  sortOrder: number;
  image?: ImageRecord;
}

export interface DestinationRecord {
  id: string;
  slug: string;
  name: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export interface TripImageRecord {
  id: string;
  tripId: string;
  imageId: string;
  sortOrder: number;
  image?: ImageRecord;
}

export interface ItineraryDayRecord {
  id: string;
  tripId: string;
  sortOrder: number;
  title: LocalizedText;
  description: LocalizedText;
}

export interface OptionalActivityRecord {
  id: string;
  tripId: string;
  sortOrder: number;
  title: LocalizedText;
  description: LocalizedText;
  pricing: ActivityPricing;
  priceAmount: number | null;
}

export interface TripRecord {
  id: string;
  slug: string;
  title: LocalizedText;
  destinationId: string;
  tagline: LocalizedText;
  badge: LocalizedText | null;
  features: LocalizedText[];
  description: LocalizedText;
  durationDays: number | null;
  priceAmount: number | null;
  pricePrefix: PricePrefix;
  priceUnit: PriceUnit;
  status: TripStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripWithRelations extends TripRecord {
  destination: DestinationRecord | null;
  images: TripImageRecord[];
  itinerary: ItineraryDayRecord[];
  optionalActivities: OptionalActivityRecord[];
}

export interface GalleryImageRecord {
  id: string;
  imageId: string;
  caption: LocalizedText | null;
  sortOrder: number;
  createdAt: string;
  image?: ImageRecord;
}

export interface PublicSitePayload {
  settings: SiteSettings & {
    logoImage: ImageRecord | null;
    faviconImage: ImageRecord | null;
    ogImage: ImageRecord | null;
  };
  heroImages: HeroImageRecord[];
  destinations: DestinationRecord[];
  trips: TripWithRelations[];
  galleryImages: GalleryImageRecord[];
}

export interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  loginAttempts: LoginAttemptRecord[];
  images: ImageRecord[];
  siteSettings: SiteSettings;
  heroImages: HeroImageRecord[];
  destinations: DestinationRecord[];
  trips: TripRecord[];
  tripImages: TripImageRecord[];
  itineraryDays: ItineraryDayRecord[];
  optionalActivities: OptionalActivityRecord[];
  galleryImages: GalleryImageRecord[];
}
