import type {
  ContentDatabaseSchema,
  DestinationRecord,
  GalleryImageRecord,
  HeroImageRecord,
  ImageRecord,
  PublicSitePayload,
  SiteSettings,
  TripRecord,
  TripWithRelations,
} from '../src/shared/types.ts';
import { getSupabaseAdmin } from './supabase.ts';

const CACHE_TTL_MS = 1_000;

let memoryCache: ContentDatabaseSchema | null = null;
let memoryCacheLoadedAt = 0;
let loadInFlight: Promise<ContentDatabaseSchema> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

export function createSeedDatabase(): ContentDatabaseSchema {
  const now = new Date().toISOString();

  const images: ImageRecord[] = [
    {
      id: 'img-hero-dahab',
      provider: 'STATIC',
      publicId: 'seed/hero_dahab_redsea',
      url: '/assets/img/hero_dahab_redsea_1795599272813-w1200.webp',
      width: 1376,
      height: 768,
      bytes: 221002,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/hero_dahab_redsea_1795599272813' },
      avgColor: '#9d9787',
      createdAt: now,
    },
    {
      id: 'img-hero-siwa',
      provider: 'STATIC',
      publicId: 'seed/hero_siwa_oasis',
      url: '/assets/img/hero_siwa_oasis_1795599273206-w1200.webp',
      width: 1376,
      height: 768,
      bytes: 153296,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/hero_siwa_oasis_1795599273206' },
      avgColor: '#987d5d',
      createdAt: now,
    },
    {
      id: 'img-trip-dahab',
      provider: 'STATIC',
      publicId: 'seed/trip_dahab_snorkeling',
      url: '/assets/img/trip_dahab_snorkeling_1795599274928-w1200.webp',
      width: 1200,
      height: 896,
      bytes: 378218,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/trip_dahab_snorkeling_1795599274928' },
      avgColor: '#80928a',
      createdAt: now,
    },
    {
      id: 'img-trip-siwa',
      provider: 'STATIC',
      publicId: 'seed/trip_siwa_safari',
      url: '/assets/img/trip_siwa_safari_1795599273291-w1200.webp',
      width: 1200,
      height: 896,
      bytes: 221900,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/trip_siwa_safari_1795599273291' },
      avgColor: '#a07547',
      createdAt: now,
    },
    {
      id: 'img-trip-alex',
      provider: 'STATIC',
      publicId: 'seed/trip_alexandria_corniche',
      url: '/assets/img/trip_alexandria_corniche_1795599275506-w1200.webp',
      width: 1200,
      height: 896,
      bytes: 299936,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/trip_alexandria_corniche_1795599275506' },
      avgColor: '#9c9c94',
      createdAt: now,
    },
    {
      id: 'img-gallery-nuweiba',
      provider: 'STATIC',
      publicId: 'seed/gallery_nuweiba_camp',
      url: '/assets/img/gallery_nuweiba_camp_1795599275538-w1200.webp',
      width: 1200,
      height: 896,
      bytes: 253030,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/gallery_nuweiba_camp_1795599275538' },
      avgColor: '#5b483f',
      createdAt: now,
    },
    {
      id: 'img-hero-catherine',
      provider: 'STATIC',
      publicId: 'seed/hero_saint_catherine_snow',
      url: '/assets/img/hero_saint_catherine_snow_1795616932524-w1200.webp',
      width: 1376,
      height: 768,
      bytes: 320184,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/hero_saint_catherine_snow_1795616932524' },
      avgColor: '#89858a',
      createdAt: now,
    },
    {
      id: 'img-hero-siwa-4x4',
      provider: 'STATIC',
      publicId: 'seed/hero_siwa_4x4',
      url: '/assets/img/hero_siwa_4x4_1795616932838-w1200.webp',
      width: 1376,
      height: 768,
      bytes: 105196,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/hero_siwa_4x4_1795616932838' },
      avgColor: '#965e2d',
      createdAt: now,
    },
    {
      id: 'img-hero-farsha',
      provider: 'STATIC',
      publicId: 'seed/hero_farsha_sharm',
      url: '/assets/img/hero_farsha_sharm_1795616934669-w1200.webp',
      width: 1376,
      height: 768,
      bytes: 222090,
      format: 'webp',
      variants: { format: 'webp', widths: [480, 768, 1200], basePath: 'assets/img/hero_farsha_sharm_1795616934669' },
      avgColor: '#504042',
      createdAt: now,
    },
  ];

  const siteSettings: SiteSettings = {
    id: 'default',
    companyName: { ar: 'everyDay للسياحة', en: 'everyDay Travel Agency', enManual: true },
    logoImageId: null,
    faviconImageId: null,
    phone: '',
    whatsapp: '',
    email: '',
    address: { ar: '', en: '', enManual: true },
    mapUrl: '',
    tiktokUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    whatsappMessage: {
      ar: 'مرحباً، أود الاستفسار عن رحلة: {trip} {url}',
      en: 'Hello, I would like to ask about this trip: {trip} {url}',
      enManual: true,
    },
    seoTitle: {
      ar: 'everyDay | رحلات داخل مصر',
      en: 'everyDay | Trips across Egypt',
      enManual: true,
    },
    seoDescription: {
      ar: 'رحلات منظمة لأجمل الوجهات داخل مصر، ببرامج واضحة يوم بيوم، عشان تسافر وانت مطمّن.',
      en: 'Well-organized trips to the most beautiful destinations across Egypt, with clear day-by-day programs, so you can travel with peace of mind.',
      enManual: true,
    },
    ogImageId: 'img-hero-dahab',
    aboutTitle: { ar: 'من نحن', en: 'About us', enManual: true },
    aboutBody: {
      ar: 'إحنا everyDay للسياحة، شركة متخصصة في الرحلات الداخلية داخل مصر. بنختار الوجهات ونرتب البرامج بعناية، عشان كل رحلة تبقى تجربة تستاهل. سواء بتدور على هدوء الشاطئ أو مغامرة في الصحراء، هتلاقي عندنا رحلة تناسبك.',
      en: 'We are everyDay Travel Agency, specialized in domestic trips across Egypt. We choose destinations and plan every program with care, so each trip is an experience worth having. Whether you want a quiet beach or a desert adventure, you will find a trip that suits you.',
      enManual: true,
    },
    heroBadge: { ar: 'رحلات داخل مصر', en: 'Trips across Egypt', enManual: true },
    heroTitle: { ar: 'كل يوم رحلة جديدة', en: 'Every day, a new journey', enManual: true },
    heroSubtitle: { ar: 'اكتشف مصر مع everyDay', en: 'Discover Egypt with everyDay', enManual: true },
    heroDescription: {
      ar: 'رحلات منظمة لأجمل الوجهات داخل مصر، ببرامج واضحة يوم بيوم، عشان تسافر وانت مطمّن.',
      en: 'Well-organized trips to the most beautiful destinations across Egypt, with clear day-by-day programs, so you can travel with peace of mind.',
      enManual: true,
    },
    heroFeatures: [
      { ar: 'وجهات متنوعة', en: 'Diverse destinations', enManual: true },
      { ar: 'برنامج واضح لكل رحلة', en: 'A clear program for every trip', enManual: true },
      { ar: 'تواصل مباشر معنا', en: 'Direct contact with us', enManual: true },
    ],
    heroIntervalSeconds: 5,
    showTripsSection: true,
    showWhyUsSection: true,
    showGallerySection: true,
    showContactSection: true,
    whyUsItems: [
      {
        id: 'why-1',
        title: { ar: 'برامج واضحة', en: 'Clear programs', enManual: true },
        body: {
          ar: 'كل رحلة ليها برنامج يوم بيوم، وانت عارف هتعمل إيه.',
          en: 'Every trip has a day-by-day program, so you always know what to expect.',
          enManual: true,
        },
      },
      {
        id: 'why-2',
        title: { ar: 'أنشطة اختيارية', en: 'Optional activities', enManual: true },
        body: {
          ar: 'اختار اللي يناسبك، وكل نشاط موضح إن كان مجاني أو بمصاريف إضافية.',
          en: 'Pick what suits you; each one is marked free or extra cost.',
          enManual: true,
        },
      },
      {
        id: 'why-3',
        title: { ar: 'تواصل مباشر', en: 'Direct contact', enManual: true },
        body: {
          ar: 'اسأل عن أي رحلة واحنا نرد عليك.',
          en: 'Ask about any trip and we will get back to you.',
          enManual: true,
        },
      },
    ],
    tripsIntro: {
      ar: 'رحلاتنا: اختار الوجهة اللي تناسبك واكتشف التفاصيل.',
      en: 'Our trips: choose the destination that suits you and explore the details.',
      enManual: true,
    },
    galleryTitle: {
      ar: 'لحظات من رحلاتنا',
      en: 'Moments from our trips',
      enManual: true,
    },
    contactIntro: {
      ar: 'عندك سؤال عن رحلة؟ كلمنا وهنساعدك تختار الأنسب لك.',
      en: 'Have a question about a trip? Message us and we will help you choose.',
      enManual: true,
    },
    footerTagline: {
      ar: 'everyDay للسياحة، رحلات داخل مصر',
      en: 'everyDay Travel Agency, trips across Egypt',
      enManual: true,
    },
  };

  const heroImages: HeroImageRecord[] = [
    { id: 'hero-1', imageId: 'img-hero-catherine', sortOrder: 0 },
    { id: 'hero-2', imageId: 'img-hero-siwa-4x4', sortOrder: 1 },
    { id: 'hero-3', imageId: 'img-hero-farsha', sortOrder: 2 },
  ];

  const destinations: DestinationRecord[] = [
    { id: 'dest-dahab', slug: 'dahab', name: { ar: 'دهب', en: 'Dahab', enManual: true }, sortOrder: 0, isActive: true },
    { id: 'dest-siwa', slug: 'siwa', name: { ar: 'سيوة', en: 'Siwa', enManual: true }, sortOrder: 1, isActive: true },
    { id: 'dest-sharm', slug: 'sharm-el-sheikh', name: { ar: 'شرم الشيخ', en: 'Sharm El Sheikh', enManual: true }, sortOrder: 2, isActive: true },
    { id: 'dest-alex', slug: 'alexandria', name: { ar: 'الإسكندرية', en: 'Alexandria', enManual: true }, sortOrder: 3, isActive: true },
    { id: 'dest-hurghada', slug: 'hurghada', name: { ar: 'الغردقة', en: 'Hurghada', enManual: true }, sortOrder: 4, isActive: true },
    { id: 'dest-nuweiba', slug: 'nuweiba', name: { ar: 'نويبع', en: 'Nuweiba', enManual: true }, sortOrder: 5, isActive: true },
  ];

  const trips: TripRecord[] = [
    {
      id: 'trip-dahab-escape',
      slug: 'dahab-red-sea-escape',
      title: {
        ar: 'رحلة دهب: البحر الأحمر واللاجونا',
        en: 'Dahab: Red Sea & Lagoon Escape',
        enManual: true,
      },
      destinationId: 'dest-dahab',
      tagline: {
        ar: 'أربعة أيام من الهدوء والغطس بين الشعاب المرجانية وجبال سيناء',
        en: 'Four calm days of snorkeling coral reefs framed by Sinai mountains',
        enManual: true,
      },
      badge: { ar: 'الأكثر طلباً', en: 'Popular choice', enManual: true },
      features: [
        { ar: 'إقامة فندقية شاملة الإفطار قريبة من الممشى', en: 'Boutique stay with breakfast near the promenade', enManual: true },
        { ar: 'انتقالات ذهاب وعودة بسيارات سياحية مكيفة', en: 'Round-trip air-conditioned coach transfers', enManual: true },
        { ar: 'رحلة بحرية إلى البلو هول واللاجونا', en: 'Guided visit to the Blue Hole and Lagoon', enManual: true },
      ],
      description: {
        ar: 'استمتع بأجواء دهب البسيطة بين البحر والجبل.\nالبرنامج مناسب لمن يبحث عن الاسترخاء والأنشطة البحرية في نفس الوقت، مع أوقات حرة في الممشى ومساء هادئ في الجبل.',
        en: 'Enjoy Dahab’s laid-back rhythm where desert mountains meet turquoise water.\nDesigned for travelers who want relaxed beach mornings paired with optional reef and canyon excursions.',
        enManual: true,
      },
      durationDays: 4,
      priceAmount: 4800,
      pricePrefix: 'STARTING_FROM',
      priceUnit: 'PER_PERSON',
      status: 'PUBLISHED',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'trip-siwa-oasis',
      slug: 'siwa-oasis-desert-retreat',
      title: {
        ar: 'سفاري واحة سيوة وبحر الرمال الأعظم',
        en: 'Siwa Oasis & Great Sand Sea Retreat',
        enManual: true,
      },
      destinationId: 'dest-siwa',
      tagline: {
        ar: 'تجربة صحراوية أصيلة بين بحيرات الملح والعيون الكبريتية',
        en: 'An authentic desert journey across salt lakes and warm springs',
        enManual: true,
      },
      badge: { ar: 'موسم الشتاء', en: 'Winter season', enManual: true },
      features: [
        { ar: 'إقامة في نُزل بيئي على الطراز السيوي', en: 'Eco-lodge stay built in traditional Siwan style', enManual: true },
        { ar: 'زيارة قلعة شالي ومعبد آمون وجبل الموتى', en: 'Guided visits to Shali Fortress and Amun Temple', enManual: true },
        { ar: 'سفاري 4x4 في بحر الرمال الأعظم مع غروب الشمس', en: '4x4 sunset safari into the Great Sand Sea', enManual: true },
      ],
      description: {
        ar: 'اكتشف هدوء واحة سيوة البعيدة عن صخب المدينة.\nبرنامج متكامل يجمع بين التاريخ السيوي، والسباحة في بحيرات الملح الصافية، وسهرة بدوية تحت النجوم.',
        en: 'Step away from city noise into the calm palm groves of Siwa Oasis.\nOur itinerary blends ancient Siwan heritage, floating in crystalline salt lakes, and starlit desert evenings.',
        enManual: true,
      },
      durationDays: 3,
      priceAmount: 5500,
      pricePrefix: 'STARTING_FROM',
      priceUnit: 'PER_PERSON',
      status: 'PUBLISHED',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'trip-alexandria-heritage',
      slug: 'alexandria-coastal-heritage',
      title: {
        ar: 'عطلة الإسكندرية: الكورنيش وقلعة قايتباي',
        en: 'Alexandria Coastal Heritage Weekend',
        enManual: true,
      },
      destinationId: 'dest-alex',
      tagline: {
        ar: 'يومان على البحر المتوسط بين المعالم التاريخية والكورنيش',
        en: 'Two Mediterranean days exploring historic landmarks and the Corniche',
        enManual: true,
      },
      badge: null,
      features: [
        { ar: 'جولة في قلعة قايتباي ومكتبة الإسكندرية', en: 'Guided tour of Qaitbay Citadel and Bibliotheca Alexandrina', enManual: true },
        { ar: 'إقامة ليلة مطلة على البحر شاملة الإفطار', en: 'Sea-view overnight stay including breakfast', enManual: true },
        { ar: 'وقت حر للتمشية على الكورنيش ووسط البلد', en: 'Free evening walk along the Corniche and downtown', enManual: true },
      ],
      description: {
        ar: 'رحلة خفيفة لعطلة نهاية الأسبوع في عروس البحر المتوسط.\nتناسب العائلات والأصدقاء مع جدول مريح يغطي أهم المعالم دون استعجال.',
        en: 'An easygoing weekend escape to Egypt’s Mediterranean jewel.\nCrafted for families and friends with a unhurried schedule covering iconic landmarks.',
        enManual: true,
      },
      durationDays: 2,
      priceAmount: 2400,
      pricePrefix: 'NONE',
      priceUnit: 'PER_PERSON',
      status: 'PUBLISHED',
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const tripImages = [
    { id: 'ti-1', tripId: 'trip-dahab-escape', imageId: 'img-trip-dahab', sortOrder: 0 },
    { id: 'ti-2', tripId: 'trip-dahab-escape', imageId: 'img-hero-dahab', sortOrder: 1 },
    { id: 'ti-3', tripId: 'trip-dahab-escape', imageId: 'img-gallery-nuweiba', sortOrder: 2 },
    { id: 'ti-4', tripId: 'trip-siwa-oasis', imageId: 'img-trip-siwa', sortOrder: 0 },
    { id: 'ti-5', tripId: 'trip-siwa-oasis', imageId: 'img-hero-siwa', sortOrder: 1 },
    { id: 'ti-6', tripId: 'trip-alexandria-heritage', imageId: 'img-trip-alex', sortOrder: 0 },
  ];

  const itineraryDays = [
    {
      id: 'it-dahab-1',
      tripId: 'trip-dahab-escape',
      sortOrder: 0,
      title: { ar: 'الوصول والتسكين وجولة الممشى', en: 'Arrival, check-in & promenade stroll', enManual: true },
      description: {
        ar: 'الوصول إلى دهب صباحاً، التسكين في الفندق، وقت للراحة على الشاطئ، وجولة مسائية حرة في الممشى.',
        en: 'Arrive in Dahab in the morning, check in to the hotel, unwind by the shore, and enjoy an unhurried evening walk along the promenade.',
        enManual: true,
      },
    },
    {
      id: 'it-dahab-2',
      tripId: 'trip-dahab-escape',
      sortOrder: 1,
      title: { ar: 'البلو هول واللاجونا', en: 'Blue Hole snorkeling & Lagoon sunset', enManual: true },
      description: {
        ar: 'التحرك صباحاً إلى محمية البلو هول للاستمتاع بالسباحة والسنوركلينج، ثم التوجه إلى اللاجونا وقت الغروب.',
        en: 'Morning departure to the Blue Hole marine reserve for snorkeling, followed by sunset views at Dahab Lagoon.',
        enManual: true,
      },
    },
    {
      id: 'it-dahab-3',
      tripId: 'trip-dahab-escape',
      sortOrder: 2,
      title: { ar: 'يوم حر أو رحلة وادي الوشواش', en: 'Free beach day or Wadi El Weshwash', enManual: true },
      description: {
        ar: 'يوم مفتوح للاسترخاء أو الانضمام إلى الأنشطة الاختيارية في الجبل والبحر.',
        en: 'An open day to relax by the sea or join optional canyon and marine excursions.',
        enManual: true,
      },
    },
    {
      id: 'it-dahab-4',
      tripId: 'trip-dahab-escape',
      sortOrder: 3,
      title: { ar: 'الإفطار والعودة', en: 'Breakfast & return journey', enManual: true },
      description: {
        ar: 'الإفطار في الفندق، تسجيل المغادرة، والتحرك للعودة مساءً.',
        en: 'Breakfast at the hotel, check-out, and comfortable return transfer.',
        enManual: true,
      },
    },
    {
      id: 'it-siwa-1',
      tripId: 'trip-siwa-oasis',
      sortOrder: 0,
      title: { ar: 'الوصول وبحيرات الملح', en: 'Arrival & Salt Lakes float', enManual: true },
      description: {
        ar: 'التسكين في النُزل السيوي ثم التوجه للسباحة في بحيرات الملح وزيارة عين كليوباترا.',
        en: 'Settle into the Siwan eco-lodge, then visit the crystal salt lakes and Cleopatra’s Spring.',
        enManual: true,
      },
    },
    {
      id: 'it-siwa-2',
      tripId: 'trip-siwa-oasis',
      sortOrder: 1,
      title: { ar: 'قلعة شالي وسفاري بحر الرمال', en: 'Shali Fortress & Great Sand Sea safari', enManual: true },
      description: {
        ar: 'جولة صباحية في المعالم التاريخية، وبداية رحلة السفاري بسيارات الدفع الرباعي قبل الغروب.',
        en: 'Morning heritage tour followed by an afternoon 4x4 dune adventure and sunset tea in the desert.',
        enManual: true,
      },
    },
    {
      id: 'it-siwa-3',
      tripId: 'trip-siwa-oasis',
      sortOrder: 2,
      title: { ar: 'السوق السيوي والعودة', en: 'Siwa market & departure', enManual: true },
      description: {
        ar: 'وقت حر لشراء التمور وزيت الزيتون السيوي ثم العودة.',
        en: 'Morning stroll through the local market for dates and olive oil before heading back.',
        enManual: true,
      },
    },
    {
      id: 'it-alex-1',
      tripId: 'trip-alexandria-heritage',
      sortOrder: 0,
      title: { ar: 'قلعة قايتباي والمكتبة', en: 'Qaitbay Citadel & Bibliotheca', enManual: true },
      description: {
        ar: 'زيارة قلعة قايتباي مطلة على الميناء الشرقي، ثم جولة في مكتبة الإسكندرية.',
        en: 'Explore Qaitbay Citadel overlooking the Eastern Harbor followed by a visit to the Bibliotheca Alexandrina.',
        enManual: true,
      },
    },
    {
      id: 'it-alex-2',
      tripId: 'trip-alexandria-heritage',
      sortOrder: 1,
      title: { ar: 'حدائق المنتزه والعودة', en: 'Montaza Gardens & return', enManual: true },
      description: {
        ar: 'صباح هادئ في حدائق المنتزه على البحر المتوسط ثم العودة مساءً.',
        en: 'A peaceful morning walk through Montaza Palace gardens before returning.',
        enManual: true,
      },
    },
  ];

  const optionalActivities = [
    {
      id: 'act-dahab-1',
      tripId: 'trip-dahab-escape',
      sortOrder: 0,
      title: { ar: 'سهرة جبل الطويلات', en: 'El-Tawilat mountain stargazing night', enManual: true },
      description: { ar: 'جلسة بدوية هادئة في قلب الجبل مع الشاي البدوي.', en: 'Bedouin tea evening nestled between Sinai peaks.', enManual: true },
      pricing: 'FREE' as const,
      priceAmount: null,
    },
    {
      id: 'act-dahab-2',
      tripId: 'trip-dahab-escape',
      sortOrder: 1,
      title: { ar: 'تجربة الغطس (Intro Dive)', en: 'Introductory scuba dive', enManual: true },
      description: { ar: 'غطسة برفقة مدرب معتمد ومعدات كاملة.', en: 'Guided shore dive with certified instructor and gear.', enManual: true },
      pricing: 'EXTRA_COST' as const,
      priceAmount: 950,
    },
    {
      id: 'act-siwa-1',
      tripId: 'trip-siwa-oasis',
      sortOrder: 0,
      title: { ar: 'التزحلق على الرمال (Sandboarding)', en: 'Desert sandboarding', enManual: true },
      description: { ar: 'تجهيز الألواح على الكثبان الرملية أثناء السفاري.', en: 'Boards provided on the dunes during the 4x4 safari.', enManual: true },
      pricing: 'FREE' as const,
      priceAmount: null,
    },
    {
      id: 'act-siwa-2',
      tripId: 'trip-siwa-oasis',
      sortOrder: 1,
      title: { ar: 'عشاء سيوي تقليدي في الكامب', en: 'Traditional Siwan desert dinner', enManual: true },
      description: { ar: 'وجبة طازجة مطهوة على الطريقة المحلية في المخيم الصحراوي.', en: 'Freshly prepared local dishes at the desert camp.', enManual: true },
      pricing: 'EXTRA_COST' as const,
      priceAmount: null,
    },
  ];

  const galleryImages: GalleryImageRecord[] = [
    {
      id: 'gal-1',
      imageId: 'img-hero-dahab',
      caption: { ar: 'غروب الشمس على خليج دهب وجبال سيناء', en: 'Sunset over Dahab Bay and Sinai mountains', enManual: true },
      sortOrder: 0,
      createdAt: now,
    },
    {
      id: 'gal-2',
      imageId: 'img-hero-siwa',
      caption: { ar: 'بحيرات الملح ونخيل واحة سيوة', en: 'Salt lakes and palm groves in Siwa Oasis', enManual: true },
      sortOrder: 1,
      createdAt: now,
    },
    {
      id: 'gal-3',
      imageId: 'img-trip-dahab',
      caption: { ar: 'المياه الصافية والشعاب المرجانية في دهب', en: 'Turquoise coral lagoon in Dahab', enManual: true },
      sortOrder: 2,
      createdAt: now,
    },
    {
      id: 'gal-4',
      imageId: 'img-trip-siwa',
      caption: { ar: 'كثبان بحر الرمال الأعظم وقت المغيب', en: 'Great Sand Sea dunes at golden hour', enManual: true },
      sortOrder: 3,
      createdAt: now,
    },
    {
      id: 'gal-5',
      imageId: 'img-trip-alex',
      caption: { ar: 'قلعة قايتباي وكورنيش الإسكندرية', en: 'Qaitbay Citadel along the Alexandria Corniche', enManual: true },
      sortOrder: 4,
      createdAt: now,
    },
    {
      id: 'gal-6',
      imageId: 'img-gallery-nuweiba',
      caption: { ar: 'أجواء المخيمات الهادئة على شاطئ نويبع', en: 'Evening lanterns by the sea in Nuweiba', enManual: true },
      sortOrder: 5,
      createdAt: now,
    },
  ];

  return {
    images,
    siteSettings,
    heroImages,
    destinations,
    trips,
    tripImages,
    itineraryDays,
    optionalActivities,
    galleryImages,
  };
}

type DbRow = Record<string, unknown>;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asRows(value: unknown): DbRow[] {
  return Array.isArray(value) ? (value as DbRow[]) : [];
}

function asJson<T>(value: unknown, fallback: T): T {
  return value === null || value === undefined ? fallback : (value as T);
}

function toSnakeImage(image: ImageRecord) {
  return {
    id: image.id,
    provider: image.provider,
    public_id: image.publicId,
    url: image.url,
    width: image.width,
    height: image.height,
    bytes: image.bytes,
    format: image.format,
    variants: image.variants ?? null,
    avg_color: image.avgColor ?? null,
    created_at: image.createdAt,
  };
}

function asImageVariants(value: unknown): ImageRecord['variants'] {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { format?: unknown; widths?: unknown; basePath?: unknown };
  const format = raw.format === 'webp' || raw.format === 'jpg' ? raw.format : null;
  const basePath = typeof raw.basePath === 'string' ? raw.basePath : '';
  const widths = Array.isArray(raw.widths)
    ? raw.widths.filter((width): width is number => typeof width === 'number' && width > 0)
    : [];
  if (!format || !basePath || widths.length === 0) return null;
  return { format, widths, basePath };
}

function fromSnakeImage(row: DbRow): ImageRecord {
  return {
    id: asString(row.id),
    provider: asString(row.provider, 'STATIC') as ImageRecord['provider'],
    publicId: asString(row.public_id),
    url: asString(row.url),
    width: asNumber(row.width, 1600),
    height: asNumber(row.height, 1200),
    bytes: asNumber(row.bytes, 0),
    format: asString(row.format, 'jpg'),
    variants: asImageVariants(row.variants),
    avgColor: typeof row.avg_color === 'string' ? row.avg_color : null,
    createdAt: asString(row.created_at, new Date().toISOString()),
  };
}

function toSnakeSettings(settings: SiteSettings) {
  return {
    id: settings.id,
    company_name: settings.companyName,
    logo_image_id: settings.logoImageId,
    favicon_image_id: settings.faviconImageId,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    address: settings.address,
    map_url: settings.mapUrl,
    tiktok_url: settings.tiktokUrl,
    facebook_url: settings.facebookUrl,
    instagram_url: settings.instagramUrl,
    whatsapp_message: settings.whatsappMessage,
    seo_title: settings.seoTitle,
    seo_description: settings.seoDescription,
    og_image_id: settings.ogImageId,
    about_title: settings.aboutTitle,
    about_body: settings.aboutBody,
    hero_badge: settings.heroBadge,
    hero_title: settings.heroTitle,
    hero_subtitle: settings.heroSubtitle,
    hero_description: settings.heroDescription,
    hero_features: settings.heroFeatures,
    hero_interval_seconds: settings.heroIntervalSeconds,
    show_trips_section: settings.showTripsSection,
    show_why_us_section: settings.showWhyUsSection,
    show_gallery_section: settings.showGallerySection,
    show_contact_section: settings.showContactSection,
    why_us_items: settings.whyUsItems,
    trips_intro: settings.tripsIntro,
    gallery_title: settings.galleryTitle,
    contact_intro: settings.contactIntro,
    footer_tagline: settings.footerTagline,
  };
}

function fromSnakeSettings(row: DbRow): SiteSettings {
  return {
    id: asString(row.id, 'default'),
    companyName: asJson(row.company_name, { ar: '', en: '', enManual: false }),
    logoImageId: (row.logo_image_id as string | null) ?? null,
    faviconImageId: (row.favicon_image_id as string | null) ?? null,
    phone: asString(row.phone),
    whatsapp: asString(row.whatsapp),
    email: asString(row.email),
    address: asJson(row.address, { ar: '', en: '', enManual: false }),
    mapUrl: asString(row.map_url),
    tiktokUrl: asString(row.tiktok_url),
    facebookUrl: asString(row.facebook_url),
    instagramUrl: asString(row.instagram_url),
    whatsappMessage: asJson(row.whatsapp_message, { ar: '', en: '', enManual: false }),
    seoTitle: asJson(row.seo_title, { ar: '', en: '', enManual: false }),
    seoDescription: asJson(row.seo_description, { ar: '', en: '', enManual: false }),
    ogImageId: (row.og_image_id as string | null) ?? null,
    aboutTitle: asJson(row.about_title, { ar: '', en: '', enManual: false }),
    aboutBody: asJson(row.about_body, { ar: '', en: '', enManual: false }),
    heroBadge: asJson(row.hero_badge, { ar: '', en: '', enManual: false }),
    heroTitle: asJson(row.hero_title, { ar: '', en: '', enManual: false }),
    heroSubtitle: asJson(row.hero_subtitle, { ar: '', en: '', enManual: false }),
    heroDescription: asJson(row.hero_description, { ar: '', en: '', enManual: false }),
    heroFeatures: asJson(row.hero_features, []),
    heroIntervalSeconds: asNumber(row.hero_interval_seconds, 5),
    showTripsSection: asBoolean(row.show_trips_section, true),
    showWhyUsSection: asBoolean(row.show_why_us_section, true),
    showGallerySection: asBoolean(row.show_gallery_section, true),
    showContactSection: asBoolean(row.show_contact_section, true),
    whyUsItems: asJson(row.why_us_items, []),
    tripsIntro: asJson(row.trips_intro, { ar: '', en: '', enManual: false }),
    galleryTitle: asJson(row.gallery_title, { ar: '', en: '', enManual: false }),
    contactIntro: asJson(row.contact_intro, { ar: '', en: '', enManual: false }),
    footerTagline: asJson(row.footer_tagline, { ar: '', en: '', enManual: false }),
  };
}

export function toDbState(state: ContentDatabaseSchema) {
  return {
    images: state.images.map(toSnakeImage),
    siteSettings: toSnakeSettings(state.siteSettings),
    heroImages: state.heroImages.map((row) => ({
      id: row.id,
      image_id: row.imageId,
      sort_order: row.sortOrder,
    })),
    destinations: state.destinations.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      sort_order: row.sortOrder,
      is_active: row.isActive,
    })),
    trips: state.trips.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      destination_id: row.destinationId,
      tagline: row.tagline,
      badge: row.badge,
      features: row.features,
      description: row.description,
      duration_days: row.durationDays,
      price_amount: row.priceAmount,
      price_prefix: row.pricePrefix,
      price_unit: row.priceUnit,
      status: row.status,
      sort_order: row.sortOrder,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
    tripImages: state.tripImages.map((row) => ({
      id: row.id,
      trip_id: row.tripId,
      image_id: row.imageId,
      sort_order: row.sortOrder,
    })),
    itineraryDays: state.itineraryDays.map((row) => ({
      id: row.id,
      trip_id: row.tripId,
      sort_order: row.sortOrder,
      title: row.title,
      description: row.description,
    })),
    optionalActivities: state.optionalActivities.map((row) => ({
      id: row.id,
      trip_id: row.tripId,
      sort_order: row.sortOrder,
      title: row.title,
      description: row.description,
      pricing: row.pricing,
      price_amount: row.priceAmount,
    })),
    galleryImages: state.galleryImages.map((row) => ({
      id: row.id,
      image_id: row.imageId,
      caption: row.caption,
      sort_order: row.sortOrder,
      created_at: row.createdAt,
    })),
  };
}

