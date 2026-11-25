import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  DatabaseSchema,
  DestinationRecord,
  GalleryImageRecord,
  HeroImageRecord,
  ImageRecord,
  PublicSitePayload,
  SiteSettings,
  TripRecord,
  TripWithRelations,
} from '../src/shared/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let memoryCache: DatabaseSchema | null = null;

function createSeedDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  const images: ImageRecord[] = [
    {
      id: 'img-hero-dahab',
      provider: 'STATIC',
      publicId: 'seed/hero_dahab_redsea',
      url: '/src/assets/images/hero_dahab_redsea_1795599272813.jpg',
      width: 1408,
      height: 768,
      bytes: 280000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-hero-siwa',
      provider: 'STATIC',
      publicId: 'seed/hero_siwa_oasis',
      url: '/src/assets/images/hero_siwa_oasis_1795599273206.jpg',
      width: 1408,
      height: 768,
      bytes: 295000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-trip-dahab',
      provider: 'STATIC',
      publicId: 'seed/trip_dahab_snorkeling',
      url: '/src/assets/images/trip_dahab_snorkeling_1795599274928.jpg',
      width: 1280,
      height: 960,
      bytes: 260000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-trip-siwa',
      provider: 'STATIC',
      publicId: 'seed/trip_siwa_safari',
      url: '/src/assets/images/trip_siwa_safari_1795599273291.jpg',
      width: 1280,
      height: 960,
      bytes: 250000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-trip-alex',
      provider: 'STATIC',
      publicId: 'seed/trip_alexandria_corniche',
      url: '/src/assets/images/trip_alexandria_corniche_1795599275506.jpg',
      width: 1280,
      height: 960,
      bytes: 245000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-gallery-nuweiba',
      provider: 'STATIC',
      publicId: 'seed/gallery_nuweiba_camp',
      url: '/src/assets/images/gallery_nuweiba_camp_1795599275538.jpg',
      width: 1280,
      height: 960,
      bytes: 240000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-hero-catherine',
      provider: 'STATIC',
      publicId: 'seed/hero_saint_catherine_snow',
      url: '/src/assets/images/hero_saint_catherine_snow_1795616932524.jpg',
      width: 1408,
      height: 768,
      bytes: 310000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-hero-siwa-4x4',
      provider: 'STATIC',
      publicId: 'seed/hero_siwa_4x4',
      url: '/src/assets/images/hero_siwa_4x4_1795616932838.jpg',
      width: 1408,
      height: 768,
      bytes: 295000,
      format: 'jpg',
      createdAt: now,
    },
    {
      id: 'img-hero-farsha',
      provider: 'STATIC',
      publicId: 'seed/hero_farsha_sharm',
      url: '/src/assets/images/hero_farsha_sharm_1795616934669.jpg',
      width: 1408,
      height: 768,
      bytes: 320000,
      format: 'jpg',
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
    users: [],
    sessions: [],
    loginAttempts: [],
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

export function getDb(): DatabaseSchema {
  if (memoryCache) {
    return memoryCache;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      memoryCache = JSON.parse(raw) as DatabaseSchema;
      return memoryCache;
    } catch (err) {
      console.error('Failed to read existing db.json, reinitializing seed:', err);
    }
  }
  memoryCache = createSeedDatabase();
  saveDb(memoryCache);
  return memoryCache;
}

export function saveDb(next: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = path.join(DATA_DIR, `db.${crypto.randomUUID()}.tmp.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
  memoryCache = next;
}

export function resetDbToSeed(): DatabaseSchema {
  const seeded = createSeedDatabase();
  // Preserve existing users & sessions when re-seeding content
  const existing = fs.existsSync(DB_PATH) ? getDb() : null;
  if (existing) {
    seeded.users = existing.users;
    seeded.sessions = existing.sessions;
  }
  saveDb(seeded);
  return seeded;
}

export function hydrateTrips(db: DatabaseSchema, includeUnpublished = false): TripWithRelations[] {
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

export function buildPublicPayload(db: DatabaseSchema): PublicSitePayload {
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
