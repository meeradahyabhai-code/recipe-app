import { getUsdaKey } from './storage';

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// Cache USDA lookups in memory to avoid repeated calls for the same ingredient
const cache = {};

async function searchUSDA(query, apiKey) {
  const cacheKey = query.toLowerCase().trim();
  if (cache[cacheKey]) return cache[cacheKey];

  const params = new URLSearchParams({
    api_key: apiKey,
    query: cacheKey,
    pageSize: '1',
    dataType: 'Foundation,SR Legacy',
  });

  const res = await fetch(`${USDA_SEARCH_URL}?${params}`);
  if (!res.ok) {
    if (res.status === 403) throw new Error('Invalid USDA API key. Check your key in Settings.');
    if (res.status === 429) throw new Error('USDA API rate limit reached. Try again shortly.');
    throw new Error(`USDA API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.foods || data.foods.length === 0) {
    cache[cacheKey] = null;
    return null;
  }

  const food = data.foods[0];
  const nutrients = {};
  for (const n of food.foodNutrients || []) {
    const name = n.nutrientName || '';
    if (name === 'Energy') nutrients.calories = n.value || 0;
    if (name === 'Protein') nutrients.protein = n.value || 0;
    if (name === 'Carbohydrate, by difference') nutrients.carbs = n.value || 0;
    if (name === 'Total lipid (fat)') nutrients.fat = n.value || 0;
    if (name === 'Fiber, total dietary') nutrients.fiber = n.value || 0;
  }

  const result = {
    description: food.description,
    // USDA values are per 100g
    caloriesPer100g: nutrients.calories || 0,
    proteinPer100g: nutrients.protein || 0,
    carbsPer100g: nutrients.carbs || 0,
    fatPer100g: nutrients.fat || 0,
    fiberPer100g: nutrients.fiber || 0,
  };

  cache[cacheKey] = result;
  return result;
}

// Rough gram estimate from common units — used to convert ingredient quantities
// to grams for the USDA per-100g values
const GRAMS_PER_UNIT = {
  cup: 150, cups: 150,
  tbsp: 15, tablespoon: 15,
  tsp: 5, teaspoon: 5,
  oz: 28, ounce: 28,
  lb: 454, lbs: 454, pound: 454,
  gram: 1, grams: 1, g: 1,
  kg: 1000,
  ml: 1, liter: 1000, liters: 1000, l: 1000,
  clove: 5, cloves: 5,
  slice: 30, slices: 30,
  piece: 100, pieces: 100,
  medium: 150, large: 200, small: 100,
  can: 400, cans: 400,
  bunch: 150, bunches: 150,
  handful: 30,
  pinch: 1,
  whole: 100,
  package: 400, packages: 400,
};

function estimateGrams(ingredient) {
  const unit = (ingredient.unit || '').toLowerCase();
  const qty = ingredient.quantity || 1;
  const gramsPerUnit = GRAMS_PER_UNIT[unit] || 100;
  return qty * gramsPerUnit;
}

/**
 * Fetch nutrition for a list of ingredients using USDA FoodData Central.
 * Returns per-serving values.
 *
 * Each ingredient result includes { found, calories, protein, carbs, fat, fiber, name, usdaMatch }
 */
export async function fetchNutrition(ingredients, servings = 1) {
  const apiKey = getUsdaKey();
  if (!apiKey) {
    return {
      error: 'Set your USDA FoodData Central API key in Settings to see nutrition facts.',
      items: [],
      totals: null,
    };
  }

  const s = Math.max(1, parseInt(servings) || 1);
  const items = [];
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
  let foundCount = 0;
  let notFoundCount = 0;

  // Process ingredients — run lookups in parallel (batches of 5 to avoid hammering the API)
  const batchSize = 5;
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (ing) => {
        try {
          const usda = await searchUSDA(ing.name, apiKey);
          if (!usda) {
            return { ingredient: ing, usda: null };
          }
          return { ingredient: ing, usda };
        } catch (err) {
          // If the API key is bad or rate-limited, throw to stop everything
          if (err.message.includes('API key') || err.message.includes('rate limit')) {
            throw err;
          }
          return { ingredient: ing, usda: null };
        }
      })
    );

    for (const { ingredient, usda } of results) {
      if (usda) {
        const grams = estimateGrams(ingredient);
        const factor = grams / 100;
        const cal = Math.round(usda.caloriesPer100g * factor);
        const pro = Math.round(usda.proteinPer100g * factor * 10) / 10;
        const car = Math.round(usda.carbsPer100g * factor * 10) / 10;
        const fat = Math.round(usda.fatPer100g * factor * 10) / 10;
        const fib = Math.round(usda.fiberPer100g * factor * 10) / 10;

        totalCal += cal;
        totalProtein += pro;
        totalCarbs += car;
        totalFat += fat;
        totalFiber += fib;
        foundCount++;

        items.push({
          found: true,
          name: ingredient.name,
          usdaMatch: usda.description,
          calories: cal,
          protein: pro,
          carbs: car,
          fat: fat,
          fiber: fib,
        });
      } else {
        notFoundCount++;
        items.push({
          found: false,
          name: ingredient.name,
          usdaMatch: null,
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          fiber: null,
        });
      }
    }
  }

  return {
    error: null,
    items,
    foundCount,
    notFoundCount,
    totals: {
      calories: Math.round(totalCal / s),
      protein: `${Math.round(totalProtein / s)}g`,
      carbs: `${Math.round(totalCarbs / s)}g`,
      fat: `${Math.round(totalFat / s)}g`,
      fiber: `${Math.round(totalFiber / s)}g`,
      servings: s,
    },
    note: notFoundCount > 0
      ? `Based on USDA data for ${foundCount} of ${foundCount + notFoundCount} ingredients. ${notFoundCount} not found.`
      : `Based on USDA FoodData Central (${foundCount} ingredients)`,
  };
}
