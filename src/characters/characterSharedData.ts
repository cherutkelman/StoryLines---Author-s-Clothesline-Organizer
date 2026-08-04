export const SHARED_CHARACTER_DATA_KEYS = [
  'gender',
  'name',
  'age',
  'residence',
  'daily_life',
  'favorite_food',
  'favorite_color',
  'general_appearance',
  'unique_features',
  'gestures',
  'common_phrases',
  'traits',
  'abilities',
  'special_powers',
  'values',
  'hobbies',
  'favorite_place',
  'strengths',
  'difficulties',
  'life_motto',
  'sweet_memories',
  'bad_memories',
  'traumas',
] as const;

export const BOOK_SPECIFIC_CHARACTER_DATA_KEYS = [
  'role',
  'goal',
  'obstacles',
  'avoidance',
  'central_dilemma',
  'choice_between',
  'first_choice_revelation',
  'choice_price',
  'belief_impact',
  'similar_dilemma_later',
  'later_choice_diff',
  'social_start_end',
  'family_start_end',
  'romantic_start_end',
  'enemy_start_end',
  'changing_connections',
  'other_connections',
] as const;

export type SharedCharacterDataKey = typeof SHARED_CHARACTER_DATA_KEYS[number];
export type SharedCharacterFieldPath =
  | 'name'
  | 'imageUrl'
  | `data.${SharedCharacterDataKey}`;

export const SHARED_CHARACTER_FIELD_PATHS: readonly SharedCharacterFieldPath[] = [
  'name',
  'imageUrl',
  ...SHARED_CHARACTER_DATA_KEYS.map(key => `data.${key}` as const),
];

const SHARED_CHARACTER_FIELD_PATH_SET = new Set<string>(SHARED_CHARACTER_FIELD_PATHS);

export const isSharedCharacterFieldPath = (
  field: string
): field is SharedCharacterFieldPath => SHARED_CHARACTER_FIELD_PATH_SET.has(field);
