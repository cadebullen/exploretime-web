"use client";

import { useMemo, useState } from "react";
import { priceLabel } from "@/lib/placeCategories";

const TOTAL_STEPS = 4;
const BLOCKS = ["Morning", "Afternoon", "Evening"];
const BUDGET_OPTIONS = [
  {
    value: "ultra-low",
    label: "The Backpacker",
    description:
      "Prioritizes free activities, and the minimum spend; every dollar counts.",
  },
  {
    value: "low",
    label: "The Practical",
    description:
      "Leans towards budget-friendly options but open to occasional splurges. Willing to pay for safety, privacy, unique experiences, and basic comforts but avoids needless luxury or tourist traps.",
  },
  {
    value: "hybrid",
    label: "The Balanced",
    description:
      "Values a mix of budget and premium experiences, seeking good value but open to spending more for memorable or unique activities. The idea is also to spend massive amounts on specific / unforgettable experiences while being budget conscious for the rest.",
  },
  {
    value: "high",
    label: "The Luxury Seeker",
    description:
      "Prioritizes high-end experiences, fine dining, and premium activities. Willing to spend more for exclusivity, comfort, and unique offerings that enhance the overall travel experience.",
  },
  {
    value: "ultra-high",
    label: "The Extravagant",
    description:
      "Seeks out the most luxurious and exclusive experiences, often with a focus on status and indulgence. Willing to spend lavishly for once-in-a-lifetime activities, private tours, and top-tier services that epitomize opulence.",
  },
];

const SOCIAL_OPTIONS = [
  {
    value: "solo",
    label: "The Lone Wolf",
    description:
      "Prioritizes deep isolation, quiet self-reflection, and avoiding crowds. Ideal for complete digital detoxes, empty trails, and silent cabins.",
  },
  {
    value: "low",
    label: "The Quiet Observer",
    description:
      "Enjoys being around a local atmosphere but prefers private accommodations and independent exploration without enforced interactions.",
  },
  {
    value: "moderate",
    label: "The Balanced Mingler",
    description:
      "Comfortable navigating public spaces and open to casual chats with locals or fellow travelers, but values having a private retreat at night.",
  },
  {
    value: "high",
    label: "The Social Butterfly",
    description:
      "Thrives on group dynamics. Prefers lively hostels, shared tours, busy walking streets, and experiences where meeting new people is part of the itinerary.",
  },
  {
    value: "ultra-high",
    label: "The Festival Head",
    description:
      "Seeks maximum energy, massive crowds, and non-stop collective experiences. Built for concert weeks, rowdy nightlife, and high-density events.",
  },
];

const INTEREST_OPTIONS = [
  // CULTURE & HISTORY
  { id: "museums", label: "Museums & Galleries", cat: "culture" },
  { id: "history", label: "Castles & Ruins", cat: "culture" },
  { id: "architecture", label: "Architecture Walks", cat: "culture" },
  { id: "religion", label: "Shrines & Temples", cat: "culture" },
  { id: "literature", label: "Bookstores & Libraries", cat: "culture" },
  { id: "theatre", label: "Plays & Live Theater", cat: "culture" },
  { id: "cemeteries", label: "Historic Cemeteries", cat: "culture" },

  // NATURE & ADVENTURE
  { id: "hiking", label: "Mountain Hiking", cat: "nature" },
  { id: "national_parks", label: "National Parks", cat: "nature" },
  { id: "wildlife", label: "Safaris & Wildlife", cat: "nature" },
  { id: "caves", label: "Caves & Canyons", cat: "nature" },
  { id: "extreme", label: "Skydiving & Bungee", cat: "nature" },
  { id: "camping", label: "Off-Grid Camping", cat: "nature" },
  { id: "stargazing", label: "Dark-Sky Stargazing", cat: "nature" },
  { id: "roadtrips", label: "Scenic Byways", cat: "nature" },

  // COASTAL & WELLNESS
  { id: "beaches", label: "Beach Lounging", cat: "leisure" },
  { id: "surfing", label: "Surfing & Watersports", cat: "leisure" },
  { id: "diving", label: "Scuba & Snorkeling", cat: "leisure" },
  { id: "cruises", label: "Boat Charters", cat: "leisure" },
  { id: "hot_springs", label: "Natural Hot Springs", cat: "leisure" },
  { id: "spa", label: "Luxury Spa Treatment", cat: "leisure" },
  { id: "yoga", label: "Yoga & Meditation", cat: "leisure" },
  { id: "gardens", label: "Botanical Gardens", cat: "leisure" },

  // FOOD & ENTERTAINMENT
  { id: "fine_dining", label: "Michelin & Fine Dining", cat: "social" },
  { id: "street_food", label: "Local Street Markets", cat: "social" },
  { id: "wine", label: "Vineyard Tastings", cat: "social" },
  { id: "cafes", label: "Specialty Cafe Hopping", cat: "social" },
  { id: "clubs", label: "Nightclubs & Techno", cat: "social" },
  { id: "concerts", label: "Live Music & Gigs", cat: "social" },
  { id: "festivals", label: "Cultural Festivals", cat: "social" },
  { id: "shopping", label: "Vintage & Boutiques", cat: "social" },
];