export function fromDbState(raw: unknown): ContentDatabaseSchema {
  const state = (raw ?? {}) as DbRow;
  const settingsRow = state.siteSettings as DbRow | null | undefined;

  return {
    images: asRows(state.images).map(fromSnakeImage),
    siteSettings: fromSnakeSettings(settingsRow ?? {}),
    heroImages: asRows(state.heroImages).map((row) => ({
      id: asString(row.id),
      imageId: asString(row.image_id),
      sortOrder: asNumber(row.sort_order),
    })),
    destinations: asRows(state.destinations).map((row) => ({
      id: asString(row.id),
      slug: asString(row.slug),
      name: asJson(row.name, { ar: '', en: '', enManual: false }),
      sortOrder: asNumber(row.sort_order),
      isActive: asBoolean(row.is_active, true),
    })),
    trips: asRows(state.trips).map((row) => ({
      id: asString(row.id),
      slug: asString(row.slug),
      title: asJson(row.title, { ar: '', en: '', enManual: false }),
      destinationId: asString(row.destination_id),
      tagline: asJson(row.tagline, { ar: '', en: '', enManual: false }),
      badge: (row.badge as TripRecord['badge']) ?? null,
      features: asJson(row.features, []),
      description: asJson(row.description, { ar: '', en: '', enManual: false }),
      durationDays: row.duration_days === null ? null : asNumber(row.duration_days),
      priceAmount: row.price_amount === null ? null : asNumber(row.price_amount),
      pricePrefix: asString(row.price_prefix, 'NONE') as TripRecord['pricePrefix'],
      priceUnit: asString(row.price_unit, 'PER_PERSON') as TripRecord['priceUnit'],
      status: asString(row.status, 'DRAFT') as TripRecord['status'],
      sortOrder: asNumber(row.sort_order),
      createdAt: asString(row.created_at, new Date().toISOString()),
      updatedAt: asString(row.updated_at, new Date().toISOString()),
    })),
    tripImages: asRows(state.tripImages).map((row) => ({
      id: asString(row.id),
      tripId: asString(row.trip_id),
      imageId: asString(row.image_id),
      sortOrder: asNumber(row.sort_order),
    })),
    itineraryDays: asRows(state.itineraryDays).map((row) => ({
      id: asString(row.id),
      tripId: asString(row.trip_id),
      sortOrder: asNumber(row.sort_order),
      title: asJson(row.title, { ar: '', en: '', enManual: false }),
      description: asJson(row.description, { ar: '', en: '', enManual: false }),
    })),
    optionalActivities: asRows(state.optionalActivities).map((row) => ({
      id: asString(row.id),
      tripId: asString(row.trip_id),
      sortOrder: asNumber(row.sort_order),
      title: asJson(row.title, { ar: '', en: '', enManual: false }),
      description: asJson(row.description, { ar: '', en: '', enManual: false }),
      pricing: asString(row.pricing, 'FREE') as ContentDatabaseSchema['optionalActivities'][number]['pricing'],
      priceAmount: row.price_amount === null ? null : asNumber(row.price_amount),
    })),
    galleryImages: asRows(state.galleryImages).map((row) => ({
      id: asString(row.id),
      imageId: asString(row.image_id),
      caption: (row.caption as GalleryImageRecord['caption']) ?? null,
      sortOrder: asNumber(row.sort_order),
      createdAt: asString(row.created_at, new Date().toISOString()),
    })),
  };
}

