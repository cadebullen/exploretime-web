const BASE_SUGGESTIONS = [
  {
    id: "breakfast-local",
    title: "Try a local breakfast cafe",
    category: "Food",
    timeBlock: "Morning",
    durationMin: 60,
    costEstimate: "$$",
  },
  {
    id: "old-town-walk",
    title: "Walk through the historic district",
    category: "Culture",
    timeBlock: "Morning",
    durationMin: 90,
    costEstimate: "Free",
  },
  {
    id: "main-museum",
    title: "Visit the top-rated city museum",
    category: "Culture",
    timeBlock: "Afternoon",
    durationMin: 120,
    costEstimate: "$$",
  },
  {
    id: "city-park",
    title: "Relax in a major city park",
    category: "Outdoors",
    timeBlock: "Afternoon",
    durationMin: 75,
    costEstimate: "Free",
  },
  {
    id: "street-market",
    title: "Browse a local street market",
    category: "Shopping",
    timeBlock: "Afternoon",
    durationMin: 90,
    costEstimate: "$-$$",
  },
  {
    id: "sunset-view",
    title: "Catch sunset at a scenic viewpoint",
    category: "Outdoors",
    timeBlock: "Evening",
    durationMin: 60,
    costEstimate: "Free",
  },
  {
    id: "signature-dinner",
    title: "Book a signature local dinner spot",
    category: "Food",
    timeBlock: "Evening",
    durationMin: 120,
    costEstimate: "$$$",
  },
  {
    id: "night-stroll",
    title: "Take an evening neighborhood stroll",
    category: "Leisure",
    timeBlock: "Evening",
    durationMin: 45,
    costEstimate: "Free",
  },
];

const CITY_OVERRIDES = {
  tokyo: [
    {
      id: "tokyo-shrine",
      title: "Visit a neighborhood shrine",
      category: "Culture",
      timeBlock: "Morning",
      durationMin: 60,
      costEstimate: "Free",
    },
    {
      id: "tokyo-ramen",
      title: "Try a ramen counter lunch",
      category: "Food",
      timeBlock: "Afternoon",
      durationMin: 60,
      costEstimate: "$$",
    },
    {
      id: "tokyo-izakaya",
      title: "Experience an izakaya alley",
      category: "Food",
      timeBlock: "Evening",
      durationMin: 120,
      costEstimate: "$$$",
    },
  ],
  paris: [
    {
      id: "paris-boulangerie",
      title: "Start at a classic boulangerie",
      category: "Food",
      timeBlock: "Morning",
      durationMin: 45,
      costEstimate: "$",
    },
    {
      id: "paris-river",
      title: "Walk along the Seine",
      category: "Outdoors",
      timeBlock: "Afternoon",
      durationMin: 90,
      costEstimate: "Free",
    },
    {
      id: "paris-bistro",
      title: "Have dinner at a neighborhood bistro",
      category: "Food",
      timeBlock: "Evening",
      durationMin: 120,
      costEstimate: "$$$",
    },
  ],
  london: [
    {
      id: "london-market",
      title: "Explore a local market hall",
      category: "Shopping",
      timeBlock: "Morning",
      durationMin: 75,
      costEstimate: "$-$$",
    },
    {
      id: "london-museum",
      title: "Visit a major museum gallery",
      category: "Culture",
      timeBlock: "Afternoon",
      durationMin: 120,
      costEstimate: "Free",
    },
    {
      id: "london-pub",
      title: "Enjoy a classic pub evening",
      category: "Food",
      timeBlock: "Evening",
      durationMin: 90,
      costEstimate: "$$",
    },
  ],
};

export function getSuggestedActivities(destination) {
  const city = (destination ?? "").split(",")[0].trim().toLowerCase();
  const citySpecific = CITY_OVERRIDES[city] ?? [];
  return [...citySpecific, ...BASE_SUGGESTIONS];
}
