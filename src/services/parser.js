// Parse free-text recipe into structured data

const CUISINE_KEYWORDS = {
  Italian: ['pasta', 'risotto', 'pesto', 'marinara', 'parmesan', 'mozzarella', 'basil', 'oregano', 'prosciutto', 'tiramisu', 'pizza', 'lasagna', 'gnocchi', 'bruschetta', 'caprese'],
  Indian: ['curry', 'masala', 'turmeric', 'cumin', 'coriander', 'garam masala', 'ghee', 'paneer', 'dal', 'naan', 'chapati', 'biryani', 'tandoori', 'chutney', 'samosa', 'dosa', 'idli'],
  Mexican: ['tortilla', 'salsa', 'cilantro', 'jalapeño', 'jalapeno', 'avocado', 'taco', 'burrito', 'enchilada', 'chipotle', 'queso', 'guacamole', 'lime', 'cumin'],
  Chinese: ['soy sauce', 'ginger', 'sesame', 'wok', 'tofu', 'rice vinegar', 'hoisin', 'bok choy', 'five spice', 'szechuan', 'dumpling', 'stir fry'],
  Japanese: ['miso', 'wasabi', 'sushi', 'teriyaki', 'mirin', 'dashi', 'nori', 'ramen', 'udon', 'tempura', 'sake'],
  Thai: ['coconut milk', 'lemongrass', 'thai basil', 'fish sauce', 'galangal', 'pad thai', 'green curry', 'red curry'],
  French: ['béchamel', 'bechamel', 'croissant', 'roux', 'beurre', 'gratin', 'crème', 'soufflé', 'quiche'],
  Mediterranean: ['olive oil', 'feta', 'hummus', 'tahini', 'pita', 'za\'atar', 'sumac', 'chickpea'],
  American: ['bbq', 'barbecue', 'coleslaw', 'cornbread', 'mac and cheese', 'biscuit', 'gravy'],
  Korean: ['kimchi', 'gochujang', 'sesame oil', 'bulgogi', 'bibimbap', 'korean'],
};

const TYPE_KEYWORDS = {
  breakfast: ['pancake', 'waffle', 'omelette', 'omelet', 'eggs', 'toast', 'cereal', 'smoothie', 'granola', 'porridge', 'breakfast', 'brunch', 'hash brown', 'french toast', 'dosa', 'idli', 'poha', 'upma'],
  dinner: ['roast', 'steak', 'casserole', 'stew', 'curry', 'biryani', 'pasta', 'lasagna', 'risotto', 'dinner'],
  snack: ['chips', 'dip', 'popcorn', 'nuts', 'trail mix', 'snack', 'crackers', 'energy ball', 'samosa', 'pakora'],
  appetizer: ['bruschetta', 'spring roll', 'soup', 'salad', 'crostini', 'appetizer', 'starter', 'hummus'],
  dessert: ['cake', 'cookie', 'pie', 'ice cream', 'chocolate', 'brownie', 'tiramisu', 'pudding', 'custard', 'dessert', 'sweet', 'halwa', 'gulab jamun', 'kheer'],
  'quick meal': ['stir fry', '15 min', '20 min', '30 min', 'quick', 'easy', 'simple', 'one pot', 'instant'],
  'party meal': ['party', 'crowd', 'potluck', 'buffet', 'entertaining', 'large batch', 'feast'],
  Thanksgiving: ['thanksgiving', 'turkey', 'cranberry sauce', 'stuffing', 'pumpkin pie', 'sweet potato casserole'],
  Christmas: ['christmas', 'gingerbread', 'eggnog', 'candy cane', 'yule', 'holiday'],
};

