import { getApiKey, getPreferences, getRecipes } from './storage';

async function callOpenAI(messages, temperature = 0.7) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Please set your OpenAI API key in Settings.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function buildSystemPrompt(recipe = null) {
  const prefs = getPreferences();
  const swapText = prefs.swaps
    .map((s) => `Use "${s.to}" instead of "${s.from}"`)
    .join('. ');
  const dietary = prefs.dietaryTags.join(', ');

  const recipes = getRecipes();
  const topRated = recipes
    .filter((r) => r.rating >= 4)
    .slice(0, 5)
    .map((r) => r.title)
    .join(', ');

  let system = `You are a helpful cooking assistant. The user has these ingredient preferences: ${swapText}. Dietary preferences: ${dietary || 'none specified'}.`;

  if (topRated) {
    system += ` Their favorite recipes include: ${topRated}. Match this cooking style when suggesting new recipes.`;
  }

  system += ` When suggesting replacements, format as "ingredient (replacing original)". Always provide measurements and clear instructions.`;

  if (recipe) {
    system += `\n\nCurrent recipe context:\nTitle: ${recipe.title}\nIngredients: ${(recipe.ingredients || []).map((i) => i.original || i.name).join(', ')}\nInstructions: ${(recipe.instructions || []).join(' ')}`;
  }

  return system;
}

export async function chatWithRecipe(recipe, userMessage, history = []) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(recipe) },
    ...history,
    { role: 'user', content: userMessage },
  ];
  return callOpenAI(messages);
}

export async function generateRecipe(prompt) {
  const messages = [
    {
      role: 'system',
      content:
        buildSystemPrompt() +
        `\n\nGenerate a complete recipe in this exact format:
# Recipe Title

**Prep Time:** X minutes
**Servings:** X

## Ingredients
- quantity unit ingredient

## Instructions
1. Step one
2. Step two

## Notes
Any tips or variations.`,
    },
    { role: 'user', content: prompt },
  ];
  return callOpenAI(messages);
}

export async function remixRecipe(recipe) {
  const prefs = getPreferences();
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(recipe) + '\n\nRemix the current recipe using the user\'s ingredient preferences. Show each substitution clearly. Keep the same format as a full recipe.',
    },
    {
      role: 'user',
      content: `Remix this recipe "${recipe.title}" with my preferred ingredients. Show what you\'re replacing.`,
    },
  ];
  return callOpenAI(messages);
}

export async function suggestImprovements(recipe) {
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(recipe),
    },
    {
      role: 'user',
      content: `Based on this recipe "${recipe.title}" with a rating of ${recipe.rating || 'unrated'}/5 and these notes: "${recipe.notes || 'none'}", suggest specific improvements. Consider the cooking technique, seasoning, and my ingredient preferences.`,
    },
  ];
  return callOpenAI(messages);
}
