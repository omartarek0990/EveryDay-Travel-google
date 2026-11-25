// @ts-nocheck

// server/app.ts
import "dotenv/config";
import express2 from "express";

// server/db.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var IS_SERVERLESS_READONLY = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var BUNDLED_DB_PATH = path.resolve(process.cwd(), "data", "db.json");
var DATA_DIR = IS_SERVERLESS_READONLY ? path.join("/tmp", "everyday-data") : path.resolve(process.cwd(), "data");
var DB_PATH = path.join(DATA_DIR, "db.json");
var memoryCache = null;
function createSeedDatabase() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const images = [
    {
      id: "img-hero-dahab",
      provider: "STATIC",
      publicId: "seed/hero_dahab_redsea",
      url: "/src/assets/images/hero_dahab_redsea_1795599272813.jpg",
      width: 1408,
      height: 768,
      bytes: 28e4,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-hero-siwa",
      provider: "STATIC",
      publicId: "seed/hero_siwa_oasis",
      url: "/src/assets/images/hero_siwa_oasis_1795599273206.jpg",
      width: 1408,
      height: 768,
      bytes: 295e3,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-trip-dahab",
      provider: "STATIC",
      publicId: "seed/trip_dahab_snorkeling",
      url: "/src/assets/images/trip_dahab_snorkeling_1795599274928.jpg",
      width: 1280,
      height: 960,
      bytes: 26e4,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-trip-siwa",
      provider: "STATIC",
      publicId: "seed/trip_siwa_safari",
      url: "/src/assets/images/trip_siwa_safari_1795599273291.jpg",
      width: 1280,
      height: 960,
      bytes: 25e4,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-trip-alex",
      provider: "STATIC",
      publicId: "seed/trip_alexandria_corniche",
      url: "/src/assets/images/trip_alexandria_corniche_1795599275506.jpg",
      width: 1280,
      height: 960,
      bytes: 245e3,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-gallery-nuweiba",
      provider: "STATIC",
      publicId: "seed/gallery_nuweiba_camp",
      url: "/src/assets/images/gallery_nuweiba_camp_1795599275538.jpg",
      width: 1280,
      height: 960,
      bytes: 24e4,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-hero-catherine",
      provider: "STATIC",
      publicId: "seed/hero_saint_catherine_snow",
      url: "/src/assets/images/hero_saint_catherine_snow_1795616932524.jpg",
      width: 1408,
      height: 768,
      bytes: 31e4,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-hero-siwa-4x4",
      provider: "STATIC",
      publicId: "seed/hero_siwa_4x4",
      url: "/src/assets/images/hero_siwa_4x4_1795616932838.jpg",
      width: 1408,
      height: 768,
      bytes: 295e3,
      format: "jpg",
      createdAt: now
    },
    {
      id: "img-hero-farsha",
      provider: "STATIC",
      publicId: "seed/hero_farsha_sharm",
      url: "/src/assets/images/hero_farsha_sharm_1795616934669.jpg",
      width: 1408,
      height: 768,
      bytes: 32e4,
      format: "jpg",
      createdAt: now
    }
  ];
  const siteSettings = {
    id: "default",
    companyName: { ar: "everyDay \u0644\u0644\u0633\u064A\u0627\u062D\u0629", en: "everyDay Travel Agency", enManual: true },
    logoImageId: null,
    faviconImageId: null,
    phone: "",
    whatsapp: "",
    email: "",
    address: { ar: "", en: "", enManual: true },
    mapUrl: "",
    tiktokUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    whatsappMessage: {
      ar: "\u0645\u0631\u062D\u0628\u0627\u064B\u060C \u0623\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0639\u0646 \u0631\u062D\u0644\u0629: {trip} {url}",
      en: "Hello, I would like to ask about this trip: {trip} {url}",
      enManual: true
    },
    seoTitle: {
      ar: "everyDay | \u0631\u062D\u0644\u0627\u062A \u062F\u0627\u062E\u0644 \u0645\u0635\u0631",
      en: "everyDay | Trips across Egypt",
      enManual: true
    },
    seoDescription: {
      ar: "\u0631\u062D\u0644\u0627\u062A \u0645\u0646\u0638\u0645\u0629 \u0644\u0623\u062C\u0645\u0644 \u0627\u0644\u0648\u062C\u0647\u0627\u062A \u062F\u0627\u062E\u0644 \u0645\u0635\u0631\u060C \u0628\u0628\u0631\u0627\u0645\u062C \u0648\u0627\u0636\u062D\u0629 \u064A\u0648\u0645 \u0628\u064A\u0648\u0645\u060C \u0639\u0634\u0627\u0646 \u062A\u0633\u0627\u0641\u0631 \u0648\u0627\u0646\u062A \u0645\u0637\u0645\u0651\u0646.",
      en: "Well-organized trips to the most beautiful destinations across Egypt, with clear day-by-day programs, so you can travel with peace of mind.",
      enManual: true
    },
    ogImageId: "img-hero-dahab",
    aboutTitle: { ar: "\u0645\u0646 \u0646\u062D\u0646", en: "About us", enManual: true },
    aboutBody: {
      ar: "\u0625\u062D\u0646\u0627 everyDay \u0644\u0644\u0633\u064A\u0627\u062D\u0629\u060C \u0634\u0631\u0643\u0629 \u0645\u062A\u062E\u0635\u0635\u0629 \u0641\u064A \u0627\u0644\u0631\u062D\u0644\u0627\u062A \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u062F\u0627\u062E\u0644 \u0645\u0635\u0631. \u0628\u0646\u062E\u062A\u0627\u0631 \u0627\u0644\u0648\u062C\u0647\u0627\u062A \u0648\u0646\u0631\u062A\u0628 \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0628\u0639\u0646\u0627\u064A\u0629\u060C \u0639\u0634\u0627\u0646 \u0643\u0644 \u0631\u062D\u0644\u0629 \u062A\u0628\u0642\u0649 \u062A\u062C\u0631\u0628\u0629 \u062A\u0633\u062A\u0627\u0647\u0644. \u0633\u0648\u0627\u0621 \u0628\u062A\u062F\u0648\u0631 \u0639\u0644\u0649 \u0647\u062F\u0648\u0621 \u0627\u0644\u0634\u0627\u0637\u0626 \u0623\u0648 \u0645\u063A\u0627\u0645\u0631\u0629 \u0641\u064A \u0627\u0644\u0635\u062D\u0631\u0627\u0621\u060C \u0647\u062A\u0644\u0627\u0642\u064A \u0639\u0646\u062F\u0646\u0627 \u0631\u062D\u0644\u0629 \u062A\u0646\u0627\u0633\u0628\u0643.",
      en: "We are everyDay Travel Agency, specialized in domestic trips across Egypt. We choose destinations and plan every program with care, so each trip is an experience worth having. Whether you want a quiet beach or a desert adventure, you will find a trip that suits you.",
      enManual: true
    },
    heroBadge: { ar: "\u0631\u062D\u0644\u0627\u062A \u062F\u0627\u062E\u0644 \u0645\u0635\u0631", en: "Trips across Egypt", enManual: true },
    heroTitle: { ar: "\u0643\u0644 \u064A\u0648\u0645 \u0631\u062D\u0644\u0629 \u062C\u062F\u064A\u062F\u0629", en: "Every day, a new journey", enManual: true },
    heroSubtitle: { ar: "\u0627\u0643\u062A\u0634\u0641 \u0645\u0635\u0631 \u0645\u0639 everyDay", en: "Discover Egypt with everyDay", enManual: true },
    heroDescription: {
      ar: "\u0631\u062D\u0644\u0627\u062A \u0645\u0646\u0638\u0645\u0629 \u0644\u0623\u062C\u0645\u0644 \u0627\u0644\u0648\u062C\u0647\u0627\u062A \u062F\u0627\u062E\u0644 \u0645\u0635\u0631\u060C \u0628\u0628\u0631\u0627\u0645\u062C \u0648\u0627\u0636\u062D\u0629 \u064A\u0648\u0645 \u0628\u064A\u0648\u0645\u060C \u0639\u0634\u0627\u0646 \u062A\u0633\u0627\u0641\u0631 \u0648\u0627\u0646\u062A \u0645\u0637\u0645\u0651\u0646.",
      en: "Well-organized trips to the most beautiful destinations across Egypt, with clear day-by-day programs, so you can travel with peace of mind.",
      enManual: true
    },
    heroFeatures: [
      { ar: "\u0648\u062C\u0647\u0627\u062A \u0645\u062A\u0646\u0648\u0639\u0629", en: "Diverse destinations", enManual: true },
      { ar: "\u0628\u0631\u0646\u0627\u0645\u062C \u0648\u0627\u0636\u062D \u0644\u0643\u0644 \u0631\u062D\u0644\u0629", en: "A clear program for every trip", enManual: true },
      { ar: "\u062A\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631 \u0645\u0639\u0646\u0627", en: "Direct contact with us", enManual: true }
    ],
    heroIntervalSeconds: 5,
    showTripsSection: true,
    showWhyUsSection: true,
    showGallerySection: true,
    showContactSection: true,
    whyUsItems: [
      {
        id: "why-1",
        title: { ar: "\u0628\u0631\u0627\u0645\u062C \u0648\u0627\u0636\u062D\u0629", en: "Clear programs", enManual: true },
        body: {
          ar: "\u0643\u0644 \u0631\u062D\u0644\u0629 \u0644\u064A\u0647\u0627 \u0628\u0631\u0646\u0627\u0645\u062C \u064A\u0648\u0645 \u0628\u064A\u0648\u0645\u060C \u0648\u0627\u0646\u062A \u0639\u0627\u0631\u0641 \u0647\u062A\u0639\u0645\u0644 \u0625\u064A\u0647.",
          en: "Every trip has a day-by-day program, so you always know what to expect.",
          enManual: true
        }
      },
      {
        id: "why-2",
        title: { ar: "\u0623\u0646\u0634\u0637\u0629 \u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629", en: "Optional activities", enManual: true },
        body: {
          ar: "\u0627\u062E\u062A\u0627\u0631 \u0627\u0644\u0644\u064A \u064A\u0646\u0627\u0633\u0628\u0643\u060C \u0648\u0643\u0644 \u0646\u0634\u0627\u0637 \u0645\u0648\u0636\u062D \u0625\u0646 \u0643\u0627\u0646 \u0645\u062C\u0627\u0646\u064A \u0623\u0648 \u0628\u0645\u0635\u0627\u0631\u064A\u0641 \u0625\u0636\u0627\u0641\u064A\u0629.",
          en: "Pick what suits you; each one is marked free or extra cost.",
          enManual: true
        }
      },
      {
        id: "why-3",
        title: { ar: "\u062A\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631", en: "Direct contact", enManual: true },
        body: {
          ar: "\u0627\u0633\u0623\u0644 \u0639\u0646 \u0623\u064A \u0631\u062D\u0644\u0629 \u0648\u0627\u062D\u0646\u0627 \u0646\u0631\u062F \u0639\u0644\u064A\u0643.",
          en: "Ask about any trip and we will get back to you.",
          enManual: true
        }
      }
    ],
    tripsIntro: {
      ar: "\u0631\u062D\u0644\u0627\u062A\u0646\u0627: \u0627\u062E\u062A\u0627\u0631 \u0627\u0644\u0648\u062C\u0647\u0629 \u0627\u0644\u0644\u064A \u062A\u0646\u0627\u0633\u0628\u0643 \u0648\u0627\u0643\u062A\u0634\u0641 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644.",
      en: "Our trips: choose the destination that suits you and explore the details.",
      enManual: true
    },
    galleryTitle: {
      ar: "\u0644\u062D\u0638\u0627\u062A \u0645\u0646 \u0631\u062D\u0644\u0627\u062A\u0646\u0627",
      en: "Moments from our trips",
      enManual: true
    },
    contactIntro: {
      ar: "\u0639\u0646\u062F\u0643 \u0633\u0624\u0627\u0644 \u0639\u0646 \u0631\u062D\u0644\u0629\u061F \u0643\u0644\u0645\u0646\u0627 \u0648\u0647\u0646\u0633\u0627\u0639\u062F\u0643 \u062A\u062E\u062A\u0627\u0631 \u0627\u0644\u0623\u0646\u0633\u0628 \u0644\u0643.",
      en: "Have a question about a trip? Message us and we will help you choose.",
      enManual: true
    },
    footerTagline: {
      ar: "everyDay \u0644\u0644\u0633\u064A\u0627\u062D\u0629\u060C \u0631\u062D\u0644\u0627\u062A \u062F\u0627\u062E\u0644 \u0645\u0635\u0631",
      en: "everyDay Travel Agency, trips across Egypt",
      enManual: true
    }
  };
  const heroImages = [
    { id: "hero-1", imageId: "img-hero-catherine", sortOrder: 0 },
    { id: "hero-2", imageId: "img-hero-siwa-4x4", sortOrder: 1 },
    { id: "hero-3", imageId: "img-hero-farsha", sortOrder: 2 }
  ];
  const destinations = [
    { id: "dest-dahab", slug: "dahab", name: { ar: "\u062F\u0647\u0628", en: "Dahab", enManual: true }, sortOrder: 0, isActive: true },
    { id: "dest-siwa", slug: "siwa", name: { ar: "\u0633\u064A\u0648\u0629", en: "Siwa", enManual: true }, sortOrder: 1, isActive: true },
    { id: "dest-sharm", slug: "sharm-el-sheikh", name: { ar: "\u0634\u0631\u0645 \u0627\u0644\u0634\u064A\u062E", en: "Sharm El Sheikh", enManual: true }, sortOrder: 2, isActive: true },
    { id: "dest-alex", slug: "alexandria", name: { ar: "\u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629", en: "Alexandria", enManual: true }, sortOrder: 3, isActive: true },
    { id: "dest-hurghada", slug: "hurghada", name: { ar: "\u0627\u0644\u063A\u0631\u062F\u0642\u0629", en: "Hurghada", enManual: true }, sortOrder: 4, isActive: true },
    { id: "dest-nuweiba", slug: "nuweiba", name: { ar: "\u0646\u0648\u064A\u0628\u0639", en: "Nuweiba", enManual: true }, sortOrder: 5, isActive: true }
  ];
  const trips = [
    {
      id: "trip-dahab-escape",
      slug: "dahab-red-sea-escape",
      title: {
        ar: "\u0631\u062D\u0644\u0629 \u062F\u0647\u0628: \u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0623\u062D\u0645\u0631 \u0648\u0627\u0644\u0644\u0627\u062C\u0648\u0646\u0627",
        en: "Dahab: Red Sea & Lagoon Escape",
        enManual: true
      },
      destinationId: "dest-dahab",
      tagline: {
        ar: "\u0623\u0631\u0628\u0639\u0629 \u0623\u064A\u0627\u0645 \u0645\u0646 \u0627\u0644\u0647\u062F\u0648\u0621 \u0648\u0627\u0644\u063A\u0637\u0633 \u0628\u064A\u0646 \u0627\u0644\u0634\u0639\u0627\u0628 \u0627\u0644\u0645\u0631\u062C\u0627\u0646\u064A\u0629 \u0648\u062C\u0628\u0627\u0644 \u0633\u064A\u0646\u0627\u0621",
        en: "Four calm days of snorkeling coral reefs framed by Sinai mountains",
        enManual: true
      },
      badge: { ar: "\u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B", en: "Popular choice", enManual: true },
      features: [
        { ar: "\u0625\u0642\u0627\u0645\u0629 \u0641\u0646\u062F\u0642\u064A\u0629 \u0634\u0627\u0645\u0644\u0629 \u0627\u0644\u0625\u0641\u0637\u0627\u0631 \u0642\u0631\u064A\u0628\u0629 \u0645\u0646 \u0627\u0644\u0645\u0645\u0634\u0649", en: "Boutique stay with breakfast near the promenade", enManual: true },
        { ar: "\u0627\u0646\u062A\u0642\u0627\u0644\u0627\u062A \u0630\u0647\u0627\u0628 \u0648\u0639\u0648\u062F\u0629 \u0628\u0633\u064A\u0627\u0631\u0627\u062A \u0633\u064A\u0627\u062D\u064A\u0629 \u0645\u0643\u064A\u0641\u0629", en: "Round-trip air-conditioned coach transfers", enManual: true },
        { ar: "\u0631\u062D\u0644\u0629 \u0628\u062D\u0631\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u0628\u0644\u0648 \u0647\u0648\u0644 \u0648\u0627\u0644\u0644\u0627\u062C\u0648\u0646\u0627", en: "Guided visit to the Blue Hole and Lagoon", enManual: true }
      ],
      description: {
        ar: "\u0627\u0633\u062A\u0645\u062A\u0639 \u0628\u0623\u062C\u0648\u0627\u0621 \u062F\u0647\u0628 \u0627\u0644\u0628\u0633\u064A\u0637\u0629 \u0628\u064A\u0646 \u0627\u0644\u0628\u062D\u0631 \u0648\u0627\u0644\u062C\u0628\u0644.\n\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0645\u0646\u0627\u0633\u0628 \u0644\u0645\u0646 \u064A\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0627\u0633\u062A\u0631\u062E\u0627\u0621 \u0648\u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0628\u062D\u0631\u064A\u0629 \u0641\u064A \u0646\u0641\u0633 \u0627\u0644\u0648\u0642\u062A\u060C \u0645\u0639 \u0623\u0648\u0642\u0627\u062A \u062D\u0631\u0629 \u0641\u064A \u0627\u0644\u0645\u0645\u0634\u0649 \u0648\u0645\u0633\u0627\u0621 \u0647\u0627\u062F\u0626 \u0641\u064A \u0627\u0644\u062C\u0628\u0644.",
        en: "Enjoy Dahab\u2019s laid-back rhythm where desert mountains meet turquoise water.\nDesigned for travelers who want relaxed beach mornings paired with optional reef and canyon excursions.",
        enManual: true
      },
      durationDays: 4,
      priceAmount: 4800,
      pricePrefix: "STARTING_FROM",
      priceUnit: "PER_PERSON",
      status: "PUBLISHED",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "trip-siwa-oasis",
      slug: "siwa-oasis-desert-retreat",
      title: {
        ar: "\u0633\u0641\u0627\u0631\u064A \u0648\u0627\u062D\u0629 \u0633\u064A\u0648\u0629 \u0648\u0628\u062D\u0631 \u0627\u0644\u0631\u0645\u0627\u0644 \u0627\u0644\u0623\u0639\u0638\u0645",
        en: "Siwa Oasis & Great Sand Sea Retreat",
        enManual: true
      },
      destinationId: "dest-siwa",
      tagline: {
        ar: "\u062A\u062C\u0631\u0628\u0629 \u0635\u062D\u0631\u0627\u0648\u064A\u0629 \u0623\u0635\u064A\u0644\u0629 \u0628\u064A\u0646 \u0628\u062D\u064A\u0631\u0627\u062A \u0627\u0644\u0645\u0644\u062D \u0648\u0627\u0644\u0639\u064A\u0648\u0646 \u0627\u0644\u0643\u0628\u0631\u064A\u062A\u064A\u0629",
        en: "An authentic desert journey across salt lakes and warm springs",
        enManual: true
      },
      badge: { ar: "\u0645\u0648\u0633\u0645 \u0627\u0644\u0634\u062A\u0627\u0621", en: "Winter season", enManual: true },
      features: [
        { ar: "\u0625\u0642\u0627\u0645\u0629 \u0641\u064A \u0646\u064F\u0632\u0644 \u0628\u064A\u0626\u064A \u0639\u0644\u0649 \u0627\u0644\u0637\u0631\u0627\u0632 \u0627\u0644\u0633\u064A\u0648\u064A", en: "Eco-lodge stay built in traditional Siwan style", enManual: true },
        { ar: "\u0632\u064A\u0627\u0631\u0629 \u0642\u0644\u0639\u0629 \u0634\u0627\u0644\u064A \u0648\u0645\u0639\u0628\u062F \u0622\u0645\u0648\u0646 \u0648\u062C\u0628\u0644 \u0627\u0644\u0645\u0648\u062A\u0649", en: "Guided visits to Shali Fortress and Amun Temple", enManual: true },
        { ar: "\u0633\u0641\u0627\u0631\u064A 4x4 \u0641\u064A \u0628\u062D\u0631 \u0627\u0644\u0631\u0645\u0627\u0644 \u0627\u0644\u0623\u0639\u0638\u0645 \u0645\u0639 \u063A\u0631\u0648\u0628 \u0627\u0644\u0634\u0645\u0633", en: "4x4 sunset safari into the Great Sand Sea", enManual: true }
      ],
      description: {
        ar: "\u0627\u0643\u062A\u0634\u0641 \u0647\u062F\u0648\u0621 \u0648\u0627\u062D\u0629 \u0633\u064A\u0648\u0629 \u0627\u0644\u0628\u0639\u064A\u062F\u0629 \u0639\u0646 \u0635\u062E\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629.\n\u0628\u0631\u0646\u0627\u0645\u062C \u0645\u062A\u0643\u0627\u0645\u0644 \u064A\u062C\u0645\u0639 \u0628\u064A\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0633\u064A\u0648\u064A\u060C \u0648\u0627\u0644\u0633\u0628\u0627\u062D\u0629 \u0641\u064A \u0628\u062D\u064A\u0631\u0627\u062A \u0627\u0644\u0645\u0644\u062D \u0627\u0644\u0635\u0627\u0641\u064A\u0629\u060C \u0648\u0633\u0647\u0631\u0629 \u0628\u062F\u0648\u064A\u0629 \u062A\u062D\u062A \u0627\u0644\u0646\u062C\u0648\u0645.",
        en: "Step away from city noise into the calm palm groves of Siwa Oasis.\nOur itinerary blends ancient Siwan heritage, floating in crystalline salt lakes, and starlit desert evenings.",
        enManual: true
      },
      durationDays: 3,
      priceAmount: 5500,
      pricePrefix: "STARTING_FROM",
      priceUnit: "PER_PERSON",
      status: "PUBLISHED",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "trip-alexandria-heritage",
      slug: "alexandria-coastal-heritage",
      title: {
        ar: "\u0639\u0637\u0644\u0629 \u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629: \u0627\u0644\u0643\u0648\u0631\u0646\u064A\u0634 \u0648\u0642\u0644\u0639\u0629 \u0642\u0627\u064A\u062A\u0628\u0627\u064A",
        en: "Alexandria Coastal Heritage Weekend",
        enManual: true
      },
      destinationId: "dest-alex",
      tagline: {
        ar: "\u064A\u0648\u0645\u0627\u0646 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0645\u062A\u0648\u0633\u0637 \u0628\u064A\u0646 \u0627\u0644\u0645\u0639\u0627\u0644\u0645 \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629 \u0648\u0627\u0644\u0643\u0648\u0631\u0646\u064A\u0634",
        en: "Two Mediterranean days exploring historic landmarks and the Corniche",
        enManual: true
      },
      badge: null,
      features: [
        { ar: "\u062C\u0648\u0644\u0629 \u0641\u064A \u0642\u0644\u0639\u0629 \u0642\u0627\u064A\u062A\u0628\u0627\u064A \u0648\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629", en: "Guided tour of Qaitbay Citadel and Bibliotheca Alexandrina", enManual: true },
        { ar: "\u0625\u0642\u0627\u0645\u0629 \u0644\u064A\u0644\u0629 \u0645\u0637\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631 \u0634\u0627\u0645\u0644\u0629 \u0627\u0644\u0625\u0641\u0637\u0627\u0631", en: "Sea-view overnight stay including breakfast", enManual: true },
        { ar: "\u0648\u0642\u062A \u062D\u0631 \u0644\u0644\u062A\u0645\u0634\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u0643\u0648\u0631\u0646\u064A\u0634 \u0648\u0648\u0633\u0637 \u0627\u0644\u0628\u0644\u062F", en: "Free evening walk along the Corniche and downtown", enManual: true }
      ],
      description: {
        ar: "\u0631\u062D\u0644\u0629 \u062E\u0641\u064A\u0641\u0629 \u0644\u0639\u0637\u0644\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0641\u064A \u0639\u0631\u0648\u0633 \u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0645\u062A\u0648\u0633\u0637.\n\u062A\u0646\u0627\u0633\u0628 \u0627\u0644\u0639\u0627\u0626\u0644\u0627\u062A \u0648\u0627\u0644\u0623\u0635\u062F\u0642\u0627\u0621 \u0645\u0639 \u062C\u062F\u0648\u0644 \u0645\u0631\u064A\u062D \u064A\u063A\u0637\u064A \u0623\u0647\u0645 \u0627\u0644\u0645\u0639\u0627\u0644\u0645 \u062F\u0648\u0646 \u0627\u0633\u062A\u0639\u062C\u0627\u0644.",
        en: "An easygoing weekend escape to Egypt\u2019s Mediterranean jewel.\nCrafted for families and friends with a unhurried schedule covering iconic landmarks.",
        enManual: true
      },
      durationDays: 2,
      priceAmount: 2400,
      pricePrefix: "NONE",
      priceUnit: "PER_PERSON",
      status: "PUBLISHED",
      sortOrder: 2,
      createdAt: now,
      updatedAt: now
    }
  ];
  const tripImages = [
    { id: "ti-1", tripId: "trip-dahab-escape", imageId: "img-trip-dahab", sortOrder: 0 },
    { id: "ti-2", tripId: "trip-dahab-escape", imageId: "img-hero-dahab", sortOrder: 1 },
    { id: "ti-3", tripId: "trip-dahab-escape", imageId: "img-gallery-nuweiba", sortOrder: 2 },
    { id: "ti-4", tripId: "trip-siwa-oasis", imageId: "img-trip-siwa", sortOrder: 0 },
    { id: "ti-5", tripId: "trip-siwa-oasis", imageId: "img-hero-siwa", sortOrder: 1 },
    { id: "ti-6", tripId: "trip-alexandria-heritage", imageId: "img-trip-alex", sortOrder: 0 }
  ];
  const itineraryDays = [
    {
      id: "it-dahab-1",
      tripId: "trip-dahab-escape",
      sortOrder: 0,
      title: { ar: "\u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u062A\u0633\u0643\u064A\u0646 \u0648\u062C\u0648\u0644\u0629 \u0627\u0644\u0645\u0645\u0634\u0649", en: "Arrival, check-in & promenade stroll", enManual: true },
      description: {
        ar: "\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u062F\u0647\u0628 \u0635\u0628\u0627\u062D\u0627\u064B\u060C \u0627\u0644\u062A\u0633\u0643\u064A\u0646 \u0641\u064A \u0627\u0644\u0641\u0646\u062F\u0642\u060C \u0648\u0642\u062A \u0644\u0644\u0631\u0627\u062D\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0637\u0626\u060C \u0648\u062C\u0648\u0644\u0629 \u0645\u0633\u0627\u0626\u064A\u0629 \u062D\u0631\u0629 \u0641\u064A \u0627\u0644\u0645\u0645\u0634\u0649.",
        en: "Arrive in Dahab in the morning, check in to the hotel, unwind by the shore, and enjoy an unhurried evening walk along the promenade.",
        enManual: true
      }
    },
    {
      id: "it-dahab-2",
      tripId: "trip-dahab-escape",
      sortOrder: 1,
      title: { ar: "\u0627\u0644\u0628\u0644\u0648 \u0647\u0648\u0644 \u0648\u0627\u0644\u0644\u0627\u062C\u0648\u0646\u0627", en: "Blue Hole snorkeling & Lagoon sunset", enManual: true },
      description: {
        ar: "\u0627\u0644\u062A\u062D\u0631\u0643 \u0635\u0628\u0627\u062D\u0627\u064B \u0625\u0644\u0649 \u0645\u062D\u0645\u064A\u0629 \u0627\u0644\u0628\u0644\u0648 \u0647\u0648\u0644 \u0644\u0644\u0627\u0633\u062A\u0645\u062A\u0627\u0639 \u0628\u0627\u0644\u0633\u0628\u0627\u062D\u0629 \u0648\u0627\u0644\u0633\u0646\u0648\u0631\u0643\u0644\u064A\u0646\u062C\u060C \u062B\u0645 \u0627\u0644\u062A\u0648\u062C\u0647 \u0625\u0644\u0649 \u0627\u0644\u0644\u0627\u062C\u0648\u0646\u0627 \u0648\u0642\u062A \u0627\u0644\u063A\u0631\u0648\u0628.",
        en: "Morning departure to the Blue Hole marine reserve for snorkeling, followed by sunset views at Dahab Lagoon.",
        enManual: true
      }
    },
    {
      id: "it-dahab-3",
      tripId: "trip-dahab-escape",
      sortOrder: 2,
      title: { ar: "\u064A\u0648\u0645 \u062D\u0631 \u0623\u0648 \u0631\u062D\u0644\u0629 \u0648\u0627\u062F\u064A \u0627\u0644\u0648\u0634\u0648\u0627\u0634", en: "Free beach day or Wadi El Weshwash", enManual: true },
      description: {
        ar: "\u064A\u0648\u0645 \u0645\u0641\u062A\u0648\u062D \u0644\u0644\u0627\u0633\u062A\u0631\u062E\u0627\u0621 \u0623\u0648 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629 \u0641\u064A \u0627\u0644\u062C\u0628\u0644 \u0648\u0627\u0644\u0628\u062D\u0631.",
        en: "An open day to relax by the sea or join optional canyon and marine excursions.",
        enManual: true
      }
    },
    {
      id: "it-dahab-4",
      tripId: "trip-dahab-escape",
      sortOrder: 3,
      title: { ar: "\u0627\u0644\u0625\u0641\u0637\u0627\u0631 \u0648\u0627\u0644\u0639\u0648\u062F\u0629", en: "Breakfast & return journey", enManual: true },
      description: {
        ar: "\u0627\u0644\u0625\u0641\u0637\u0627\u0631 \u0641\u064A \u0627\u0644\u0641\u0646\u062F\u0642\u060C \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u063A\u0627\u062F\u0631\u0629\u060C \u0648\u0627\u0644\u062A\u062D\u0631\u0643 \u0644\u0644\u0639\u0648\u062F\u0629 \u0645\u0633\u0627\u0621\u064B.",
        en: "Breakfast at the hotel, check-out, and comfortable return transfer.",
        enManual: true
      }
    },
    {
      id: "it-siwa-1",
      tripId: "trip-siwa-oasis",
      sortOrder: 0,
      title: { ar: "\u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0628\u062D\u064A\u0631\u0627\u062A \u0627\u0644\u0645\u0644\u062D", en: "Arrival & Salt Lakes float", enManual: true },
      description: {
        ar: "\u0627\u0644\u062A\u0633\u0643\u064A\u0646 \u0641\u064A \u0627\u0644\u0646\u064F\u0632\u0644 \u0627\u0644\u0633\u064A\u0648\u064A \u062B\u0645 \u0627\u0644\u062A\u0648\u062C\u0647 \u0644\u0644\u0633\u0628\u0627\u062D\u0629 \u0641\u064A \u0628\u062D\u064A\u0631\u0627\u062A \u0627\u0644\u0645\u0644\u062D \u0648\u0632\u064A\u0627\u0631\u0629 \u0639\u064A\u0646 \u0643\u0644\u064A\u0648\u0628\u0627\u062A\u0631\u0627.",
        en: "Settle into the Siwan eco-lodge, then visit the crystal salt lakes and Cleopatra\u2019s Spring.",
        enManual: true
      }
    },
    {
      id: "it-siwa-2",
      tripId: "trip-siwa-oasis",
      sortOrder: 1,
      title: { ar: "\u0642\u0644\u0639\u0629 \u0634\u0627\u0644\u064A \u0648\u0633\u0641\u0627\u0631\u064A \u0628\u062D\u0631 \u0627\u0644\u0631\u0645\u0627\u0644", en: "Shali Fortress & Great Sand Sea safari", enManual: true },
      description: {
        ar: "\u062C\u0648\u0644\u0629 \u0635\u0628\u0627\u062D\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0639\u0627\u0644\u0645 \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629\u060C \u0648\u0628\u062F\u0627\u064A\u0629 \u0631\u062D\u0644\u0629 \u0627\u0644\u0633\u0641\u0627\u0631\u064A \u0628\u0633\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0631\u0628\u0627\u0639\u064A \u0642\u0628\u0644 \u0627\u0644\u063A\u0631\u0648\u0628.",
        en: "Morning heritage tour followed by an afternoon 4x4 dune adventure and sunset tea in the desert.",
        enManual: true
      }
    },
    {
      id: "it-siwa-3",
      tripId: "trip-siwa-oasis",
      sortOrder: 2,
      title: { ar: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0633\u064A\u0648\u064A \u0648\u0627\u0644\u0639\u0648\u062F\u0629", en: "Siwa market & departure", enManual: true },
      description: {
        ar: "\u0648\u0642\u062A \u062D\u0631 \u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u062A\u0645\u0648\u0631 \u0648\u0632\u064A\u062A \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0627\u0644\u0633\u064A\u0648\u064A \u062B\u0645 \u0627\u0644\u0639\u0648\u062F\u0629.",
        en: "Morning stroll through the local market for dates and olive oil before heading back.",
        enManual: true
      }
    },
    {
      id: "it-alex-1",
      tripId: "trip-alexandria-heritage",
      sortOrder: 0,
      title: { ar: "\u0642\u0644\u0639\u0629 \u0642\u0627\u064A\u062A\u0628\u0627\u064A \u0648\u0627\u0644\u0645\u0643\u062A\u0628\u0629", en: "Qaitbay Citadel & Bibliotheca", enManual: true },
      description: {
        ar: "\u0632\u064A\u0627\u0631\u0629 \u0642\u0644\u0639\u0629 \u0642\u0627\u064A\u062A\u0628\u0627\u064A \u0645\u0637\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u064A\u0646\u0627\u0621 \u0627\u0644\u0634\u0631\u0642\u064A\u060C \u062B\u0645 \u062C\u0648\u0644\u0629 \u0641\u064A \u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629.",
        en: "Explore Qaitbay Citadel overlooking the Eastern Harbor followed by a visit to the Bibliotheca Alexandrina.",
        enManual: true
      }
    },
    {
      id: "it-alex-2",
      tripId: "trip-alexandria-heritage",
      sortOrder: 1,
      title: { ar: "\u062D\u062F\u0627\u0626\u0642 \u0627\u0644\u0645\u0646\u062A\u0632\u0647 \u0648\u0627\u0644\u0639\u0648\u062F\u0629", en: "Montaza Gardens & return", enManual: true },
      description: {
        ar: "\u0635\u0628\u0627\u062D \u0647\u0627\u062F\u0626 \u0641\u064A \u062D\u062F\u0627\u0626\u0642 \u0627\u0644\u0645\u0646\u062A\u0632\u0647 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0645\u062A\u0648\u0633\u0637 \u062B\u0645 \u0627\u0644\u0639\u0648\u062F\u0629 \u0645\u0633\u0627\u0621\u064B.",
        en: "A peaceful morning walk through Montaza Palace gardens before returning.",
        enManual: true
      }
    }
  ];
  const optionalActivities = [
    {
      id: "act-dahab-1",
      tripId: "trip-dahab-escape",
      sortOrder: 0,
      title: { ar: "\u0633\u0647\u0631\u0629 \u062C\u0628\u0644 \u0627\u0644\u0637\u0648\u064A\u0644\u0627\u062A", en: "El-Tawilat mountain stargazing night", enManual: true },
      description: { ar: "\u062C\u0644\u0633\u0629 \u0628\u062F\u0648\u064A\u0629 \u0647\u0627\u062F\u0626\u0629 \u0641\u064A \u0642\u0644\u0628 \u0627\u0644\u062C\u0628\u0644 \u0645\u0639 \u0627\u0644\u0634\u0627\u064A \u0627\u0644\u0628\u062F\u0648\u064A.", en: "Bedouin tea evening nestled between Sinai peaks.", enManual: true },
      pricing: "FREE",
      priceAmount: null
    },
    {
      id: "act-dahab-2",
      tripId: "trip-dahab-escape",
      sortOrder: 1,
      title: { ar: "\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u063A\u0637\u0633 (Intro Dive)", en: "Introductory scuba dive", enManual: true },
      description: { ar: "\u063A\u0637\u0633\u0629 \u0628\u0631\u0641\u0642\u0629 \u0645\u062F\u0631\u0628 \u0645\u0639\u062A\u0645\u062F \u0648\u0645\u0639\u062F\u0627\u062A \u0643\u0627\u0645\u0644\u0629.", en: "Guided shore dive with certified instructor and gear.", enManual: true },
      pricing: "EXTRA_COST",
      priceAmount: 950
    },
    {
      id: "act-siwa-1",
      tripId: "trip-siwa-oasis",
      sortOrder: 0,
      title: { ar: "\u0627\u0644\u062A\u0632\u062D\u0644\u0642 \u0639\u0644\u0649 \u0627\u0644\u0631\u0645\u0627\u0644 (Sandboarding)", en: "Desert sandboarding", enManual: true },
      description: { ar: "\u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0623\u0644\u0648\u0627\u062D \u0639\u0644\u0649 \u0627\u0644\u0643\u062B\u0628\u0627\u0646 \u0627\u0644\u0631\u0645\u0644\u064A\u0629 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0633\u0641\u0627\u0631\u064A.", en: "Boards provided on the dunes during the 4x4 safari.", enManual: true },
      pricing: "FREE",
      priceAmount: null
    },
    {
      id: "act-siwa-2",
      tripId: "trip-siwa-oasis",
      sortOrder: 1,
      title: { ar: "\u0639\u0634\u0627\u0621 \u0633\u064A\u0648\u064A \u062A\u0642\u0644\u064A\u062F\u064A \u0641\u064A \u0627\u0644\u0643\u0627\u0645\u0628", en: "Traditional Siwan desert dinner", enManual: true },
      description: { ar: "\u0648\u062C\u0628\u0629 \u0637\u0627\u0632\u062C\u0629 \u0645\u0637\u0647\u0648\u0629 \u0639\u0644\u0649 \u0627\u0644\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u062E\u064A\u0645 \u0627\u0644\u0635\u062D\u0631\u0627\u0648\u064A.", en: "Freshly prepared local dishes at the desert camp.", enManual: true },
      pricing: "EXTRA_COST",
      priceAmount: null
    }
  ];
  const galleryImages = [
    {
      id: "gal-1",
      imageId: "img-hero-dahab",
      caption: { ar: "\u063A\u0631\u0648\u0628 \u0627\u0644\u0634\u0645\u0633 \u0639\u0644\u0649 \u062E\u0644\u064A\u062C \u062F\u0647\u0628 \u0648\u062C\u0628\u0627\u0644 \u0633\u064A\u0646\u0627\u0621", en: "Sunset over Dahab Bay and Sinai mountains", enManual: true },
      sortOrder: 0,
      createdAt: now
    },
    {
      id: "gal-2",
      imageId: "img-hero-siwa",
      caption: { ar: "\u0628\u062D\u064A\u0631\u0627\u062A \u0627\u0644\u0645\u0644\u062D \u0648\u0646\u062E\u064A\u0644 \u0648\u0627\u062D\u0629 \u0633\u064A\u0648\u0629", en: "Salt lakes and palm groves in Siwa Oasis", enManual: true },
      sortOrder: 1,
      createdAt: now
    },
    {
      id: "gal-3",
      imageId: "img-trip-dahab",
      caption: { ar: "\u0627\u0644\u0645\u064A\u0627\u0647 \u0627\u0644\u0635\u0627\u0641\u064A\u0629 \u0648\u0627\u0644\u0634\u0639\u0627\u0628 \u0627\u0644\u0645\u0631\u062C\u0627\u0646\u064A\u0629 \u0641\u064A \u062F\u0647\u0628", en: "Turquoise coral lagoon in Dahab", enManual: true },
      sortOrder: 2,
      createdAt: now
    },
    {
      id: "gal-4",
      imageId: "img-trip-siwa",
      caption: { ar: "\u0643\u062B\u0628\u0627\u0646 \u0628\u062D\u0631 \u0627\u0644\u0631\u0645\u0627\u0644 \u0627\u0644\u0623\u0639\u0638\u0645 \u0648\u0642\u062A \u0627\u0644\u0645\u063A\u064A\u0628", en: "Great Sand Sea dunes at golden hour", enManual: true },
      sortOrder: 3,
      createdAt: now
    },
    {
      id: "gal-5",
      imageId: "img-trip-alex",
      caption: { ar: "\u0642\u0644\u0639\u0629 \u0642\u0627\u064A\u062A\u0628\u0627\u064A \u0648\u0643\u0648\u0631\u0646\u064A\u0634 \u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629", en: "Qaitbay Citadel along the Alexandria Corniche", enManual: true },
      sortOrder: 4,
      createdAt: now
    },
    {
      id: "gal-6",
      imageId: "img-gallery-nuweiba",
      caption: { ar: "\u0623\u062C\u0648\u0627\u0621 \u0627\u0644\u0645\u062E\u064A\u0645\u0627\u062A \u0627\u0644\u0647\u0627\u062F\u0626\u0629 \u0639\u0644\u0649 \u0634\u0627\u0637\u0626 \u0646\u0648\u064A\u0628\u0639", en: "Evening lanterns by the sea in Nuweiba", enManual: true },
      sortOrder: 5,
      createdAt: now
    }
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
    galleryImages
  };
}
function getDb() {
  if (memoryCache) {
    return memoryCache;
  }
  const candidatePaths = IS_SERVERLESS_READONLY ? [DB_PATH, BUNDLED_DB_PATH] : [DB_PATH];
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        memoryCache = JSON.parse(raw);
        return memoryCache;
      } catch (err) {
        console.error(`Failed to read db from ${candidate}:`, err);
      }
    }
  }
  memoryCache = createSeedDatabase();
  saveDb(memoryCache);
  return memoryCache;
}
function saveDb(next) {
  memoryCache = next;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = path.join(DATA_DIR, `db.${crypto.randomUUID()}.tmp.json`);
    fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), "utf-8");
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.warn("Unable to persist db.json to disk, keeping in-memory state:", err);
  }
}
function hydrateTrips(db, includeUnpublished = false) {
  const imageMap = new Map(db.images.map((img) => [img.id, img]));
  const destMap = new Map(db.destinations.map((d) => [d.id, d]));
  return [...db.trips].filter((trip) => includeUnpublished || trip.status === "PUBLISHED").sort((a, b) => a.sortOrder - b.sortOrder).map((trip) => {
    const images = db.tripImages.filter((ti) => ti.tripId === trip.id).sort((a, b) => a.sortOrder - b.sortOrder).map((ti) => ({ ...ti, image: imageMap.get(ti.imageId) })).filter((ti) => Boolean(ti.image));
    const itinerary = db.itineraryDays.filter((d) => d.tripId === trip.id).sort((a, b) => a.sortOrder - b.sortOrder);
    const optionalActivities = db.optionalActivities.filter((a) => a.tripId === trip.id).sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      ...trip,
      destination: destMap.get(trip.destinationId) ?? null,
      images,
      itinerary,
      optionalActivities
    };
  });
}
function buildPublicPayload(db) {
  const imageMap = new Map(db.images.map((img) => [img.id, img]));
  const heroImages = [...db.heroImages].sort((a, b) => a.sortOrder - b.sortOrder).map((hi) => ({ ...hi, image: imageMap.get(hi.imageId) })).filter((hi) => Boolean(hi.image));
  const destinations = [...db.destinations].filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const trips = hydrateTrips(db, false);
  const galleryImages = [...db.galleryImages].sort((a, b) => a.sortOrder - b.sortOrder).map((gi) => ({ ...gi, image: imageMap.get(gi.imageId) })).filter((gi) => Boolean(gi.image));
  return {
    settings: {
      ...db.siteSettings,
      logoImage: db.siteSettings.logoImageId ? imageMap.get(db.siteSettings.logoImageId) ?? null : null,
      faviconImage: db.siteSettings.faviconImageId ? imageMap.get(db.siteSettings.faviconImageId) ?? null : null,
      ogImage: db.siteSettings.ogImageId ? imageMap.get(db.siteSettings.ogImageId) ?? null : null
    },
    heroImages,
    destinations,
    trips,
    galleryImages
  };
}