async function persistState(state: ContentDatabaseSchema): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('replace_site_state', {
    payload: toDbState(state),
  });
  if (error) {
    throw new Error(`Failed to save site state to Supabase: ${error.message}`);
  }
}

/**
 * Loads the dashboard-editable state from Supabase. The result is cached for
 * a very short time to keep public page requests cheap on long-running servers.
 * Every admin mutation calls saveDb(), which refreshes the cache immediately.
 */
export async function loadDb(options: { force?: boolean } = {}): Promise<ContentDatabaseSchema> {
  if (!options.force && memoryCache && Date.now() - memoryCacheLoadedAt < CACHE_TTL_MS) {
    return memoryCache;
  }
  if (loadInFlight) return loadInFlight;

  loadInFlight = (async () => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('get_site_state');
    if (error) {
      throw new Error(
        `Failed to load site state from Supabase: ${error.message}. ` +
          'Make sure supabase/migrations/0001_init.sql has been applied.'
      );
    }

    const rawSettings = (data as DbRow | null)?.siteSettings;
    if (!rawSettings) {
      const seeded = createSeedDatabase();
      await persistState(seeded);
      memoryCache = seeded;
      memoryCacheLoadedAt = Date.now();
      return seeded;
    }

    const state = fromDbState(data);
    memoryCache = state;
    memoryCacheLoadedAt = Date.now();
    return state;
  })().finally(() => {
    loadInFlight = null;
  });

  return loadInFlight;
}

