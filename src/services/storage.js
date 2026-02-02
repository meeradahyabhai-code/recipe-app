const KEYS = {
  RECIPES: 'recipe_app_recipes',
  PREFERENCES: 'recipe_app_preferences',
  API_KEY: 'recipe_app_openai_key',
  USDA_KEY: 'recipe_app_usda_key',
  THEME: 'recipe_app_theme',
};

let cache = {};

export async function initStorage() {
  const res = await fetch('/api/storage');
  cache = await res.json();
}

function persist() {
  fetch('/api/storage', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cache),
  });
}

export function getRecipes() {
  const data = cache[KEYS.RECIPES];
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : [];
}

export function saveRecipes(recipes) {
  cache[KEYS.RECIPES] = recipes;
  persist();
}

export function getRecipe(id) {
  return getRecipes().find((r) => r.id === id) || null;
}

export function saveRecipe(recipe) {
  const recipes = getRecipes();
  const idx = recipes.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) {
    recipes[idx] = recipe;
  } else {
    recipes.push(recipe);
  }
  saveRecipes(recipes);
  return recipe;
}

export function deleteRecipe(id) {
  saveRecipes(getRecipes().filter((r) => r.id !== id));
}

export function getPreferences() {
  const data = cache[KEYS.PREFERENCES];
  if (data) return typeof data === 'string' ? JSON.parse(data) : data;
  return {
    swaps: [
      { from: 'butter', to: 'ghee' },
      { from: 'all-purpose flour', to: 'wheat flour' },
      { from: 'heavy cream', to: 'Califia cream' },
      { from: 'white sugar', to: 'jaggery or coconut sugar' },
    ],
    dietaryTags: ['vegetarian'],
    notes: '',
  };
}

export function savePreferences(prefs) {
  cache[KEYS.PREFERENCES] = prefs;
  persist();
}

export function getApiKey() {
  return cache[KEYS.API_KEY] || '';
}

export function saveApiKey(key) {
  cache[KEYS.API_KEY] = key;
  persist();
}

export function getUsdaKey() {
  return cache[KEYS.USDA_KEY] || '';
}

export function saveUsdaKey(key) {
  cache[KEYS.USDA_KEY] = key;
  persist();
}

export function getTheme() {
  return cache[KEYS.THEME] || 'dark';
}

export function saveTheme(theme) {
  cache[KEYS.THEME] = theme;
  persist();
}
