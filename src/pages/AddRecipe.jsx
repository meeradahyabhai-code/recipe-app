import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getRecipe, saveRecipe } from '../services/storage';
import { parseRecipeText, parseBatchRecipes, detectCuisines, detectTypes, detectUtensils } from '../services/parser';

const CUISINE_OPTIONS = ['Italian', 'Indian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'French', 'Mediterranean', 'American', 'Korean'];
const TYPE_OPTIONS = ['breakfast', 'dinner', 'snack', 'appetizer', 'dessert', 'quick meal', 'party meal', 'Thanksgiving', 'Christmas'];

export default function AddRecipe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState(4);
  const [cuisines, setCuisines] = useState([]);
  const [types, setTypes] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [saved, setSaved] = useState(false);

  // Batch import state
  const [batchPreview, setBatchPreview] = useState(null); // array of parsed recipes
  const [batchResult, setBatchResult] = useState(null);   // { count }

  useEffect(() => {
    if (id) {
      const recipe = getRecipe(id);
      if (recipe) {
        setTitle(recipe.title || '');
        setIngredientsText((recipe.ingredients || []).map((i) => i.original || `${i.quantity} ${i.unit} ${i.name}`).join('\n'));
        setInstructionsText((recipe.instructions || []).join('\n'));
        setPrepTime(recipe.prepTime || '');
        setServings(recipe.servings || 4);
        setCuisines(recipe.cuisines || []);
        setTypes(recipe.types || []);
        setPhotoUrl(recipe.photoUrl || '');
      }
    }
  }, [id]);

  const isBatch = importText.includes('---');

  const handleImport = () => {
    if (isBatch) {
      // Parse all blocks and show preview
      const parsed = parseBatchRecipes(importText);
      if (parsed.length === 0) {
        setBatchPreview(null);
        setBatchResult({ count: 0 });
        return;
      }
      setBatchPreview(parsed);
      setBatchResult(null);
    } else {
      // Single recipe — fill the form
      const parsed = parseRecipeText(importText);
      setTitle(parsed.title || title);
      setIngredientsText(parsed.ingredients.map((i) => i.original).join('\n'));
      setInstructionsText(parsed.instructions.join('\n'));
      setPrepTime(parsed.prepTime || prepTime);
      setCuisines((prev) => [...new Set([...prev, ...parsed.cuisines])]);
      setTypes((prev) => [...new Set([...prev, ...parsed.types])]);
      setShowImport(false);
      setImportText('');
    }
  };

  const handleBatchSave = () => {
    if (!batchPreview || batchPreview.length === 0) return;
    let count = 0;
    for (const parsed of batchPreview) {
      const fullText = `${parsed.title} ${(parsed.ingredients || []).map((i) => i.original || i.name).join(' ')} ${(parsed.instructions || []).join(' ')}`;
      const utensils = parsed.utensils && parsed.utensils.length > 0 ? parsed.utensils : detectUtensils(fullText);
      const recipe = {
        id: uuidv4(),
        title: parsed.title,
        ingredients: parsed.ingredients || [],
        instructions: parsed.instructions || [],
        prepTime: parsed.prepTime || '',
        servings: parsed.servings || 4,
        cuisines: parsed.cuisines || [],
        types: parsed.types || [],
        utensils,
        photoUrl: '',
        rating: 0,
        notes: '',
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveRecipe(recipe);
      count++;
    }
    setBatchPreview(null);
    setBatchResult({ count });
    setImportText('');
  };

  const autoTag = () => {
    const fullText = `${title} ${ingredientsText} ${instructionsText}`;
    const detectedCuisines = detectCuisines(fullText);
    const detectedTypes = detectTypes(fullText);
    setCuisines((prev) => [...new Set([...prev, ...detectedCuisines])]);
    setTypes((prev) => [...new Set([...prev, ...detectedTypes])]);
  };

  const handleSave = () => {
    const fullText = `${title} ${ingredientsText} ${instructionsText}`;
    const ingredients = ingredientsText.split('\n').filter(Boolean).map((line) => {
      const match = line.match(/^([\d./\s½¼¾⅓⅔⅛]+)?\s*(cup|cups|tbsp|tsp|oz|lb|lbs|gram|grams|g|kg|ml|liter|liters|l|pinch|handful|clove|cloves|bunch|can|cans|package|piece|pieces|slice|slices|medium|large|small|whole)s?\s*(?:of\s+)?(.+)/i);
      if (match) {
        return {
          quantity: parseFloat(match[1]?.replace('½', '.5').replace('¼', '.25').replace('¾', '.75') || '1') || 1,
          unit: match[2]?.toLowerCase() || '',
          name: match[3]?.trim() || line,
          original: line,
        };
      }
      return { quantity: 1, unit: '', name: line.trim(), original: line };
    });

    const instructions = instructionsText.split('\n').filter(Boolean).map((l) => l.replace(/^\d+[.)]\s*/, ''));
    const utensils = detectUtensils(fullText);

    const existing = isEdit ? getRecipe(id) : null;

    const recipe = {
      id: isEdit ? id : uuidv4(),
      title,
      ingredients,
      instructions,
      prepTime,
      servings,
      cuisines,
      types,
      utensils,
      photoUrl,
      rating: existing?.rating || 0,
      notes: existing?.notes || '',
      versions: existing?.versions || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isEdit && existing) {
      recipe.versions = [
        ...(existing.versions || []),
        {
          date: new Date().toISOString(),
          title: existing.title,
          ingredientCount: (existing.ingredients || []).length,
          notes: `Updated from "${existing.title}"`,
        },
      ];
    }

    saveRecipe(recipe);
    setSaved(true);
    setTimeout(() => navigate(`/recipe/${recipe.id}`), 600);
  };

  const toggleTag = (value, list, setList) => {
    if (list.includes(value)) setList(list.filter((v) => v !== value));
    else setList([...list, value]);
  };

  return (
    <div>
      <h1>{isEdit ? 'Edit Recipe' : 'Add Recipe'}</h1>

      {saved && <div className="success-msg">Recipe saved!</div>}
      {batchResult && batchResult.count > 0 && (
        <div className="success-msg">
          Imported {batchResult.count} recipe{batchResult.count !== 1 ? 's' : ''} successfully!
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: '0.75rem' }} onClick={() => navigate('/')}>
            View Library
          </button>
        </div>
      )}
      {batchResult && batchResult.count === 0 && (
        <div className="error-msg">No recipes found. Check the format and make sure recipes are separated by ---</div>
      )}

      <button className="btn btn-secondary mb-2" onClick={() => { setShowImport(!showImport); setBatchPreview(null); setBatchResult(null); }}>
        {showImport ? 'Hide Import' : 'Import from Text'}
      </button>

      {showImport && (
        <div className="import-area mb-2">
          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setBatchPreview(null); setBatchResult(null); }}
            placeholder={`Paste one or multiple recipes. Separate multiple recipes with ---

Example single recipe:
Chicken Curry

Ingredients:
- 2 cups rice
- 1 lb chicken

Instructions:
1. Cook rice
2. Prepare chicken

Example batch import:
Recipe Name: Paneer Tikka
Cuisine: Indian
Type: appetizer, snack
Prep Time: 30 min
Servings: 4
Ingredients:
- 200g paneer, cubed
- 1 cup yogurt
- 2 tsp tikka masala
Instructions:
1. Marinate paneer in yogurt and spices
2. Grill until charred
---
Recipe Name: Pasta Aglio e Olio
Cuisine: Italian
Type: dinner, quick meal
Prep Time: 20 min
Servings: 2
Ingredients:
- 200g spaghetti
- 4 cloves garlic
- 1/4 cup olive oil
Instructions:
1. Cook pasta al dente
2. Saute garlic in olive oil
3. Toss pasta with garlic oil`}
            style={{ minHeight: '240px' }}
          />

          <div className="flex gap-1 items-center mt-1">
            <button className="btn btn-primary" onClick={handleImport}>
              {isBatch ? 'Preview All Recipes' : 'Parse & Import'}
            </button>
            {isBatch && <span className="text-sm text-muted">Multiple recipes detected (--- separator found)</span>}
          </div>

          {/* Batch preview */}
          {batchPreview && batchPreview.length > 0 && (
            <div className="batch-preview mt-2">
              <div className="flex justify-between items-center mb-1">
                <h3 style={{ margin: 0 }}>Found {batchPreview.length} recipe{batchPreview.length !== 1 ? 's' : ''}</h3>
                <button className="btn btn-primary" onClick={handleBatchSave}>
                  Save All {batchPreview.length} Recipes
                </button>
              </div>
              <div className="batch-preview-list">
                {batchPreview.map((r, idx) => (
                  <div key={idx} className="batch-preview-item">
                    <div className="flex justify-between items-center">
                      <strong>{r.title || `Untitled Recipe ${idx + 1}`}</strong>
                      {r.prepTime && <span className="tag">{r.prepTime}</span>}
                    </div>
                    <div className="meta mt-1" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {(r.cuisines || []).map((c) => <span key={c} className="tag cuisine">{c}</span>)}
                      {(r.types || []).map((t) => <span key={t} className="tag type">{t}</span>)}
                    </div>
                    <div className="text-sm text-muted mt-1">
                      {(r.ingredients || []).length} ingredients &middot; {(r.instructions || []).length} steps
                      {r.servings ? ` \u00B7 ${r.servings} servings` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single recipe form (hidden when batch preview is showing) */}
      {!batchPreview && (
        <>
          <div className="form-group">
            <label>Recipe Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Grandma's Chicken Curry" />
          </div>

          <div className="form-group">
            <label>Ingredients (one per line)</label>
            <textarea value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)}
              placeholder={'2 cups basmati rice\n1 lb chicken breast\n2 tbsp ghee\n1 tsp turmeric\n1 tsp garam masala'} />
          </div>

          <div className="form-group">
            <label>Instructions (one step per line)</label>
            <textarea value={instructionsText} onChange={(e) => setInstructionsText(e.target.value)}
              placeholder={'1. Heat ghee in a large pot\n2. Add spices and cook until fragrant\n3. Add chicken and brown on all sides'} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label>Prep Time</label>
              <input type="text" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="e.g., 30 min" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label>Servings</label>
              <input type="number" value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 1)} min="1" />
            </div>
          </div>

          <div className="form-group">
            <label>Photo URL (optional)</label>
            <input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center">
              <label>Cuisines</label>
              <button className="btn btn-secondary btn-sm" onClick={autoTag}>Auto-detect tags</button>
            </div>
            <div className="filter-tags">
              {CUISINE_OPTIONS.map((c) => (
                <button key={c} className={`filter-tag ${cuisines.includes(c) ? 'active' : ''}`}
                  onClick={() => toggleTag(c, cuisines, setCuisines)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Meal Type</label>
            <div className="filter-tags">
              {TYPE_OPTIONS.map((t) => (
                <button key={t} className={`filter-tag ${types.includes(t) ? 'active' : ''}`}
                  onClick={() => toggleTag(t, types, setTypes)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="btn-group mt-2">
            <button className="btn btn-primary" onClick={handleSave}>
              {isEdit ? 'Update Recipe' : 'Save Recipe'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