const UTENSIL_KEYWORDS = {
  'Oven': ['bake', 'roast', 'broil', 'oven', '°f', '°c', 'preheat', 'baking sheet', 'baking dish'],
  'Stovetop': ['sauté', 'saute', 'simmer', 'boil', 'fry', 'pan', 'skillet', 'pot', 'saucepan', 'stove'],
  'Blender': ['blend', 'puree', 'smoothie', 'blender'],
  'Food Processor': ['food processor', 'pulse', 'process until'],
  'Mixing Bowl': ['mix', 'whisk', 'combine', 'stir', 'fold', 'bowl'],
  'Baking Sheet': ['baking sheet', 'sheet pan', 'cookie sheet'],
  'Cast Iron Skillet': ['cast iron', 'sear'],
  'Wok': ['wok', 'stir fry', 'stir-fry'],
  'Grill': ['grill', 'grilled', 'barbecue', 'bbq'],
  'Instant Pot / Pressure Cooker': ['instant pot', 'pressure cook'],
  'Air Fryer': ['air fry', 'air fryer'],
  'Rolling Pin': ['roll out', 'rolling pin', 'roll the dough'],
  'Whisk': ['whisk'],
  'Spatula': ['flip', 'spatula'],
  'Knife & Cutting Board': ['chop', 'dice', 'mince', 'slice', 'julienne', 'cut'],
  'Colander': ['drain', 'colander', 'strainer'],
  'Measuring Cups & Spoons': ['cup', 'tablespoon', 'teaspoon', 'tbsp', 'tsp'],
};

export function parseRecipeText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let title = '';
  const ingredients = [];
  const instructions = [];
  let section = 'unknown';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('ingredient')) {
      section = 'ingredients';
      continue;
    }
    if (lower.includes('instruction') || lower.includes('direction') || lower.includes('method') || lower.includes('steps') || lower === 'preparation') {
      section = 'instructions';
      continue;
    }

    if (!title && section === 'unknown') {
      title = line.replace(/^#\s*/, '');
      continue;
    }

    const cleaned = line.replace(/^[-•*\d.)\]]+\s*/, '');
    if (section === 'ingredients' || (section === 'unknown' && isIngredientLine(line))) {
      if (cleaned) ingredients.push(parseIngredient(cleaned));
    } else if (section === 'instructions') {
      if (cleaned) instructions.push(cleaned);
    } else if (section === 'unknown' && cleaned) {
      // guess
      if (isIngredientLine(line)) {
        ingredients.push(parseIngredient(cleaned));
      } else {
        instructions.push(cleaned);
      }
    }
  }

  const fullText = text.toLowerCase();
  const cuisines = detectTags(fullText, CUISINE_KEYWORDS);
  const types = detectTags(fullText, TYPE_KEYWORDS);
  const utensils = detectTags(fullText, UTENSIL_KEYWORDS);
  const prepTime = extractPrepTime(fullText);

  return { title, ingredients, instructions, cuisines, types, utensils, prepTime };
}

function isIngredientLine(line) {
  // Lines with quantities likely ingredients
  return /^\s*[-•*]?\s*\d/.test(line) || /\b(cup|tbsp|tsp|oz|lb|gram|ml|liter|pinch|handful|clove|bunch)\b/i.test(line);
}

function parseIngredient(text) {
  const match = text.match(/^([\d./\s½¼¾⅓⅔⅛]+)?\s*(cup|cups|tbsp|tsp|oz|lb|lbs|gram|grams|g|kg|ml|liter|liters|l|pinch|handful|clove|cloves|bunch|bunches|can|cans|package|packages|piece|pieces|slice|slices|medium|large|small|whole)s?\s*(?:of\s+)?(.+)/i);
  if (match) {
    return {
      quantity: parseFraction(match[1]?.trim() || '1'),
      unit: match[2]?.trim().toLowerCase() || '',
      name: match[3]?.trim() || text,
      original: text,
    };
  }
  return { quantity: 1, unit: '', name: text, original: text };
}

function parseFraction(str) {
  if (!str) return 1;
  str = str.replace('½', '.5').replace('¼', '.25').replace('¾', '.75').replace('⅓', '.333').replace('⅔', '.667').replace('⅛', '.125');
  if (str.includes('/')) {
    const parts = str.split('/');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  const parts = str.trim().split(/\s+/);
  return parts.reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
}

function detectTags(text, keywordMap) {
  const found = [];
  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.push(tag);
    }
  }
  return found;
}

