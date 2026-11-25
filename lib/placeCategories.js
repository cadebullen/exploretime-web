// What to search Google Places for, per activity interest from the quiz.
// category: how the place is labelled and ranked; timeBlock: when in the day
// it is suggested.

export const BASE_QUERIES = [
  { id: "top_sights", query: "top tourist attractions", category: "Culture", timeBlock: "Afternoon" },
  { id: "local_food", query: "best local restaurants", category: "Food", timeBlock: "Evening" },
  { id: "breakfast", query: "breakfast cafes", category: "Food", timeBlock: "Morning" },
];

export const INTEREST_QUERIES = {
  // Culture & history
  museums: { query: "museums", category: "Culture", timeBlock: "Afternoon" },
  history: { query: "castles and historic sites", category: "Culture", timeBlock: "Morning" },
  architecture: { query: "famous architecture landmarks", category: "Culture", timeBlock: "Morning" },
  religion: { query: "temples shrines churches", category: "Culture", timeBlock: "Morning" },
  literature: { query: "bookstores and libraries", category: "Culture", timeBlock: "Afternoon" },
  theatre: { query: "theaters", category: "Culture", timeBlock: "Evening" },
  cemeteries: { query: "historic cemeteries", category: "Culture", timeBlock: "Morning" },

  // Nature & adventure
  hiking: { query: "hiking trails", category: "Outdoors", timeBlock: "Morning" },
  national_parks: { query: "national parks and nature reserves", category: "Outdoors", timeBlock: "Morning" },
  wildlife: { query: "zoos and wildlife parks", category: "Outdoors", timeBlock: "Morning" },
  caves: { query: "caves and canyons", category: "Outdoors", timeBlock: "Morning" },
  extreme: { query: "adventure sports", category: "Outdoors", timeBlock: "Afternoon" },
  camping: { query: "campgrounds", category: "Outdoors", timeBlock: "Afternoon" },
  stargazing: { query: "scenic viewpoints", category: "Outdoors", timeBlock: "Evening" },
  roadtrips: { query: "scenic drives and lookouts", category: "Outdoors", timeBlock: "Afternoon" },

  // Coastal & wellness
  beaches: { query: "beaches", category: "Leisure", timeBlock: "Afternoon" },
  surfing: { query: "surf schools and watersports", category: "Leisure", timeBlock: "Morning" },
  diving: { query: "scuba diving and snorkeling", category: "Leisure", timeBlock: "Morning" },
  cruises: { query: "boat tours", category: "Leisure", timeBlock: "Afternoon" },
  hot_springs: { query: "hot springs and thermal baths", category: "Leisure", timeBlock: "Afternoon" },
  spa: { query: "spas", category: "Leisure", timeBlock: "Afternoon" },
  yoga: { query: "yoga studios", category: "Leisure", timeBlock: "Morning" },
  gardens: { query: "botanical gardens and parks", category: "Leisure", timeBlock: "Morning" },

  // Food & entertainment
  fine_dining: { query: "fine dining restaurants", category: "Food", timeBlock: "Evening" },
  street_food: { query: "food markets", category: "Food", timeBlock: "Afternoon" },
  wine: { query: "wineries and wine bars", category: "Food", timeBlock: "Evening" },
  cafes: { query: "specialty coffee shops", category: "Food", timeBlock: "Morning" },
  clubs: { query: "nightclubs", category: "Nightlife", timeBlock: "Evening" },
  concerts: { query: "live music venues", category: "Nightlife", timeBlock: "Evening" },
  festivals: { query: "cultural centers and event venues", category: "Culture", timeBlock: "Evening" },
  shopping: { query: "vintage shops and boutiques", category: "Shopping", timeBlock: "Afternoon" },
};

// Most interests searched per request (each one is a Places API call).
export const MAX_INTEREST_QUERIES = 8;

// Google price_level 0–4 shown as symbols.
export function priceLabel(level) {
  if (level === undefined || level === null) return null;
  if (level === 0) return "Free";
  return "$".repeat(level);
}
