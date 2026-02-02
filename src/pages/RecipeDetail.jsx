import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecipe, saveRecipe, getApiKey } from '../services/storage';
import { scaleIngredients, generateShoppingList } from '../services/parser';
import { fetchNutrition } from '../services/nutrition';
import { chatWithRecipe, remixRecipe, suggestImprovements } from '../services/openai';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(4);
  const [scaledIngredients, setScaledIngredients] = useState([]);
  const [showNutrition, setShowNutrition] = useState(false);
  const [nutrition, setNutrition] = useState(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [showShopping, setShowShopping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const r = getRecipe(id);
    if (r) {
      setRecipe(r);
      setServings(r.servings || 4);
      setScaledIngredients(r.ingredients || []);
    }
  }, [id]);

  useEffect(() => {
    if (recipe) {
      const scaled = scaleIngredients(recipe.ingredients || [], recipe.servings || 4, servings);
      setScaledIngredients(scaled);
    }
  }, [servings, recipe]);

  // Fetch nutrition when panel is opened
  useEffect(() => {
    if (showNutrition && !nutrition && !nutritionLoading && recipe) {
      loadNutrition();
    }
  }, [showNutrition, nutrition]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadNutrition = async () => {
    setNutritionLoading(true);
    try {
      const result = await fetchNutrition(recipe.ingredients || [], recipe.servings || 4);
      setNutrition(result);
    } catch (err) {
      setNutrition({ error: err.message, items: [], totals: null });
    } finally {
      setNutritionLoading(false);
    }
  };

  if (!recipe) return <div className="empty-state"><h2>Recipe not found</h2></div>;

  const shoppingList = generateShoppingList([{ ingredients: scaledIngredients }]);

  const updateRating = (rating) => {
    const updated = { ...recipe, rating, updatedAt: new Date().toISOString() };
    saveRecipe(updated);
    setRecipe(updated);
  };

  const updateNotes = (notes) => {
    const updated = { ...recipe, notes, updatedAt: new Date().toISOString() };
    saveRecipe(updated);
    setRecipe(updated);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    if (!getApiKey()) { setError('Set your OpenAI API key in Settings first.'); return; }

    const userMsg = chatInput;
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    setError('');

    try {
      const history = newMessages.map(({ role, content }) => ({ role, content }));
      const reply = await chatWithRecipe(recipe, userMsg, history.slice(0, -1));
      setChatMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!getApiKey()) { setError('Set your OpenAI API key in Settings first.'); return; }
    setAiLoading(true);
    setAiResult('');
    setError('');
    try {
      const result = await remixRecipe(recipe);
      setAiResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestImprovements = async () => {
    if (!getApiKey()) { setError('Set your OpenAI API key in Settings first.'); return; }
    setAiLoading(true);
    setAiResult('');
    setError('');
    try {
      const result = await suggestImprovements(recipe);
      setAiResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="recipe-detail">
      {error && <div className="error-msg">{error}</div>}

      {recipe.photoUrl && <img src={recipe.photoUrl} alt={recipe.title} className="recipe-photo" />}

      <div className="recipe-header">
        <div>
          <h1>{recipe.title}</h1>
          <div className="meta flex gap-1 flex-wrap">
            {(recipe.cuisines || []).map((c) => <span key={c} className="tag cuisine">{c}</span>)}
            {(recipe.types || []).map((t) => <span key={t} className="tag type">{t}</span>)}
            {recipe.prepTime && <span className="tag">{recipe.prepTime}</span>}
          </div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/add/${recipe.id}`)}>Edit</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>Back</button>
        </div>
      </div>

      {/* Rating */}
      <div className="section">
        <h2>Rating</h2>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} className={star <= (recipe.rating || 0) ? 'filled' : ''}
              onClick={() => updateRating(star)}>
              {star <= (recipe.rating || 0) ? '\u2605' : '\u2606'}
            </button>
          ))}
        </div>
        <div className="mt-1">
          <textarea
            value={recipe.notes || ''}
            onChange={(e) => updateNotes(e.target.value)}
            placeholder="Add notes about this recipe... What worked? What to change next time?"
            style={{ minHeight: '60px' }}
          />
        </div>
      </div>

      {/* Servings */}
      <div className="section">
        <h2>Servings</h2>
        <div className="serving-adjuster">
          <button onClick={() => setServings(Math.max(1, servings - 1))}>-</button>
          <span>{servings}</span>
          <button onClick={() => setServings(servings + 1)}>+</button>
          <span className="text-sm text-muted">(original: {recipe.servings || 4})</span>
        </div>
      </div>

      {/* Ingredients */}
      <div className="section">
        <h2>Ingredients</h2>
        <ul className="ingredient-list">
          {scaledIngredients.map((ing, i) => (
            <li key={i}>
              <input type="checkbox" />
              <span>
                {ing.quantity % 1 === 0 ? ing.quantity : ing.quantity.toFixed(2)}{' '}
                {ing.unit} {ing.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Instructions */}
      <div className="section">
        <h2>Instructions</h2>
        <ol className="instruction-list">
          {(recipe.instructions || []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Utensils */}
      {(recipe.utensils || []).length > 0 && (
        <div className="section">
          <h2>Required Utensils</h2>
          <div className="utensil-list">
            {recipe.utensils.map((u) => <span key={u} className="utensil-tag">{u}</span>)}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="btn-group mb-2">
        <button className="btn btn-secondary" onClick={() => { setShowNutrition(!showNutrition); }}>
          {showNutrition ? 'Hide' : 'Show'} Nutrition
        </button>
        <button className="btn btn-secondary" onClick={() => setShowShopping(!showShopping)}>
          {showShopping ? 'Hide' : ''} Shopping List
        </button>
        <button className="btn btn-secondary" onClick={() => setShowChat(!showChat)}>
          {showChat ? 'Hide' : ''} AI Chat
        </button>
        <button className="btn btn-secondary" onClick={() => setShowVersions(!showVersions)}>
          {showVersions ? 'Hide' : ''} History
        </button>
      </div>

      <div className="btn-group mb-2">
        <button className="btn btn-primary" onClick={handleRemix} disabled={aiLoading}>
          {aiLoading ? 'Working...' : 'AI Remix'}
        </button>
        <button className="btn btn-primary" onClick={handleSuggestImprovements} disabled={aiLoading}>
          {aiLoading ? 'Working...' : 'Suggest Improvements'}
        </button>
      </div>

      {/* Nutrition */}
      {showNutrition && (
        <div className="section">
          <h2>Nutrition Facts (per serving)</h2>

          {nutritionLoading && (
            <div className="loading">Looking up ingredients in USDA database...</div>
          )}

          {nutrition && nutrition.error && (
            <div className="error-msg">{nutrition.error}</div>
          )}

          {nutrition && nutrition.totals && (
            <>
              <div className="nutrition-grid">
                <div className="nutrition-item">
                  <div className="value">{nutrition.totals.calories}</div>
                  <div className="label">Calories</div>
                </div>
                <div className="nutrition-item">
                  <div className="value">{nutrition.totals.protein}</div>
                  <div className="label">Protein</div>
                </div>
                <div className="nutrition-item">
                  <div className="value">{nutrition.totals.carbs}</div>
                  <div className="label">Carbs</div>
                </div>
                <div className="nutrition-item">
                  <div className="value">{nutrition.totals.fat}</div>
                  <div className="label">Fat</div>
                </div>
                <div className="nutrition-item">
                  <div className="value">{nutrition.totals.fiber}</div>
                  <div className="label">Fiber</div>
                </div>
              </div>
              <p className="text-sm text-muted mt-1">{nutrition.note}</p>

              {/* Per-ingredient breakdown */}
              {nutrition.items && nutrition.items.length > 0 && (
                <details className="mt-2" style={{ cursor: 'pointer' }}>
                  <summary className="text-sm" style={{ color: 'var(--text-label)' }}>
                    Ingredient breakdown
                  </summary>
                  <ul className="ingredient-nutrition-list mt-1">
                    {nutrition.items.map((item, i) => (
                      <li key={i} className="ingredient-nutrition-row">
                        <span className="ingredient-nutrition-name">{item.name}</span>
                        {item.found ? (
                          <span className="ingredient-nutrition-values">
                            {item.calories} cal &middot; {item.protein}g P &middot; {item.carbs}g C &middot; {item.fat}g F
                          </span>
                        ) : (
                          <span className="ingredient-nutrition-unavailable">nutrition data unavailable</span>
                        )}
                        {item.found && item.usdaMatch && (
                          <span className="ingredient-nutrition-match">matched: {item.usdaMatch}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <button className="btn btn-secondary btn-sm mt-1" onClick={() => { setNutrition(null); loadNutrition(); }}>
                Refresh
              </button>
            </>
          )}
        </div>
      )}

      {/* Shopping list */}
      {showShopping && (
        <div className="shopping-list mb-2">
          <h3>Shopping List</h3>
          <ul>
            {shoppingList.map((item, i) => (
              <li key={i}>
                <input type="checkbox" />
                <span>{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)} {item.unit} {item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Version History */}
      {showVersions && (
        <div className="section">
          <h2>Version History</h2>
          {(recipe.versions || []).length === 0 ? (
            <p className="text-muted">No previous versions. History is saved when you edit the recipe.</p>
          ) : (
            <ul className="version-list">
              {(recipe.versions || []).slice().reverse().map((v, i) => (
                <li key={i} className="version-item">
                  <div className="date">{new Date(v.date).toLocaleString()}</div>
                  <div>{v.notes}</div>
                  <div className="text-sm text-muted">{v.ingredientCount} ingredients</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* AI Result */}
      {aiResult && (
        <div className="ai-result">
          <h3 style={{ color: 'var(--accent)', marginTop: 0 }}>AI Suggestion</h3>
          {aiResult}
        </div>
      )}

      {/* Chat */}
      {showChat && (
        <div className="chat-container">
          <h3 style={{ marginTop: 0, color: 'var(--text-label)' }}>Recipe Assistant</h3>
          <p className="text-sm text-muted">Ask questions about this recipe while cooking.</p>
          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>{msg.content}</div>
            ))}
            {chatLoading && <div className="chat-msg assistant">Thinking...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="e.g., What can I substitute for this spice?"
            />
            <button className="btn btn-primary" onClick={handleChat} disabled={chatLoading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