const VIBE_OPTIONS = [
  {
    value: "slow-mindful",
    label: "Slow & Mindful",
    description:
      "Focused on resetting, disconnecting, and absorbing local culture at a relaxed pace.",
  },
  {
    value: "fast-electric",
    label: "Fast-Paced & Electric",
    description:
      "Centered around movement, culture, and nightlife with a packed schedule.",
  },
  {
    value: "coastal-sunny",
    label: "Sun-Drenched & Coastal",
    description: "Emphasizes beach, ocean, and sunny outdoor activities.",
  },
  {
    value: "raw-nature",
    label: "Raw Nature",
    description:
      "For travelers drawn to landscapes, hiking, and nature immersion.",
  },
  {
    value: "high-octane",
    label: "High Octane",
    description:
      "Luxury aesthetics with focus on high-end dining, shopping, and nightlife.",
  },
  {
    value: "romantic-cozy",
    label: "Romantic & Cozy",
    description: "Intimate experiences, cozy cafes, and romantic settings.",
  },
];

const VIBE_CATEGORY_BONUS = {
  "slow-mindful": ["Culture", "Leisure"],
  "fast-electric": ["Culture", "Shopping", "Nightlife"],
  "coastal-sunny": ["Outdoors", "Leisure"],
  "raw-nature": ["Outdoors"],
  "high-octane": ["Food", "Shopping", "Nightlife"],
  "romantic-cozy": ["Food", "Leisure"],
};

const ACTIVITY_CATEGORY_GROUP = {
  food: "social",
  culture: "culture",
  outdoors: "nature",
  shopping: "social",
  leisure: "leisure",
  nightlife: "social",
};

// Score by Google price level (0 = free … 4 = very expensive) for each budget
// style. Places without a price level get a neutral score.
const BUDGET_SCORE_BY_PRICE = {
  "ultra-low": [3, 3, 1, 0, 0],
  low: [3, 2, 2, 0, 0],
  hybrid: [1, 1, 2, 2, 1],
  high: [0, 0, 1, 2, 3],
  "ultra-high": [0, 0, 0, 2, 3],
};

const SOCIAL_CATEGORY_BONUS = {
  solo: ["nature", "leisure", "culture"],
  low: ["culture", "leisure"],
  moderate: ["culture", "leisure", "social"],
  high: ["social", "culture"],
  "ultra-high": ["social"],
};