function extractPrepTime(text) {
  const match = text.match(/(\d+)\s*(min|minute|hour|hr)/i);
  if (match) {
    const val = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('h')) return `${val} hour${val > 1 ? 's' : ''}`;
    return `${val} min`;
  }
  return '';
}

// --- Batch import: split on '---' and parse each block with structured fields ---

const CUISINE_CANONICAL = {
  italian: 'Italian', indian: 'Indian', mexican: 'Mexican', chinese: 'Chinese',
  japanese: 'Japanese', thai: 'Thai', french: 'French', mediterranean: 'Mediterranean',
  american: 'American', korean: 'Korean',
};

const TYPE_CANONICAL = {
  breakfast: 'breakfast', dinner: 'dinner', snack: 'snack', appetizer: 'appetizer',
  dessert: 'dessert', 'quick meal': 'quick meal', 'party meal': 'party meal',
  thanksgiving: 'Thanksgiving', christmas: 'Christmas',
};

function matchField(lines, index) {
  // Return { key, value, nextIndex } by reading "Key: Value" lines
  const line = lines[index];
  const m = line.match(/^([A-Za-z ]+):\s*(.*)/);
  if (m) return { key: m[1].trim().toLowerCase(), value: m[2].trim(), nextIndex: index + 1 };
  return null;
}

function collectListLines(lines, startIndex) {
  const items = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    // Stop if we hit the next field header ("SomeWord:")
    if (/^[A-Za-z ]+:\s*/.test(line) && !/^\d/.test(line)) break;
    const cleaned = line.replace(/^[-•*\d.)\]]+\s*/, '').trim();
    if (cleaned) items.push(cleaned);
    i++;
  }
  return { items, nextIndex: i };
}

function parseStructuredBlock(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let title = '';
  let cuisineField = '';
  let typeField = '';
  let prepTime = '';
  let servings = 4;
  const rawIngredients = [];
  const rawInstructions = [];

  let i = 0;
  while (i < lines.length) {
    const field = matchField(lines, i);
    if (field) {
      const k = field.key;
      if (k === 'recipe name' || k === 'name' || k === 'title' || k === 'recipe') {
        title = field.value;
        i = field.nextIndex;
      } else if (k === 'cuisine') {
        cuisineField = field.value;
        i = field.nextIndex;
      } else if (k === 'type' || k === 'meal type' || k === 'category') {
        typeField = field.value;
        i = field.nextIndex;
      } else if (k === 'prep time' || k === 'time' || k === 'cook time' || k === 'total time') {
        prepTime = field.value;
        i = field.nextIndex;
      } else if (k === 'servings' || k === 'serves' || k === 'yield') {
        servings = parseInt(field.value) || 4;
        i = field.nextIndex;
      } else if (k === 'ingredients') {
        if (field.value) rawIngredients.push(field.value);
        i = field.nextIndex;
        const list = collectListLines(lines, i);
        rawIngredients.push(...list.items);
        i = list.nextIndex;
      } else if (k === 'instructions' || k === 'directions' || k === 'steps' || k === 'method') {
        if (field.value) rawInstructions.push(field.value);
        i = field.nextIndex;
        const list = collectListLines(lines, i);
        rawInstructions.push(...list.items);
        i = list.nextIndex;
      } else {
        // Unknown field, skip
        i = field.nextIndex;
      }
    } else {
      // First non-field line becomes title if we don't have one yet
      if (!title) {
        title = lines[i].replace(/^#\s*/, '');
      }
      i++;
    }
  }

  // If no structured fields were found, fall back to the free-text parser
  if (rawIngredients.length === 0 && rawInstructions.length === 0) {
    return parseRecipeText(text);
  }

  // Parse cuisine field into tags
  const cuisines = [];
  if (cuisineField) {
    for (const part of cuisineField.split(/[,\/&]+/)) {
      const normalized = part.trim().toLowerCase();
      if (CUISINE_CANONICAL[normalized]) cuisines.push(CUISINE_CANONICAL[normalized]);
    }
  }

  // Parse type field into tags
  const types = [];
  if (typeField) {
    for (const part of typeField.split(/[,\/&]+/)) {
      const normalized = part.trim().toLowerCase();
      if (TYPE_CANONICAL[normalized]) types.push(TYPE_CANONICAL[normalized]);
    }
  }

  // Also auto-detect from the full text
  const fullText = text.toLowerCase();
  const detectedCuisines = detectTags(fullText, CUISINE_KEYWORDS);
  const detectedTypes = detectTags(fullText, TYPE_KEYWORDS);
  const utensils = detectTags(fullText, UTENSIL_KEYWORDS);

  const mergedCuisines = [...new Set([...cuisines, ...detectedCuisines])];
  const mergedTypes = [...new Set([...types, ...detectedTypes])];

  if (!prepTime) prepTime = extractPrepTime(fullText);

  const ingredients = rawIngredients.map((line) => parseIngredient(line));
  const instructions = rawInstructions.map((line) => line.replace(/^\d+[.)]\s*/, ''));

  return { title, ingredients, instructions, cuisines: mergedCuisines, types: mergedTypes, utensils, prepTime, servings };
}