// server/routes.ts
import crypto4 from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
import express from "express";
import { z as z2 } from "zod";

// server/auth.ts
import crypto2 from "node:crypto";
import bcrypt from "bcryptjs";
var BCRYPT_COST = 12;
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var SESSION_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var LOCKOUT_WINDOW_MS = 15 * 60 * 1e3;
var MAX_LOGIN_FAILURES = 5;
var DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.W0zQ6n4q5R7sT8uV9wX0yZ1aB2cD3e.";
var SESSION_COOKIE_NAME = "__Host-session";
var FALLBACK_COOKIE_NAME = "ed_session";
function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}
function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
async function runDummyHashCheck(password) {
  await bcrypt.compare(password, DUMMY_HASH);
}
function hashSessionToken(token) {
  return crypto2.createHash("sha256").update(token).digest("hex");
}
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}
function getAttemptKey(username, ip) {
  return crypto2.createHash("sha256").update(`${username.toLowerCase().trim()}|${ip}`).digest("hex");
}
function isLoginLocked(username, ip) {
  const db = getDb();
  const key = getAttemptKey(username, ip);
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS;
  const recentFailures = db.loginAttempts.filter(
    (a) => a.key === key && new Date(a.createdAt).getTime() >= cutoff
  );
  return recentFailures.length >= MAX_LOGIN_FAILURES;
}
function recordFailedLogin(username, ip) {
  const db = getDb();
  const key = getAttemptKey(username, ip);
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS;
  db.loginAttempts = db.loginAttempts.filter(
    (a) => new Date(a.createdAt).getTime() >= cutoff
  );
  db.loginAttempts.push({
    id: crypto2.randomUUID(),
    key,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  saveDb(db);
}
function clearFailedLogins(username, ip) {
  const db = getDb();
  const key = getAttemptKey(username, ip);
  db.loginAttempts = db.loginAttempts.filter((a) => a.key !== key);
  saveDb(db);
}
function createSessionForUser(userId) {
  const db = getDb();
  const token = crypto2.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  db.sessions.push({
    id: crypto2.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    lastRefreshedAt: new Date(now).toISOString(),
    createdAt: new Date(now).toISOString()
  });
  saveDb(db);
  return { token, expiresAt };
}
function deleteSessionByToken(token) {
  const db = getDb();
  const tokenHash = hashSessionToken(token);
  db.sessions = db.sessions.filter((s) => s.tokenHash !== tokenHash);
  saveDb(db);
}
function deleteOtherSessions(userId, keepToken) {
  const db = getDb();
  const keepHash = keepToken ? hashSessionToken(keepToken) : null;
  db.sessions = db.sessions.filter(
    (s) => s.userId !== userId || keepHash !== null && s.tokenHash === keepHash
  );
  saveDb(db);
}
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}
function extractTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const bearer = auth.slice("Bearer ".length).trim();
    if (bearer) return { token: bearer, source: "bearer" };
  }
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME] || cookies[FALLBACK_COOKIE_NAME] || null;
  if (cookieToken) return { token: cookieToken, source: "cookie" };
  return { token: null, source: null };
}
function isSecureRequest(req) {
  const proto = req.headers["x-forwarded-proto"];
  return req.secure || proto === "https";
}
function setSessionCookie(req, res, token) {
  const secure = isSecureRequest(req);
  const maxAge = Math.floor(SESSION_TTL_MS / 1e3);
  if (secure) {
    const parts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      `Max-Age=${maxAge}`,
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Partitioned"
    ];
    res.setHeader("Set-Cookie", parts.join("; "));
  } else {
    const parts = [
      `${FALLBACK_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      `Max-Age=${maxAge}`,
      "HttpOnly",
      "SameSite=Lax"
    ];
    res.setHeader("Set-Cookie", parts.join("; "));
  }
}
function clearSessionCookie(req, res) {
  const secure = isSecureRequest(req);
  if (secure) {
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.setHeader(
      "Set-Cookie",
      `${FALLBACK_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
  }
}
function verifyMutationOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const expectedHost = req.headers["x-forwarded-host"] || req.headers.host;
  if (!expectedHost) return false;
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === expectedHost;
  } catch {
    return false;
  }
}
function requireOwner(req, res, next) {
  const { token, source } = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644." });
    return;
  }
  if (source === "cookie" && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (!verifyMutationOrigin(req)) {
      res.status(403).json({ error: "Origin mismatch" });
      return;
    }
  }
  const db = getDb();
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const session = db.sessions.find((s) => s.tokenHash === tokenHash);
  if (!session || new Date(session.expiresAt).getTime() <= now) {
    if (session) {
      db.sessions = db.sessions.filter((s) => s.id !== session.id);
      saveDb(db);
    }
    res.status(401).json({ error: "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u062C\u0644\u0633\u0629. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B." });
    return;
  }
  const user = db.users.find((u) => u.id === session.userId && u.role === "OWNER");
  if (!user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D." });
    return;
  }
  const lastRefreshed = new Date(session.lastRefreshedAt).getTime();
  if (now - lastRefreshed >= SESSION_REFRESH_INTERVAL_MS) {
    session.expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
    session.lastRefreshedAt = new Date(now).toISOString();
    saveDb(db);
  }
  req.ownerUser = user;
  req.sessionToken = token;
  next();
}