export function getDb(): ContentDatabaseSchema {
  if (!memoryCache) {
    throw new Error('Database not loaded. Call loadDb() before getDb().');
  }
  return memoryCache;
}

/**
 * Persists the editable state to Supabase. Calls are serialized per process so
 * two saves from the same instance never race each other.
 */
export async function saveDb(next: ContentDatabaseSchema): Promise<void> {
  const run = saveQueue.then(() => persistState(next));
  saveQueue = run.catch(() => undefined);
  await run;
  memoryCache = next;
  memoryCacheLoadedAt = Date.now();
}

export async function resetDbToSeed(): Promise<ContentDatabaseSchema> {
  const seeded = createSeedDatabase();
  await saveDb(seeded);
  return seeded;
}

export function hydrateTrips(db: ContentDatabaseSchema, includeUnpublished = false): TripWithRelations[] {
  const imageMap = new Map(db.images.map((img) => [img.id, img]));
  const destMap = new Map(db.destinations.map((d) => [d.id, d]));

  return [...db.trips]
    .filter((trip) => includeUnpublished || trip.status === 'PUBLISHED')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((trip) => {
      const images = db.tripImages
        .filter((ti) => ti.tripId === trip.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ti) => ({ ...ti, image: imageMap.get(ti.imageId) }))
        .filter((ti) => Boolean(ti.image));

      const itinerary = db.itineraryDays
        .filter((d) => d.tripId === trip.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const optionalActivities = db.optionalActivities
        .filter((a) => a.tripId === trip.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        ...trip,
        destination: destMap.get(trip.destinationId) ?? null,
        images,
        itinerary,
        optionalActivities,
      };
    });
}

export function buildPublicPayload(db: ContentDatabaseSchema): PublicSitePayload {
  const imageMap = new Map(db.images.map((img) => [img.id, img]));

  const heroImages: HeroImageRecord[] = [...db.heroImages]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((hi) => ({ ...hi, image: imageMap.get(hi.imageId) }))
    .filter((hi) => Boolean(hi.image));

  const destinations = [...db.destinations]
    .filter((d) => d.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const trips = hydrateTrips(db, false);

  const galleryImages: GalleryImageRecord[] = [...db.galleryImages]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((gi) => ({ ...gi, image: imageMap.get(gi.imageId) }))
    .filter((gi) => Boolean(gi.image));

  return {
    settings: {
      ...db.siteSettings,
      logoImage: db.siteSettings.logoImageId
        ? imageMap.get(db.siteSettings.logoImageId) ?? null
        : null,
      faviconImage: db.siteSettings.faviconImageId
        ? imageMap.get(db.siteSettings.faviconImageId) ?? null
        : null,
      ogImage: db.siteSettings.ogImageId
        ? imageMap.get(db.siteSettings.ogImageId) ?? null
        : null,
    },
    heroImages,
    destinations,
    trips,
    galleryImages,
  };
}