export function parseBatchRecipes(text) {
  const blocks = text.split(/^-{3,}$/m);
  const results = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const parsed = parseStructuredBlock(trimmed);
    if (parsed && parsed.title) results.push(parsed);
  }
  return results;
}

export function detectCuisines(text) {
  return detectTags(text.toLowerCase(), CUISINE_KEYWORDS);
}

export function detectTypes(text) {
  return detectTags(text.toLowerCase(), TYPE_KEYWORDS);
}

export function detectUtensils(text) {
  return detectTags(text.toLowerCase(), UTENSIL_KEYWORDS);
}

export function scaleIngredients(ingredients, originalServings, newServings) {
  const factor = newServings / originalServings;
  return ingredients.map((ing) => ({
    ...ing,
    quantity: Math.round(ing.quantity * factor * 100) / 100,
  }));
}

export function generateShoppingList(recipes) {
  const map = {};
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients || []) {
      const key = ing.name.toLowerCase();
      if (map[key]) {
        map[key].quantity += ing.quantity;
      } else {
        map[key] = { ...ing };
      }
    }
  }
  return Object.values(map);
}

export function estimateNutrition(ingredients) {
  // Rough per-ingredient calorie estimates
  const calorieMap = {
    'chicken': 165, 'rice': 130, 'pasta': 131, 'bread': 79, 'egg': 78,
    'butter': 102, 'ghee': 112, 'oil': 120, 'olive oil': 120,
    'sugar': 49, 'flour': 57, 'milk': 42, 'cream': 51,
    'cheese': 113, 'paneer': 82, 'tofu': 76, 'potato': 77,
    'onion': 11, 'garlic': 4, 'tomato': 22, 'carrot': 25,
    'spinach': 7, 'broccoli': 31, 'pepper': 20, 'mushroom': 15,
    'lentil': 116, 'chickpea': 164, 'bean': 127, 'dal': 116,
    'coconut milk': 230, 'yogurt': 59, 'sour cream': 54,
    'beef': 250, 'pork': 242, 'fish': 136, 'shrimp': 99,
    'avocado': 160, 'banana': 89, 'apple': 52, 'lemon': 12,
    'honey': 64, 'chocolate': 155, 'nuts': 173, 'almond': 164,
    'oats': 68, 'quinoa': 120, 'corn': 86,
  };

  let totalCal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const ing of ingredients) {
    const name = ing.name.toLowerCase();
    let matched = false;
    for (const [key, cal] of Object.entries(calorieMap)) {
      if (name.includes(key)) {
        totalCal += cal * ing.quantity;
        matched = true;
        break;
      }
    }
    if (!matched) totalCal += 30 * ing.quantity;
  }

  protein = Math.round(totalCal * 0.2 / 4);
  carbs = Math.round(totalCal * 0.5 / 4);
  fat = Math.round(totalCal * 0.3 / 9);

  return {
    calories: Math.round(totalCal),
    protein: `${protein}g`,
    carbs: `${carbs}g`,
    fat: `${fat}g`,
    fiber: `${Math.round(ingredients.length * 0.8)}g`,
    note: 'Estimated values - actual nutrition may vary',
  };
}

export { UTENSIL_KEYWORDS };