// server/storage.ts
import crypto3 from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
var IS_SERVERLESS_READONLY2 = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var LOCAL_UPLOAD_DIR = IS_SERVERLESS_READONLY2 ? path2.join("/tmp", "everyday-uploads") : path2.resolve(process.cwd(), "public", "uploads");
function getUploadTokenSecret() {
  return process.env.SESSION_SECRET || globalThis.__everydayUploadSecret || (globalThis.__everydayUploadSecret = crypto3.randomBytes(32).toString("hex"));
}
var CloudinaryStorage = class {
  constructor() {
    this.provider = "CLOUDINARY";
  }
  get config() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    return { cloudName, apiKey, apiSecret, uploadPreset };
  }
  signUpload(folder = "everyday") {
    const { cloudName, apiKey, apiSecret, uploadPreset } = this.config;
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const paramsToSign = {
      folder,
      timestamp,
      upload_preset: uploadPreset
    };
    const sortedString = Object.keys(paramsToSign).sort().map((k) => `${k}=${paramsToSign[k]}`).join("&");
    const signature = crypto3.createHash("sha1").update(`${sortedString}${apiSecret}`).digest("hex");
    return {
      provider: "CLOUDINARY",
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: {
        api_key: apiKey,
        timestamp,
        folder,
        upload_preset: uploadPreset,
        signature
      }
    };
  }
  async verify(publicId) {
    const { cloudName, apiKey, apiSecret } = this.config;
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) {
      throw new Error(`Cloudinary verification failed (${res.status})`);
    }
    const data = await res.json();
    return {
      provider: "CLOUDINARY",
      publicId: data.public_id,
      url: data.secure_url,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
      format: data.format
    };
  }
  async destroy(publicId) {
    if (publicId.startsWith("seed/") || publicId.startsWith("local/")) return;
    const { cloudName, apiKey, apiSecret } = this.config;
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const signature = crypto3.createHash("sha1").update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp,
      api_key: apiKey,
      signature
    });
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(8e3)
      });
      if (!res.ok) {
        console.error(`[ImageStorage] Cloudinary destroy failed for ${publicId}: ${res.status}`);
      }
    } catch (err) {
      console.error(`[ImageStorage] Cloudinary destroy error for ${publicId}:`, err);
    }
  }
  url(image, opts) {
    if (image.provider !== "CLOUDINARY") return image.url;
    const { cloudName } = this.config;
    const width = opts?.width ? Math.min(2560, Math.max(200, Math.round(opts.width))) : 1200;
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${width}/${image.publicId}`;
  }
};
var StaticStorage = class {
  constructor() {
    this.provider = "STATIC";
  }
  signUpload(folder = "everyday") {
    const exp = String(Date.now() + 5 * 60 * 1e3);
    const nonce = crypto3.randomBytes(12).toString("hex");
    const sig = crypto3.createHmac("sha256", getUploadTokenSecret()).update(`${folder}:${exp}:${nonce}`).digest("hex");
    return {
      provider: "STATIC",
      uploadUrl: "/api/uploads/local",
      fields: {
        folder,
        exp,
        nonce,
        signature: sig
      }
    };
  }
  verifyUploadSignature(fields) {
    const expNum = Number(fields.exp);
    if (!Number.isFinite(expNum) || Date.now() > expNum) return false;
    const expected = crypto3.createHmac("sha256", getUploadTokenSecret()).update(`${fields.folder}:${fields.exp}:${fields.nonce}`).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(fields.signature || "", "utf8");
    return a.length === b.length && crypto3.timingSafeEqual(a, b);
  }
  async verify(publicId) {
    if (!publicId.startsWith("local/")) {
      throw new Error("Invalid local publicId");
    }
    const fileName = publicId.slice("local/".length);
    const resolved = path2.resolve(LOCAL_UPLOAD_DIR, fileName);
    if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path2.sep) || !fs2.existsSync(resolved)) {
      throw new Error("Uploaded file not found");
    }
    const stat = fs2.statSync(resolved);
    const ext = path2.extname(fileName).replace(".", "").toLowerCase() || "jpg";
    return {
      provider: "STATIC",
      publicId,
      url: `/uploads/${fileName}`,
      width: 1600,
      height: 1200,
      bytes: stat.size,
      format: ext
    };
  }
  async destroy(publicId) {
    if (!publicId.startsWith("local/")) return;
    const fileName = publicId.slice("local/".length);
    const resolved = path2.resolve(LOCAL_UPLOAD_DIR, fileName);
    if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path2.sep)) return;
    try {
      if (fs2.existsSync(resolved)) {
        fs2.unlinkSync(resolved);
      }
    } catch (err) {
      console.error(`[ImageStorage] Static destroy error for ${publicId}:`, err);
    }
  }
  url(image) {
    return image.url;
  }
};
var staticStorage = new StaticStorage();
function getImageStorage() {
  const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME) && Boolean(process.env.CLOUDINARY_API_KEY) && Boolean(process.env.CLOUDINARY_API_SECRET) && Boolean(process.env.CLOUDINARY_UPLOAD_PRESET);
  if (hasCloudinary) {
    return new CloudinaryStorage();
  }
  return staticStorage;
}
function ensureLocalUploadDir() {
  if (!fs2.existsSync(LOCAL_UPLOAD_DIR)) {
    fs2.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  return LOCAL_UPLOAD_DIR;
}

// server/translation.ts
import { GoogleGenAI, Type } from "@google/genai";

// src/shared/translate-diff.ts
function prepareTranslationTasks(entries) {
  const tasks = [];
  const prepared = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const ar = entry.next.ar.trim();
    const en = entry.next.en.trim();
    const enManual = entry.force ? false : Boolean(entry.next.enManual);
    if (!ar) {
      prepared.set(entry.path, { ar: "", en: enManual ? en : "", enManual });
      continue;
    }
    const prevAr = entry.prev?.ar?.trim() ?? "";
    const arChanged = ar !== prevAr;
    const needsTranslation = entry.force || !enManual && (arChanged || en.length === 0);
    if (needsTranslation) {
      tasks.push({ path: entry.path, ar });
      prepared.set(entry.path, { ar, en, enManual: false });
    } else {
      prepared.set(entry.path, { ar, en, enManual });
    }
  }
  return {
    tasks,
    apply: (translatedMap, failedPaths) => {
      const out = /* @__PURE__ */ new Map();
      for (const [path4, base] of prepared.entries()) {
        if (translatedMap.has(path4)) {
          out.set(path4, {
            ar: base.ar,
            en: translatedMap.get(path4).trim(),
            enManual: false
          });
        } else if (failedPaths.has(path4)) {
          out.set(path4, {
            ar: base.ar,
            en: "",
            enManual: false
          });
        } else {
          out.set(path4, base);
        }
      }
      return out;
    }
  };
}

// server/translation.ts
var GoogleTranslateV2Provider = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.name = "google-v2";
  }
  async callApi(texts) {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: texts,
          source: "ar",
          target: "en",
          format: "text"
        }),
        signal: AbortSignal.timeout(8e3)
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Google Translate API HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }
    const data = await res.json();
    const items = data.data?.translations;
    if (!items || items.length !== texts.length) {
      throw new Error("Google Translate returned mismatched translation count");
    }
    return items.map((t) => t.translatedText);
  }
  async translate(texts) {
    if (texts.length === 0) return [];
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    try {
      const result = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Translated ${totalChars} chars (${texts.length} fields)`);
      return result;
    } catch (firstErr) {
      console.warn(`[Translation:${this.name}] First attempt failed, retrying once:`, firstErr);
      const retryResult = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Retry succeeded (${totalChars} chars)`);
      return retryResult;
    }
  }
};
var GeminiTranslateProvider = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.name = "gemini";
  }
  async callApi(texts) {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const prompt = [
      "Translate the following Egyptian/Modern Standard Arabic travel website texts into natural, concise, welcoming English.",
      'Return ONLY a JSON object matching the schema with a "translations" array of the exact same length and order.',
      "Preserve placeholders like {trip} and {url} untouched.",
      `Inputs JSON: ${JSON.stringify(texts)}`
    ].join("\n");
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["translations"]
          }
        }
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Gemini translation timeout")), 8e3)
      )
    ]);
    const parsed = JSON.parse(response.text || "{}");
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) {
      throw new Error("Gemini returned mismatched translation array");
    }
    return parsed.translations;
  }
  async translate(texts) {
    if (texts.length === 0) return [];
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    try {
      const result = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Translated ${totalChars} chars (${texts.length} fields)`);
      return result;
    } catch (firstErr) {
      console.warn(`[Translation:${this.name}] First attempt failed, retrying once:`, firstErr);
      const retryResult = await this.callApi(texts);
      console.info(`[Translation:${this.name}] Retry succeeded (${totalChars} chars)`);
      return retryResult;
    }
  }
};
function getTranslationProvider() {
  const configured = (process.env.TRANSLATION_PROVIDER || "").toLowerCase().trim();
  const googleKey = (process.env.GOOGLE_TRANSLATE_API_KEY || "").trim();
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (configured === "none") return null;
  if (configured === "google") {
    return googleKey ? new GoogleTranslateV2Provider(googleKey) : null;
  }
  if (configured === "gemini") {
    return geminiKey ? new GeminiTranslateProvider(geminiKey) : null;
  }
  if (googleKey) return new GoogleTranslateV2Provider(googleKey);
  if (geminiKey) return new GeminiTranslateProvider(geminiKey);
  return null;
}
async function translateEntriesBatch(entries) {
  const diff = prepareTranslationTasks(entries);
  if (diff.tasks.length === 0) {
    return {
      resolved: diff.apply(/* @__PURE__ */ new Map(), /* @__PURE__ */ new Set()),
      failedPaths: [],
      translatedChars: 0
    };
  }
  const provider = getTranslationProvider();
  if (!provider) {
    const failed = new Set(diff.tasks.map((t) => t.path));
    return {
      resolved: diff.apply(/* @__PURE__ */ new Map(), failed),
      failedPaths: Array.from(failed),
      translatedChars: 0
    };
  }
  const texts = diff.tasks.map((t) => t.ar);
  const translatedChars = texts.reduce((sum, t) => sum + t.length, 0);
  try {
    const results = await provider.translate(texts, { source: "ar", target: "en" });
    const translatedMap = /* @__PURE__ */ new Map();
    diff.tasks.forEach((task, i) => {
      translatedMap.set(task.path, results[i] ?? "");
    });
    return {
      resolved: diff.apply(translatedMap, /* @__PURE__ */ new Set()),
      failedPaths: [],
      translatedChars
    };
  } catch (err) {
    console.error("[Translation] Batch translation failed; saving Arabic with empty English:", err);
    const failed = new Set(diff.tasks.map((t) => t.path));
    return {
      resolved: diff.apply(/* @__PURE__ */ new Map(), failed),
      failedPaths: Array.from(failed),
      translatedChars: 0
    };
  }
}