function normalizeProfile(profile) {
  const legacyVibeMap = {
    relaxed: "slow-mindful",
    adventurous: "raw-nature",
    balanced: "slow-mindful",
  };
  const legacyBudgetMap = { budget: "low", flexible: "hybrid" };
  const legacySocialMap = { balanced: "moderate", social: "high" };

  const vibe = legacyVibeMap[profile?.vibe] ?? profile?.vibe ?? "slow-mindful";
  const budget = legacyBudgetMap[profile?.budget] ?? profile?.budget ?? "low";
  const social =
    legacySocialMap[profile?.social] ?? profile?.social ?? "moderate";

  const interests = Array.isArray(profile?.interests)
    ? profile.interests
    : ["museums", "cafes"];
  const normalizedInterests = interests.map((item) => {
    if (typeof item === "string") {
      if (INTEREST_OPTIONS.some((opt) => opt.id === item)) return item;
      const byCategory = {
        food: "cafes",
        culture: "museums",
        outdoors: "hiking",
        shopping: "shopping",
        leisure: "beaches",
      };
      return byCategory[item.toLowerCase()] ?? "museums";
    }
    return "museums";
  });

  return { vibe, budget, social, interests: [...new Set(normalizedInterests)] };
}

function scorePlace(place, profile) {
  let score = 0;

  // Found by a search for one of the user's interests
  if (profile.interests.includes(place.interest)) score += 3;

  const categoryGroup =
    ACTIVITY_CATEGORY_GROUP[String(place.category).toLowerCase()] ?? "culture";

  if ((VIBE_CATEGORY_BONUS[profile.vibe] ?? []).includes(place.category)) {
    score += 1;
  }

  score +=
    place.priceLevel === null || place.priceLevel === undefined
      ? 1
      : (BUDGET_SCORE_BY_PRICE[profile.budget]?.[place.priceLevel] ?? 0);

  if ((SOCIAL_CATEGORY_BONUS[profile.social] ?? []).includes(categoryGroup)) {
    score += 1;
  }

  // Well-reviewed places first; very few reviews counts against a place.
  if (place.rating >= 4.6) score += 1.5;
  else if (place.rating >= 4.3) score += 1;
  else if (place.rating && place.rating < 3.8) score -= 1;
  if (place.ratingCount < 30) score -= 1;

  return score;
}

const PER_BLOCK = 6;

// Splits each time block's ranked places across the trip's days, so each day
// gets its own suggestions. With too few places to split, every day sees all.
function placesForDay(ranked, dayIndex, dayCount) {
  if (dayCount <= 1 || ranked.length < dayCount * 3) {
    return ranked.slice(0, PER_BLOCK);
  }
  return ranked
    .filter((_, i) => i % dayCount === dayIndex % dayCount)
    .slice(0, PER_BLOCK);
}

function PlaceCard({ place, isSaved, otherDays = [], onToggle }) {
  const price = priceLabel(place.priceLevel);
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
      <div className="aspect-[16/9] bg-white/5">
        {place.photoRef && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/place-photo?ref=${encodeURIComponent(place.photoRef)}&w=480`}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs text-white/45">
          {place.category}
          {price && <span className="ml-2 text-white/60">{price}</span>}
        </p>
        <h4 className="text-base font-semibold text-white mt-1 leading-snug">
          {place.name}
        </h4>
        {place.rating && (
          <p className="text-xs text-white/60 mt-1">
            ★ {place.rating.toFixed(1)}
            {place.ratingCount > 0 && (
              <span className="text-white/35">
                {" "}
                ({place.ratingCount.toLocaleString()})
              </span>
            )}
          </p>
        )}
        <p className="text-xs text-white/35 mt-1 line-clamp-2">
          {place.address}
        </p>
        {otherDays.length > 0 && (
          <p className="mt-3 inline-flex self-start items-center gap-1.5 rounded-md bg-[#FF9F43]/15 px-2 py-1 text-xs font-medium text-[#FFC48A]">
            Already planned for Day {otherDays.join(", Day ")}
          </p>
        )}
        <div className="mt-auto pt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(place)}
            aria-pressed={isSaved}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isSaved
                ? "bg-white/10 text-white hover:bg-white/15"
                : "bg-[#FF9F43] text-[#1A1006] hover:brightness-110"
            }`}
          >
            {isSaved ? "Added ✓" : "Add to day"}
          </button>
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg text-sm text-white/70 border border-white/15 hover:text-white hover:border-white/30 transition-colors"
          >
            Map
          </a>
        </div>
      </div>
    </li>
  );
}

