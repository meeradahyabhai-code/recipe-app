import { useState } from 'react';
import { getPreferences, savePreferences, getApiKey, saveApiKey, getUsdaKey, saveUsdaKey } from '../services/storage';

export default function Settings() {
  const [prefs, setPrefs] = useState(getPreferences);
  const [apiKey, setApiKey] = useState(getApiKey);
  const [usdaKey, setUsdaKey] = useState(getUsdaKey);
  const [saved, setSaved] = useState(false);

  const updateSwap = (index, field, value) => {
    const newSwaps = [...prefs.swaps];
    newSwaps[index] = { ...newSwaps[index], [field]: value };
    setPrefs({ ...prefs, swaps: newSwaps });
  };

  const addSwap = () => {
    setPrefs({ ...prefs, swaps: [...prefs.swaps, { from: '', to: '' }] });
  };

  const removeSwap = (index) => {
    setPrefs({ ...prefs, swaps: prefs.swaps.filter((_, i) => i !== index) });
  };

  const toggleDietary = (tag) => {
    const tags = prefs.dietaryTags || [];
    if (tags.includes(tag)) {
      setPrefs({ ...prefs, dietaryTags: tags.filter((t) => t !== tag) });
    } else {
      setPrefs({ ...prefs, dietaryTags: [...tags, tag] });
    }
  };

  const handleSave = () => {
    savePreferences(prefs);
    saveApiKey(apiKey);
    saveUsdaKey(usdaKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb', 'nut-free', 'halal', 'kosher'];

  return (
    <div>
      <h1>Settings</h1>

      {saved && <div className="success-msg">Settings saved!</div>}

      {/* API Key */}
      <div className="section">
        <h2>OpenAI API Key</h2>
        <p className="text-sm text-muted mb-1">Required for AI features. Your key is stored locally in recipes-data.json.</p>
        <div className="form-group">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
      </div>

      {/* USDA API Key */}
      <div className="section">
        <h2>USDA FoodData Central API Key</h2>
        <p className="text-sm text-muted mb-1">
          Required for nutrition facts. Get a free key at{' '}
          <a href="https://fdc.nal.usda.gov/api-key-signup" target="_blank" rel="noopener noreferrer">
            fdc.nal.usda.gov/api-key-signup
          </a>.
          Stored locally in recipes-data.json.
        </p>
        <div className="form-group">
          <input
            type="password"
            value={usdaKey}
            onChange={(e) => setUsdaKey(e.target.value)}
            placeholder="Your USDA API key..."
          />
        </div>
      </div>

      {/* Ingredient Swaps */}
      <div className="section">
        <h2>Ingredient Preferences</h2>
        <p className="text-sm text-muted mb-1">
          Define your preferred 'clean' ingredient swaps. AI recipes will use these automatically.
        </p>
        {prefs.swaps.map((swap, i) => (
          <div key={i} className="swap-row">
            <input
              type="text"
              value={swap.from}
              onChange={(e) => updateSwap(i, 'from', e.target.value)}
              placeholder="Original (e.g., butter)"
            />
            <span className="swap-arrow">→</span>
            <input
              type="text"
              value={swap.to}
              onChange={(e) => updateSwap(i, 'to', e.target.value)}
              placeholder="Replacement (e.g., ghee)"
            />
            <button className="btn btn-danger btn-sm" onClick={() => removeSwap(i)}>×</button>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm mt-1" onClick={addSwap}>+ Add Swap</button>
      </div>

      {/* Dietary Preferences */}
      <div className="section">
        <h2>Dietary Preferences</h2>
        <div className="filter-tags">
          {dietaryOptions.map((tag) => (
            <button
              key={tag}
              className={`filter-tag ${(prefs.dietaryTags || []).includes(tag) ? 'active' : ''}`}
              onClick={() => toggleDietary(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="section">
        <h2>Cooking Notes</h2>
        <div className="form-group">
          <textarea
            value={prefs.notes || ''}
            onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })}
            placeholder="Any general notes about your cooking style, kitchen setup, etc."
            style={{ minHeight: '80px' }}
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
    </div>
  );
}