// src/shared/schemas.ts
import { z } from "zod";
var localizedTextSchema = z.object({
  ar: z.string().trim(),
  en: z.string().trim(),
  enManual: z.boolean().default(false)
});
var optionalLocalizedTextSchema = z.object({
  ar: z.string().trim(),
  en: z.string().trim(),
  enManual: z.boolean().default(false)
}).nullable().optional();
var httpsUrlSchema = z.string().trim().refine(
  (val) => {
    if (!val) return true;
    try {
      const parsed = new URL(val);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0627\u0644\u0631\u0627\u0628\u0637 \u0628\u0640 https://" }
);
function normalizeEgyptianWhatsapp(input) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (/^01[0125]\d{8}$/.test(digits)) {
    return `2${digits}`;
  }
  if (/^201[0125]\d{8}$/.test(digits)) {
    return digits;
  }
  return "";
}
var egyptianPhoneInputSchema = z.string().trim().refine(
  (val) => {
    if (!val) return true;
    return normalizeEgyptianWhatsapp(val) !== "";
  },
  { message: "\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0645\u0635\u0631\u064A \u0635\u062D\u064A\u062D \u064A\u0628\u062F\u0623 \u0628\u0640 010 \u0623\u0648 011 \u0623\u0648 012 \u0623\u0648 015 (11 \u0631\u0642\u0645\u0627\u064B)" }
);
var COMMON_PASSWORDS = /* @__PURE__ */ new Set([
  "1234567890",
  "0123456789",
  "password123",
  "password1234",
  "admin12345",
  "admin123456",
  "qwerty1234",
  "qwertyuiop",
  "everyday123",
  "everyday2026",
  "letmein123",
  "welcome123"
]);
function validatePasswordStrength(password, username) {
  if (password.length < 10) {
    return "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 10 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644";
  }
  const lower = password.toLowerCase();
  if (username && lower.includes(username.toLowerCase()) && username.trim().length >= 3) {
    return "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0639\u0644\u0649 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645";
  }
  if (COMMON_PASSWORDS.has(lower)) {
    return "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0634\u0627\u0626\u0639\u0629 \u062C\u062F\u0627\u064B\u060C \u0627\u062E\u062A\u0631 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0623\u0642\u0648\u0649";
  }
  return null;
}
var loginSchema = z.object({
  username: z.string().trim().min(1, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628").max(64),
  password: z.string().min(1, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629").max(128)
});
var setupOwnerSchema = z.object({
  username: z.string().trim().toLowerCase().min(3, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 3 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").max(32).regex(/^[a-z0-9._-]+$/, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u064A\u0642\u0628\u0644 \u0623\u062D\u0631\u0641 \u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0648\u0623\u0631\u0642\u0627\u0645 \u0641\u0642\u0637"),
  password: z.string().min(10, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 10 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").max(128)
});
var changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629").max(128),
  newPassword: z.string().min(10, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 10 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").max(128)
});
var whyUsItemSchema = z.object({
  id: z.string().min(1),
  title: localizedTextSchema,
  body: localizedTextSchema
});
var updateHomeSettingsSchema = z.object({
  heroBadge: localizedTextSchema,
  heroTitle: localizedTextSchema,
  heroSubtitle: localizedTextSchema,
  heroDescription: localizedTextSchema,
  heroFeatures: z.array(localizedTextSchema).length(3),
  heroIntervalSeconds: z.number().int().min(3).max(15),
  showTripsSection: z.boolean(),
  showWhyUsSection: z.boolean(),
  showGallerySection: z.boolean(),
  showContactSection: z.boolean(),
  whyUsItems: z.array(whyUsItemSchema).max(4),
  heroImageIds: z.array(z.string().min(1))
});
var updateSiteSettingsSchema = z.object({
  companyName: localizedTextSchema,
  logoImageId: z.string().nullable(),
  faviconImageId: z.string().nullable(),
  phone: egyptianPhoneInputSchema,
  whatsapp: egyptianPhoneInputSchema,
  email: z.string().trim().refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"
  }),
  address: localizedTextSchema,
  mapUrl: httpsUrlSchema,
  tiktokUrl: httpsUrlSchema,
  facebookUrl: httpsUrlSchema,
  instagramUrl: httpsUrlSchema,
  whatsappMessage: localizedTextSchema,
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  ogImageId: z.string().nullable(),
  aboutTitle: localizedTextSchema,
  aboutBody: localizedTextSchema,
  tripsIntro: localizedTextSchema,
  galleryTitle: localizedTextSchema,
  contactIntro: localizedTextSchema,
  footerTagline: localizedTextSchema
});
var destinationInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "\u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u062C\u0628 \u0623\u0646 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0648\u0623\u0631\u0642\u0627\u0645 \u0648\u0634\u0631\u0637\u0627\u062A \u0641\u0642\u0637").optional(),
  name: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: "\u0627\u0633\u0645 \u0627\u0644\u0648\u062C\u0647\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u0637\u0644\u0648\u0628"
  }),
  isActive: z.boolean().default(true)
});
var itineraryDayInputSchema = z.object({
  id: z.string().optional(),
  title: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u064A\u0648\u0645 \u0645\u0637\u0644\u0648\u0628"
  }),
  description: localizedTextSchema
});
var optionalActivityInputSchema = z.object({
  id: z.string().optional(),
  title: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: "\u0627\u0633\u0645 \u0627\u0644\u0646\u0634\u0627\u0637 \u0645\u0637\u0644\u0648\u0628"
  }),
  description: localizedTextSchema,
  pricing: z.enum(["FREE", "EXTRA_COST"]),
  priceAmount: z.number().int().positive().nullable().optional()
});
var tripInputSchema = z.object({
  title: localizedTextSchema.refine((v) => v.ar.length > 0, {
    message: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0631\u062D\u0644\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u0637\u0644\u0648\u0628"
  }),
  destinationId: z.string().min(1, "\u0627\u062E\u062A\u0631 \u0627\u0644\u0648\u062C\u0647\u0629"),
  tagline: localizedTextSchema,
  badge: optionalLocalizedTextSchema,
  features: z.array(localizedTextSchema).min(0).max(4),
  description: localizedTextSchema,
  durationDays: z.number().int().positive().max(90).nullable().optional(),
  priceAmount: z.number().int().nonnegative().nullable().optional(),
  pricePrefix: z.enum(["NONE", "STARTING_FROM"]),
  priceUnit: z.enum(["PER_PERSON", "PER_TRIP", "NONE"]),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
  imageIds: z.array(z.string().min(1)),
  itinerary: z.array(itineraryDayInputSchema),
  optionalActivities: z.array(optionalActivityInputSchema)
}).superRefine((data, ctx) => {
  if (data.status === "PUBLISHED") {
    if (!data.title.ar.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title", "ar"],
        message: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628 \u0644\u0644\u0646\u0634\u0631"
      });
    }
    if (!data.destinationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationId"],
        message: "\u0627\u0644\u0648\u062C\u0647\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u0646\u0634\u0631"
      });
    }
    if (!data.tagline.ar.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tagline", "ar"],
        message: "\u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u062E\u062A\u0635\u0631 \u0645\u0637\u0644\u0648\u0628 \u0644\u0644\u0646\u0634\u0631"
      });
    }
    if (data.imageIds.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageIds"],
        message: "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0635\u0648\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631"
      });
    }
    const validFeatures = data.features.filter((f) => f.ar.trim().length > 0);
    if (validFeatures.length < 2 || validFeatures.length > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["features"],
        message: "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0646 2 \u0625\u0644\u0649 4 \u0645\u0645\u064A\u0632\u0627\u062A \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631"
      });
    }
  }
});