export default function DayActivities({
  places = [],
  placesLoading = false,
  placesError = null,
  city = "",
  dayIndex = 0,
  dayCount = 1,
  saved = [],
  plannedElsewhere = {},
  onToggleSave,
  profile,
  onSaveProfile,
}) {
  const [step, setStep] = useState(0);
  const [editingPreferences, setEditingPreferences] = useState(!profile);
  const [draft, setDraft] = useState(
    normalizeProfile(
      profile ?? {
        vibe: "slow-mindful",
        budget: "low",
        social: "moderate",
        interests: ["museums", "cafes"],
      },
    ),
  );

  const selectedProfile = editingPreferences
    ? draft
    : normalizeProfile(profile ?? draft);

  const grouped = useMemo(() => {
    const out = { Morning: [], Afternoon: [], Evening: [] };
    const ranked = [...places]
      .map((place) => ({ place, score: scorePlace(place, selectedProfile) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.place);
    for (const block of BLOCKS) {
      out[block] = placesForDay(
        ranked.filter((p) => p.timeBlock === block),
        dayIndex,
        dayCount,
      );
    }
    return out;
  }, [places, selectedProfile, dayIndex, dayCount]);

  const savedIds = new Set(saved.map((p) => p.id));

  const toggleInterest = (interest) => {
    setDraft((prev) => {
      const has = prev.interests.includes(interest);
      const nextInterests = has
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];

      return {
        ...prev,
        interests: nextInterests.length ? nextInterests : [interest],
      };
    });
  };

  const openPreferencesEditor = () => {
    setDraft(normalizeProfile(profile ?? {}));
    setStep(0);
    setEditingPreferences(true);
  };

  const completePreferences = () => {
    onSaveProfile(draft);
    setEditingPreferences(false);
  };

  const canContinue =
    (step === 0 && Boolean(draft.vibe)) ||
    (step === 1 && Boolean(draft.budget)) ||
    (step === 2 && Boolean(draft.social)) ||
    (step === 3 && draft.interests.length > 0);

  const stepTitle = [
    "What is your travel vibe?",
    "What is your budget style?",
    "How social do you want activities to be?",
    "What types of activities do you enjoy?",
  ][step];

  return (
    <div className="space-y-8">
      {!editingPreferences && profile && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openPreferencesEditor}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Change preferences
          </button>
        </div>
      )}

      {editingPreferences && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
          <div className="flex items-center justify-between mb-1">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
            ) : (
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Step 1 of {TOTAL_STEPS}
              </p>
            )}

            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: step === i ? "24px" : "6px",
                    backgroundColor:
                      step === i ? "#FF9F43" : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {stepTitle}
            </h2>
            <p className="text-xs text-white/45 mt-2">
              These answers personalize activity suggestions for this trip.
            </p>
          </div>

          <div className="space-y-4 min-h-40">
            {step === 0 && (
              <div className="grid grid-cols-1 gap-2">
                {VIBE_OPTIONS.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, vibe: value }))}
                    className={`px-3 py-2.5 rounded-lg text-left border transition-colors ${
                      draft.vibe === value
                        ? "bg-[#FF9F43] border-[#FF9F43] text-[#1A1006]"
                        : "border-white/20 text-white/70 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-[11px] opacity-85 mt-1 leading-relaxed">
                      {description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 gap-2">
                {BUDGET_OPTIONS.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, budget: value }))}
                    className={`px-3 py-2.5 rounded-lg text-left border transition-colors ${
                      draft.budget === value
                        ? "bg-[#FF9F43] border-[#FF9F43] text-[#1A1006]"
                        : "border-white/20 text-white/70 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-[11px] opacity-85 mt-1 leading-relaxed">
                      {description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-2">
                {SOCIAL_OPTIONS.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, social: value }))}
                    className={`px-3 py-2.5 rounded-lg text-left border transition-colors ${
                      draft.social === value
                        ? "bg-[#FF9F43] border-[#FF9F43] text-[#1A1006]"
                        : "border-white/20 text-white/70 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-[11px] opacity-85 mt-1 leading-relaxed">
                      {description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <>
                <p className="text-xs text-white/45">
                  Select one or more interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => {
                    const active = draft.interests.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          active
                            ? "bg-[#FF9F43] border-[#FF9F43] text-[#1A1006]"
                            : "border-white/20 text-white/70 hover:text-white"
                        }`}
                      >
                        {interest.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {profile ? (
              <button
                type="button"
                onClick={() => setEditingPreferences(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white/45 border border-white/10 hover:border-white/25 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                disabled={!canContinue}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1A1006] transition-opacity"
                style={{
                  backgroundColor: "#FF9F43",
                  opacity: canContinue ? 1 : 0.35,
                }}
              >
                Continue -&gt;
              </button>
            ) : (
              <button
                type="button"
                onClick={completePreferences}
                disabled={!canContinue}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1A1006] transition-opacity"
                style={{
                  backgroundColor: "#FF9F43",
                  opacity: canContinue ? 1 : 0.35,
                }}
              >
                Save preferences
              </button>
            )}
          </div>
        </section>
      )}

      {!editingPreferences && profile && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              Your plan for this day
            </h2>
            {saved.length === 0 ? (
              <p className="text-sm text-white/45">
                Nothing planned yet. Add places from the suggestions below.
              </p>
            ) : (
              <ul className="space-y-2">
                {BLOCKS.flatMap((block) =>
                  saved
                    .filter((p) => p.timeBlock === block)
                    .map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <span className="w-20 shrink-0 text-xs text-white/45">
                          {block}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-white truncate">
                            {p.name}
                          </span>
                          <span className="block text-xs text-white/40 truncate">
                            {p.category}
                            {p.address ? ` · ${p.address}` : ""}
                          </span>
                        </span>
                        <a
                          href={p.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-white/60 hover:text-white"
                        >
                          Map
                        </a>
                        <button
                          type="button"
                          onClick={() => onToggleSave(p)}
                          className="text-xs text-white/50 hover:text-white"
                        >
                          Remove
                        </button>
                      </li>
                    )),
                )}
              </ul>
            )}
          </section>

          <section className="space-y-8">
            <h2 className="text-lg font-semibold text-white">
              Suggestions{city ? ` in ${city}` : ""}
            </h2>

            {placesLoading && (
              <div className="flex items-center gap-2 text-sm text-white/45">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                Finding places that match your preferences…
              </div>
            )}

            {!placesLoading && placesError && (
              <p className="text-sm text-white/60">
                Couldn&apos;t load suggestions ({placesError}). Check that
                PLACES_KEY is set and the Places API is enabled, then reload
                the page.
              </p>
            )}

            {!placesLoading &&
              !placesError &&
              BLOCKS.every((b) => grouped[b].length === 0) && (
                <p className="text-sm text-white/60">
                  No places found for these interests. Try adding more
                  interests with Change preferences.
                </p>
              )}

            {!placesLoading &&
              BLOCKS.map(
                (block) =>
                  grouped[block].length > 0 && (
                    <div key={block}>
                      <h3 className="text-sm font-semibold text-white/70 mb-3">
                        {block}
                      </h3>
                      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {grouped[block].map((place) => (
                          <PlaceCard
                            key={place.id}
                            place={place}
                            isSaved={savedIds.has(place.id)}
                            otherDays={plannedElsewhere[place.id]}
                            onToggle={onToggleSave}
                          />
                        ))}
                      </ul>
                    </div>
                  ),
              )}
          </section>
        </>
      )}
    </div>
  );
}