// src/shared/format.ts
function slugifyAscii(input, fallbackPrefix = "trip") {
  const cleaned = input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  if (cleaned) return cleaned;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${fallbackPrefix}-${rand}`;
}

// server/routes.ts
var ALLOWED_IMAGE_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
};
var signRateWindow = /* @__PURE__ */ new Map();
function checkSignRateLimit(key) {
  const now = Date.now();
  const entry = signRateWindow.get(key);
  if (!entry || entry.resetAt <= now) {
    signRateWindow.set(key, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= 40) return false;
  entry.count += 1;
  return true;
}
function isImageReferencedElsewhere(db, imageId, exclude) {
  if (db.siteSettings.logoImageId === imageId || db.siteSettings.faviconImageId === imageId || db.siteSettings.ogImageId === imageId) {
    return true;
  }
  if (db.heroImages.some((h) => h.imageId === imageId)) return true;
  if (db.tripImages.some((ti) => ti.imageId === imageId && ti.tripId !== exclude?.tripId)) {
    return true;
  }
  if (db.galleryImages.some((g) => g.imageId === imageId && g.id !== exclude?.galleryId)) {
    return true;
  }
  return false;
}
async function cleanupOrphanImages(imageIds) {
  const db = getDb();
  const storage = getImageStorage();
  const remaining = [];
  for (const img of db.images) {
    if (imageIds.includes(img.id) && !isImageReferencedElsewhere(db, img.id)) {
      await storage.destroy(img.publicId);
    } else {
      remaining.push(img);
    }
  }
  db.images = remaining;
  saveDb(db);
}
function createApiRouter() {
  const router = express.Router();
  router.get("/public/site", (_req, res) => {
    const db = getDb();
    res.json(buildPublicPayload(db));
  });
  router.get("/auth/me", (req, res) => {
    const db = getDb();
    const needsSetup = db.users.filter((u) => u.role === "OWNER").length === 0;
    let currentUser = null;
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie;
    let rawToken = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      rawToken = authHeader.slice("Bearer ".length).trim();
    } else if (cookieHeader) {
      for (const part of cookieHeader.split(";")) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        if (k === "__Host-session" || k === "ed_session") {
          rawToken = decodeURIComponent(v);
          break;
        }
      }
    }
    if (rawToken) {
      const tokenHash = crypto4.createHash("sha256").update(rawToken).digest("hex");
      const now = Date.now();
      const session = db.sessions.find(
        (s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > now
      );
      if (session) {
        const user = db.users.find((u) => u.id === session.userId && u.role === "OWNER");
        if (user) {
          currentUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            mustChangePassword: user.mustChangePassword
          };
        }
      }
    }
    res.json({ needsSetup, user: currentUser });
  });
  router.post("/auth/setup", async (req, res) => {
    const db = getDb();
    if (db.users.some((u) => u.role === "OWNER")) {
      res.status(409).json({ error: "\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0627\u0644\u0643 \u0628\u0627\u0644\u0641\u0639\u0644." });
      return;
    }
    const parsed = setupOwnerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const pwError = validatePasswordStrength(parsed.data.password, parsed.data.username);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const user = {
      id: crypto4.randomUUID(),
      username: parsed.data.username,
      passwordHash,
      role: "OWNER",
      mustChangePassword: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.users.push(user);
    saveDb(db);
    const { token } = createSessionForUser(user.id);
    setSessionCookie(req, res, token);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });
  });
  router.post("/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    const username = parsed.data.username.toLowerCase();
    const ip = getClientIp(req);
    if (isLoginLocked(username, ip)) {
      res.status(429).json({
        error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0639\u062F\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647\u0627. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 15 \u062F\u0642\u064A\u0642\u0629 \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u0627\u064B."
      });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.username === username && u.role === "OWNER");
    if (!user) {
      await runDummyHashCheck(parsed.data.password);
      recordFailedLogin(username, ip);
      res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(username, ip);
      res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    clearFailedLogins(username, ip);
    const { token } = createSessionForUser(user.id);
    setSessionCookie(req, res, token);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });
  });
  router.post("/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    } else if (req.headers.cookie) {
      for (const part of req.headers.cookie.split(";")) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        if (k === "__Host-session" || k === "ed_session") {
          token = decodeURIComponent(v);
          break;
        }
      }
    }
    if (token) {
      deleteSessionByToken(token);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });
  router.post("/auth/change-password", requireOwner, async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const user = req.ownerUser;
    const currentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!currentValid) {
      res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    const strengthError = validatePasswordStrength(parsed.data.newPassword, user.username);
    if (strengthError) {
      res.status(400).json({ error: strengthError });
      return;
    }
    const db = getDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    target.passwordHash = await hashPassword(parsed.data.newPassword);
    target.mustChangePassword = false;
    saveDb(db);
    deleteOtherSessions(user.id, req.sessionToken);
    res.json({ ok: true });
  });
  router.post("/uploads/sign", requireOwner, (req, res) => {
    const ip = getClientIp(req);
    if (!checkSignRateLimit(`${req.ownerUser.id}:${ip}`)) {
      res.status(429).json({ error: "\u0637\u0644\u0628\u0627\u062A \u0631\u0641\u0639 \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B. \u0627\u0646\u062A\u0638\u0631 \u062F\u0642\u064A\u0642\u0629 \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B." });
      return;
    }
    const folder = typeof req.body?.folder === "string" ? req.body.folder.replace(/[^a-z0-9/_-]/gi, "") : "everyday";
    const storage = getImageStorage();
    res.json(storage.signUpload(folder || "everyday"));
  });
  router.post(
    "/uploads/local",
    requireOwner,
    express.raw({ type: ["image/*", "application/octet-stream"], limit: "26mb" }),
    (req, res) => {
      const folder = String(req.headers["x-upload-folder"] || "everyday");
      const exp = String(req.headers["x-upload-exp"] || "");
      const nonce = String(req.headers["x-upload-nonce"] || "");
      const signature = String(req.headers["x-upload-signature"] || "");
      if (!staticStorage.verifyUploadSignature({ folder, exp, nonce, signature })) {
        res.status(403).json({ error: "\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0631\u0641\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629" });
        return;
      }
      const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      const ext = ALLOWED_IMAGE_MIME_TO_EXT[contentType];
      if (!ext) {
        res.status(400).json({ error: "\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645\u0629 (JPEG, PNG, WebP, HEIC \u0641\u0642\u0637)" });
        return;
      }
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0 || body.length > 25 * 1024 * 1024) {
        res.status(400).json({ error: "\u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0623\u0642\u0644 \u0645\u0646 25 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A" });
        return;
      }
      const uploadDir = ensureLocalUploadDir();
      const fileName = `${crypto4.randomUUID()}.${ext}`;
      const targetPath = path3.resolve(uploadDir, fileName);
      if (!targetPath.startsWith(uploadDir + path3.sep)) {
        res.status(400).json({ error: "\u0645\u0633\u0627\u0631 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
        return;
      }
      fs3.writeFileSync(targetPath, body);
      const width = Math.min(2560, Math.max(100, Number(req.headers["x-upload-width"]) || 1600));
      const height = Math.min(2560, Math.max(100, Number(req.headers["x-upload-height"]) || 1200));
      res.json({
        public_id: `local/${fileName}`,
        url: `/uploads/${fileName}`,
        width,
        height,
        bytes: body.length,
        format: ext
      });
    }
  );
  router.post("/uploads/verify", requireOwner, async (req, res) => {
    const schema = z2.object({
      publicId: z2.string().min(1),
      widthHint: z2.number().int().positive().max(2560).optional(),
      heightHint: z2.number().int().positive().max(2560).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    try {
      const storage = getImageStorage();
      const verified = await storage.verify(parsed.data.publicId);
      const image = {
        id: crypto4.randomUUID(),
        provider: verified.provider,
        publicId: verified.publicId,
        url: storage.url(
          { provider: verified.provider, publicId: verified.publicId, url: verified.url },
          { width: 1600 }
        ),
        width: verified.provider === "STATIC" && parsed.data.widthHint ? parsed.data.widthHint : verified.width,
        height: verified.provider === "STATIC" && parsed.data.heightHint ? parsed.data.heightHint : verified.height,
        bytes: verified.bytes,
        format: verified.format,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const db = getDb();
      db.images.push(image);
      saveDb(db);
      res.status(201).json({ image });
    } catch (err) {
      console.error("Image verify failed:", err);
      res.status(400).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629" });
    }
  });
  router.get("/admin/data", requireOwner, (_req, res) => {
    const db = getDb();
    const imageMap = new Map(db.images.map((i) => [i.id, i]));
    res.json({
      settings: {
        ...db.siteSettings,
        logoImage: db.siteSettings.logoImageId ? imageMap.get(db.siteSettings.logoImageId) ?? null : null,
        faviconImage: db.siteSettings.faviconImageId ? imageMap.get(db.siteSettings.faviconImageId) ?? null : null,
        ogImage: db.siteSettings.ogImageId ? imageMap.get(db.siteSettings.ogImageId) ?? null : null
      },
      heroImages: [...db.heroImages].sort((a, b) => a.sortOrder - b.sortOrder).map((h) => ({ ...h, image: imageMap.get(h.imageId) })).filter((h) => Boolean(h.image)),
      destinations: [...db.destinations].sort((a, b) => a.sortOrder - b.sortOrder),
      trips: hydrateTrips(db, true),
      galleryImages: [...db.galleryImages].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => ({ ...g, image: imageMap.get(g.imageId) })).filter((g) => Boolean(g.image)),
      images: db.images
    });
  });
  router.put("/admin/home", requireOwner, async (req, res) => {
    const parsed = updateHomeSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const forceFields = new Set(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const db = getDb();
    const prev = db.siteSettings;
    const input = parsed.data;
    const entries = [
      { path: "heroBadge", next: input.heroBadge, prev: prev.heroBadge, force: forceFields.has("heroBadge") },
      { path: "heroTitle", next: input.heroTitle, prev: prev.heroTitle, force: forceFields.has("heroTitle") },
      { path: "heroSubtitle", next: input.heroSubtitle, prev: prev.heroSubtitle, force: forceFields.has("heroSubtitle") },
      { path: "heroDescription", next: input.heroDescription, prev: prev.heroDescription, force: forceFields.has("heroDescription") }
    ];
    input.heroFeatures.forEach((f, idx) => {
      entries.push({
        path: `heroFeatures.${idx}`,
        next: f,
        prev: prev.heroFeatures[idx],
        force: forceFields.has(`heroFeatures.${idx}`)
      });
    });
    input.whyUsItems.forEach((item, idx) => {
      const prevItem = prev.whyUsItems.find((p) => p.id === item.id) || prev.whyUsItems[idx];
      entries.push(
        { path: `whyUs.${idx}.title`, next: item.title, prev: prevItem?.title, force: forceFields.has(`whyUs.${idx}.title`) },
        { path: `whyUs.${idx}.body`, next: item.body, prev: prevItem?.body, force: forceFields.has(`whyUs.${idx}.body`) }
      );
    });
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);
    const oldHeroIds = db.heroImages.map((h) => h.imageId);
    db.siteSettings = {
      ...prev,
      heroBadge: resolved.get("heroBadge"),
      heroTitle: resolved.get("heroTitle"),
      heroSubtitle: resolved.get("heroSubtitle"),
      heroDescription: resolved.get("heroDescription"),
      heroFeatures: input.heroFeatures.map((_, idx) => resolved.get(`heroFeatures.${idx}`)),
      heroIntervalSeconds: input.heroIntervalSeconds,
      showTripsSection: input.showTripsSection,
      showWhyUsSection: input.showWhyUsSection,
      showGallerySection: input.showGallerySection,
      showContactSection: input.showContactSection,
      whyUsItems: input.whyUsItems.map((item, idx) => ({
        id: item.id,
        title: resolved.get(`whyUs.${idx}.title`),
        body: resolved.get(`whyUs.${idx}.body`)
      }))
    };
    const validImageSet = new Set(db.images.map((i) => i.id));
    db.heroImages = input.heroImageIds.filter((id) => validImageSet.has(id)).map((imageId, idx) => ({
      id: crypto4.randomUUID(),
      imageId,
      sortOrder: idx
    }));
    saveDb(db);
    const removedIds = oldHeroIds.filter((id) => !input.heroImageIds.includes(id));
    if (removedIds.length > 0) {
      await cleanupOrphanImages(removedIds);
    }
    res.json({ ok: true, failedFields: failedPaths, translatedChars });
  });
  router.put("/admin/settings", requireOwner, async (req, res) => {
    const parsed = updateSiteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const forceFields = new Set(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const db = getDb();
    const prev = db.siteSettings;
    const input = parsed.data;
    const localizedFields = [
      "companyName",
      "address",
      "whatsappMessage",
      "seoTitle",
      "seoDescription",
      "aboutTitle",
      "aboutBody",
      "tripsIntro",
      "galleryTitle",
      "contactIntro",
      "footerTagline"
    ];
    const entries = localizedFields.map((key) => ({
      path: key,
      next: input[key],
      prev: prev[key],
      force: forceFields.has(key)
    }));
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);
    const oldAssetIds = [prev.logoImageId, prev.faviconImageId, prev.ogImageId].filter(
      (id) => Boolean(id)
    );
    const normalizedWhatsapp = input.whatsapp ? normalizeEgyptianWhatsapp(input.whatsapp) : input.phone ? normalizeEgyptianWhatsapp(input.phone) : "";
    db.siteSettings = {
      ...prev,
      companyName: resolved.get("companyName"),
      logoImageId: input.logoImageId,
      faviconImageId: input.faviconImageId,
      phone: input.phone,
      whatsapp: normalizedWhatsapp,
      email: input.email,
      address: resolved.get("address"),
      mapUrl: input.mapUrl,
      tiktokUrl: input.tiktokUrl,
      facebookUrl: input.facebookUrl,
      instagramUrl: input.instagramUrl,
      whatsappMessage: resolved.get("whatsappMessage"),
      seoTitle: resolved.get("seoTitle"),
      seoDescription: resolved.get("seoDescription"),
      ogImageId: input.ogImageId,
      aboutTitle: resolved.get("aboutTitle"),
      aboutBody: resolved.get("aboutBody"),
      tripsIntro: resolved.get("tripsIntro"),
      galleryTitle: resolved.get("galleryTitle"),
      contactIntro: resolved.get("contactIntro"),
      footerTagline: resolved.get("footerTagline")
    };
    saveDb(db);
    const nextAssets = /* @__PURE__ */ new Set([input.logoImageId, input.faviconImageId, input.ogImageId]);
    const removed = oldAssetIds.filter((id) => !nextAssets.has(id));
    if (removed.length > 0) {
      await cleanupOrphanImages(removed);
    }
    res.json({ ok: true, failedFields: failedPaths, translatedChars });
  });
  router.post("/admin/destinations", requireOwner, async (req, res) => {
    const parsed = destinationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const db = getDb();
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch([
      { path: "name", next: parsed.data.name, prev: null, force: Boolean(req.body?.forceTranslate) }
    ]);
    const name = resolved.get("name");
    const baseSlug = slugifyAscii(parsed.data.slug || name.en || parsed.data.name.ar, "dest");
    let slug = baseSlug;
    let suffix = 2;
    while (db.destinations.some((d) => d.slug === slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }
    const dest = {
      id: crypto4.randomUUID(),
      slug,
      name,
      sortOrder: db.destinations.length,
      isActive: parsed.data.isActive
    };
    db.destinations.push(dest);
    saveDb(db);
    res.status(201).json({ destination: dest, failedFields: failedPaths, translatedChars });
  });
  router.put("/admin/destinations/:id", requireOwner, async (req, res) => {
    const parsed = destinationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const db = getDb();
    const dest = db.destinations.find((d) => d.id === req.params.id);
    if (!dest) {
      res.status(404).json({ error: "\u0627\u0644\u0648\u062C\u0647\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch([
      {
        path: "name",
        next: parsed.data.name,
        prev: dest.name,
        force: Boolean(req.body?.forceTranslate)
      }
    ]);
    dest.name = resolved.get("name");
    dest.isActive = parsed.data.isActive;
    saveDb(db);
    res.json({ destination: dest, failedFields: failedPaths, translatedChars });
  });
  router.patch("/admin/destinations/reorder", requireOwner, (req, res) => {
    const schema = z2.object({ orderedIds: z2.array(z2.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u062A\u0631\u062A\u064A\u0628 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      return;
    }
    const db = getDb();
    const orderMap = new Map(parsed.data.orderedIds.map((id, i) => [id, i]));
    db.destinations.forEach((d) => {
      if (orderMap.has(d.id)) d.sortOrder = orderMap.get(d.id);
    });
    saveDb(db);
    res.json({ ok: true });
  });
  router.delete("/admin/destinations/:id", requireOwner, (req, res) => {
    const db = getDb();
    if (db.trips.some((t) => t.destinationId === req.params.id)) {
      res.status(400).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0648\u062C\u0647\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0631\u062D\u0644\u0627\u062A \u062D\u0627\u0644\u064A\u0629. \u0642\u0645 \u0628\u062A\u0639\u0637\u064A\u0644\u0647\u0627 \u0623\u0648 \u0646\u0642\u0644 \u0627\u0644\u0631\u062D\u0644\u0627\u062A \u0623\u0648\u0644\u0627\u064B." });
      return;
    }
    db.destinations = db.destinations.filter((d) => d.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });
  router.post("/admin/gallery", requireOwner, (req, res) => {
    const schema = z2.object({ imageIds: z2.array(z2.string().min(1)).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u0627\u062E\u062A\u0631 \u0635\u0648\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      return;
    }
    const db = getDb();
    const validImages = new Set(db.images.map((i) => i.id));
    let nextOrder = db.galleryImages.length;
    const created = [];
    for (const imageId of parsed.data.imageIds) {
      if (!validImages.has(imageId)) continue;
      const item = {
        id: crypto4.randomUUID(),
        imageId,
        caption: { ar: "", en: "", enManual: false },
        sortOrder: nextOrder++,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.galleryImages.push(item);
      created.push(item);
    }
    saveDb(db);
    res.status(201).json({ items: created });
  });
  router.put("/admin/gallery/:id", requireOwner, async (req, res) => {
    const schema = z2.object({
      caption: localizedTextSchema,
      forceTranslate: z2.boolean().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u062A\u0639\u0644\u064A\u0642 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      return;
    }
    const db = getDb();
    const item = db.galleryImages.find((g) => g.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch([
      {
        path: "caption",
        next: parsed.data.caption,
        prev: item.caption,
        force: Boolean(parsed.data.forceTranslate)
      }
    ]);
    item.caption = resolved.get("caption");
    saveDb(db);
    res.json({ item, failedFields: failedPaths, translatedChars });
  });
  router.patch("/admin/gallery/reorder", requireOwner, (req, res) => {
    const schema = z2.object({ orderedIds: z2.array(z2.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u062A\u0631\u062A\u064A\u0628 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      return;
    }
    const db = getDb();
    const orderMap = new Map(parsed.data.orderedIds.map((id, i) => [id, i]));
    db.galleryImages.forEach((g) => {
      if (orderMap.has(g.id)) g.sortOrder = orderMap.get(g.id);
    });
    saveDb(db);
    res.json({ ok: true });
  });
  router.delete("/admin/gallery/:id", requireOwner, async (req, res) => {
    const db = getDb();
    const item = db.galleryImages.find((g) => g.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    db.galleryImages = db.galleryImages.filter((g) => g.id !== item.id);
    saveDb(db);
    await cleanupOrphanImages([item.imageId]);
    res.json({ ok: true });
  });
  router.post("/admin/trips", requireOwner, async (req, res) => {
    const parsed = tripInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0631\u062D\u0644\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
      return;
    }
    const db = getDb();
    const input = parsed.data;
    const forceFields = new Set(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const entries = [
      { path: "title", next: input.title, prev: null, force: forceFields.has("title") },
      { path: "tagline", next: input.tagline, prev: null, force: forceFields.has("tagline") },
      { path: "description", next: input.description, prev: null, force: forceFields.has("description") }
    ];
    if (input.badge) {
      entries.push({ path: "badge", next: input.badge, prev: null, force: forceFields.has("badge") });
    }
    const cleanFeatures = input.features.filter((f) => f.ar.trim().length > 0);
    cleanFeatures.forEach((f, idx) => {
      entries.push({ path: `features.${idx}`, next: f, prev: null, force: forceFields.has(`features.${idx}`) });
    });
    input.itinerary.forEach((d, idx) => {
      entries.push(
        { path: `itinerary.${idx}.title`, next: d.title, prev: null, force: forceFields.has(`itinerary.${idx}.title`) },
        { path: `itinerary.${idx}.description`, next: d.description, prev: null, force: forceFields.has(`itinerary.${idx}.description`) }
      );
    });
    input.optionalActivities.forEach((a, idx) => {
      entries.push(
        { path: `activities.${idx}.title`, next: a.title, prev: null, force: forceFields.has(`activities.${idx}.title`) },
        { path: `activities.${idx}.description`, next: a.description, prev: null, force: forceFields.has(`activities.${idx}.description`) }
      );
    });
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);
    const title = resolved.get("title");
    const baseSlug = slugifyAscii(title.en || "", "trip");
    let slug = baseSlug;
    let suffix = 2;
    while (db.trips.some((t) => t.slug === slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }
    const tripId = crypto4.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.trips.push({
      id: tripId,
      slug,
      title,
      destinationId: input.destinationId,
      tagline: resolved.get("tagline"),
      badge: input.badge && input.badge.ar.trim() ? resolved.get("badge") : null,
      features: cleanFeatures.map((_, idx) => resolved.get(`features.${idx}`)),
      description: resolved.get("description"),
      durationDays: input.durationDays ?? null,
      priceAmount: input.priceAmount ?? null,
      pricePrefix: input.pricePrefix,
      priceUnit: input.priceUnit,
      status: input.status,
      sortOrder: db.trips.length,
      createdAt: now,
      updatedAt: now
    });
    const validImageIds = new Set(db.images.map((i) => i.id));
    input.imageIds.filter((id) => validImageIds.has(id)).forEach((imageId, idx) => {
      db.tripImages.push({
        id: crypto4.randomUUID(),
        tripId,
        imageId,
        sortOrder: idx
      });
    });
    input.itinerary.forEach((_, idx) => {
      db.itineraryDays.push({
        id: crypto4.randomUUID(),
        tripId,
        sortOrder: idx,
        title: resolved.get(`itinerary.${idx}.title`),
        description: resolved.get(`itinerary.${idx}.description`)
      });
    });
    input.optionalActivities.forEach((act, idx) => {
      db.optionalActivities.push({
        id: crypto4.randomUUID(),
        tripId,
        sortOrder: idx,
        title: resolved.get(`activities.${idx}.title`),
        description: resolved.get(`activities.${idx}.description`),
        pricing: act.pricing,
        priceAmount: act.pricing === "EXTRA_COST" ? act.priceAmount ?? null : null
      });
    });
    saveDb(db);
    const created = hydrateTrips(db, true).find((t) => t.id === tripId);
    res.status(201).json({ trip: created, failedFields: failedPaths, translatedChars });
  });
  router.put("/admin/trips/:id", requireOwner, async (req, res) => {
    const parsed = tripInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0631\u062D\u0644\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
      return;
    }
    const db = getDb();
    const existing = db.trips.find((t) => t.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u0631\u062D\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    const input = parsed.data;
    const forceFields = new Set(Array.isArray(req.body?.forceTranslateFields) ? req.body.forceTranslateFields : []);
    const prevItinerary = db.itineraryDays.filter((d) => d.tripId === existing.id).sort((a, b) => a.sortOrder - b.sortOrder);
    const prevActivities = db.optionalActivities.filter((a) => a.tripId === existing.id).sort((a, b) => a.sortOrder - b.sortOrder);
    const entries = [
      { path: "title", next: input.title, prev: existing.title, force: forceFields.has("title") },
      { path: "tagline", next: input.tagline, prev: existing.tagline, force: forceFields.has("tagline") },
      { path: "description", next: input.description, prev: existing.description, force: forceFields.has("description") }
    ];
    if (input.badge) {
      entries.push({ path: "badge", next: input.badge, prev: existing.badge, force: forceFields.has("badge") });
    }
    const cleanFeatures = input.features.filter((f) => f.ar.trim().length > 0);
    cleanFeatures.forEach((f, idx) => {
      entries.push({
        path: `features.${idx}`,
        next: f,
        prev: existing.features[idx],
        force: forceFields.has(`features.${idx}`)
      });
    });
    input.itinerary.forEach((d, idx) => {
      const prevDay = prevItinerary.find((p) => p.id === d.id) || prevItinerary[idx];
      entries.push(
        { path: `itinerary.${idx}.title`, next: d.title, prev: prevDay?.title, force: forceFields.has(`itinerary.${idx}.title`) },
        { path: `itinerary.${idx}.description`, next: d.description, prev: prevDay?.description, force: forceFields.has(`itinerary.${idx}.description`) }
      );
    });
    input.optionalActivities.forEach((a, idx) => {
      const prevAct = prevActivities.find((p) => p.id === a.id) || prevActivities[idx];
      entries.push(
        { path: `activities.${idx}.title`, next: a.title, prev: prevAct?.title, force: forceFields.has(`activities.${idx}.title`) },
        { path: `activities.${idx}.description`, next: a.description, prev: prevAct?.description, force: forceFields.has(`activities.${idx}.description`) }
      );
    });
    const { resolved, failedPaths, translatedChars } = await translateEntriesBatch(entries);
    const oldImageIds = db.tripImages.filter((ti) => ti.tripId === existing.id).map((ti) => ti.imageId);
    existing.title = resolved.get("title");
    existing.destinationId = input.destinationId;
    existing.tagline = resolved.get("tagline");
    existing.badge = input.badge && input.badge.ar.trim() ? resolved.get("badge") : null;
    existing.features = cleanFeatures.map((_, idx) => resolved.get(`features.${idx}`));
    existing.description = resolved.get("description");
    existing.durationDays = input.durationDays ?? null;
    existing.priceAmount = input.priceAmount ?? null;
    existing.pricePrefix = input.pricePrefix;
    existing.priceUnit = input.priceUnit;
    existing.status = input.status;
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const validImageIds = new Set(db.images.map((i) => i.id));
    db.tripImages = db.tripImages.filter((ti) => ti.tripId !== existing.id);
    input.imageIds.filter((id) => validImageIds.has(id)).forEach((imageId, idx) => {
      db.tripImages.push({
        id: crypto4.randomUUID(),
        tripId: existing.id,
        imageId,
        sortOrder: idx
      });
    });
    db.itineraryDays = db.itineraryDays.filter((d) => d.tripId !== existing.id);
    input.itinerary.forEach((_, idx) => {
      db.itineraryDays.push({
        id: crypto4.randomUUID(),
        tripId: existing.id,
        sortOrder: idx,
        title: resolved.get(`itinerary.${idx}.title`),
        description: resolved.get(`itinerary.${idx}.description`)
      });
    });
    db.optionalActivities = db.optionalActivities.filter((a) => a.tripId !== existing.id);
    input.optionalActivities.forEach((act, idx) => {
      db.optionalActivities.push({
        id: crypto4.randomUUID(),
        tripId: existing.id,
        sortOrder: idx,
        title: resolved.get(`activities.${idx}.title`),
        description: resolved.get(`activities.${idx}.description`),
        pricing: act.pricing,
        priceAmount: act.pricing === "EXTRA_COST" ? act.priceAmount ?? null : null
      });
    });
    saveDb(db);
    const removed = oldImageIds.filter((id) => !input.imageIds.includes(id));
    if (removed.length > 0) {
      await cleanupOrphanImages(removed);
    }
    const updated = hydrateTrips(db, true).find((t) => t.id === existing.id);
    res.json({ trip: updated, failedFields: failedPaths, translatedChars });
  });
  router.patch("/admin/trips/reorder", requireOwner, (req, res) => {
    const schema = z2.object({ orderedIds: z2.array(z2.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u062A\u0631\u062A\u064A\u0628 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      return;
    }
    const db = getDb();
    const orderMap = new Map(parsed.data.orderedIds.map((id, i) => [id, i]));
    db.trips.forEach((t) => {
      if (orderMap.has(t.id)) t.sortOrder = orderMap.get(t.id);
    });
    saveDb(db);
    res.json({ ok: true });
  });
  router.patch("/admin/trips/:id/status", requireOwner, (req, res) => {
    const schema = z2.object({ status: z2.enum(["DRAFT", "PUBLISHED", "HIDDEN"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const db = getDb();
    const trip = db.trips.find((t) => t.id === req.params.id);
    if (!trip) {
      res.status(404).json({ error: "\u0627\u0644\u0631\u062D\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    if (parsed.data.status === "PUBLISHED") {
      const tripImgs = db.tripImages.filter((ti) => ti.tripId === trip.id);
      const validFeatures = trip.features.filter((f) => f.ar.trim().length > 0);
      if (!trip.title.ar.trim() || !trip.destinationId || !trip.tagline.ar.trim() || tripImgs.length < 1 || validFeatures.length < 2 || validFeatures.length > 4) {
        res.status(400).json({
          error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0646\u0634\u0631 \u0627\u0644\u0631\u062D\u0644\u0629 \u0642\u0628\u0644 \u0627\u0633\u062A\u064A\u0641\u0627\u0621: \u0627\u0644\u0639\u0646\u0648\u0627\u0646\u060C \u0627\u0644\u0648\u062C\u0647\u0629\u060C \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u062E\u062A\u0635\u0631\u060C \u0635\u0648\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644\u060C \u0648\u0645\u0646 2 \u0625\u0644\u0649 4 \u0645\u0645\u064A\u0632\u0627\u062A."
        });
        return;
      }
    }
    trip.status = parsed.data.status;
    trip.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb(db);
    res.json({ ok: true, status: trip.status });
  });
  router.delete("/admin/trips/:id", requireOwner, async (req, res) => {
    const db = getDb();
    const trip = db.trips.find((t) => t.id === req.params.id);
    if (!trip) {
      res.status(404).json({ error: "\u0627\u0644\u0631\u062D\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    const imageIds = db.tripImages.filter((ti) => ti.tripId === trip.id).map((ti) => ti.imageId);
    db.trips = db.trips.filter((t) => t.id !== trip.id);
    db.tripImages = db.tripImages.filter((ti) => ti.tripId !== trip.id);
    db.itineraryDays = db.itineraryDays.filter((d) => d.tripId !== trip.id);
    db.optionalActivities = db.optionalActivities.filter((a) => a.tripId !== trip.id);
    saveDb(db);
    if (imageIds.length > 0) {
      await cleanupOrphanImages(imageIds);
    }
    res.json({ ok: true });
  });
  return router;
}

// server/seo.ts
function getSiteOrigin(req) {
  const configured = process.env.APP_URL || process.env.VITE_SITE_URL;
  if (configured && configured.startsWith("http")) {
    return configured.replace(/\/+$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}
function escapeXml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function handleRobotsTxt(req, res) {
  const origin = getSiteOrigin(req);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    ""
  ].join("\n");
  res.type("text/plain").send(body);
}
function handleSitemapXml(req, res) {
  const origin = getSiteOrigin(req);
  const db = getDb();
  const trips = hydrateTrips(db, false);
  const staticPaths = ["", "/trips", "/gallery", "/about", "/contact"];
  const urls = [];
  for (const p of staticPaths) {
    for (const locale of ["ar", "en"]) {
      const loc = `${origin}/${locale}${p}`;
      urls.push(
        `  <url>
    <loc>${escapeXml(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(`${origin}/ar${p}`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${origin}/en${p}`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/ar${p}`)}" />
  </url>`
      );
    }
  }
  for (const trip of trips) {
    const p = `/trips/${encodeURIComponent(trip.slug)}`;
    for (const locale of ["ar", "en"]) {
      const loc = `${origin}/${locale}${p}`;
      urls.push(
        `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(trip.updatedAt)}</lastmod>
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(`${origin}/ar${p}`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${origin}/en${p}`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/ar${p}`)}" />
  </url>`
      );
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
` + urls.join("\n") + `
</urlset>
`;
  res.type("application/xml").send(xml);
}

// server/app.ts
function createApp() {
  const app2 = express2();
  app2.set("trust proxy", 1);
  getDb();
  app2.use((req, res, next) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' https://res.cloudinary.com data: blob:",
      "connect-src 'self' https://api.cloudinary.com ws: wss:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join("; ");
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (req.path.startsWith("/admin") || req.path.startsWith("/api/")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    next();
  });
  app2.use(express2.json({ limit: "2mb" }));
  app2.get("/robots.txt", handleRobotsTxt);
  app2.get("/sitemap.xml", handleSitemapXml);
  try {
    const uploadsDir = ensureLocalUploadDir();
    app2.use("/uploads", express2.static(uploadsDir, { maxAge: "30d" }));
  } catch (err) {
    console.warn("Skipping local uploads static directory:", err);
  }
  app2.use("/api", createApiRouter());
  return app2;
}

// server/vercel-entry.ts
var app = createApp();
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
