import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecipes, deleteRecipe } from '../services/storage';
import { generateShoppingList } from '../services/parser';

const ALL_CUISINES = ['Italian', 'Indian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'French', 'Mediterranean', 'American', 'Korean'];
const ALL_TYPES = ['breakfast', 'dinner', 'snack', 'appetizer', 'dessert', 'quick meal', 'party meal', 'Thanksgiving', 'Christmas'];

export default function Library() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState(getRecipes);
  const [search, setSearch] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showShopping, setShowShopping] = useState(false);
  const [selectedForShopping, setSelectedForShopping] = useState(new Set());

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.ingredients || []).some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
      const matchCuisine = !filterCuisine || (r.cuisines || []).includes(filterCuisine);
      const matchType = !filterType || (r.types || []).includes(filterType);
      return matchSearch && matchCuisine && matchType;
    });
  }, [recipes, search, filterCuisine, filterType]);

  const shoppingList = useMemo(() => {
    const selected = recipes.filter((r) => selectedForShopping.has(r.id));
    return generateShoppingList(selected);
  }, [recipes, selectedForShopping]);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this recipe?')) {
      deleteRecipe(id);
      setRecipes(getRecipes());
    }
  };

  const toggleShopping = (id) => {
    setSelectedForShopping((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return <span className="stars">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
  };

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <h2>No recipes yet</h2>
        <p>Add your first recipe or generate one with AI.</p>
        <div className="btn-group" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/add')}>Add Recipe</button>
          <button className="btn btn-secondary" onClick={() => navigate('/generate')}>Generate with AI</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h1>Recipe Library</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowShopping(!showShopping)}>
          {showShopping ? 'Hide Shopping List' : 'Shopping List'}
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search recipes or ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-tags">
        <span className="text-sm text-muted" style={{ marginRight: '0.3rem' }}>Cuisine:</span>
        {ALL_CUISINES.map((c) => (
          <button key={c} className={`filter-tag ${filterCuisine === c ? 'active' : ''}`}
            onClick={() => setFilterCuisine(filterCuisine === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="filter-tags">
        <span className="text-sm text-muted" style={{ marginRight: '0.3rem' }}>Type:</span>
        {ALL_TYPES.map((t) => (
          <button key={t} className={`filter-tag ${filterType === t ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === t ? '' : t)}>
            {t}
          </button>
        ))}
      </div>

      {showShopping && (
        <div className="shopping-list mb-2">
          <h3>Shopping List</h3>
          <p className="text-sm text-muted">Select recipes below to build your list.</p>
          {shoppingList.length > 0 ? (
            <ul>
              {shoppingList.map((item, i) => (
                <li key={i}>
                  <input type="checkbox" />
                  <span>{item.quantity} {item.unit} {item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No recipes selected.</p>
          )}
        </div>
      )}

      <p className="text-sm text-muted mb-1">{filtered.length} recipe{filtered.length !== 1 ? 's' : ''}</p>

      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <div key={recipe.id} className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
            {showShopping && (
              <div onClick={(e) => e.stopPropagation()} style={{ marginBottom: '0.5rem' }}>
                <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={selectedForShopping.has(recipe.id)}
                    onChange={() => toggleShopping(recipe.id)}
                    style={{ marginRight: '0.4rem' }} />
                  Add to shopping list
                </label>
              </div>
            )}
            <h3>{recipe.title}</h3>
            <div className="meta">
              {(recipe.cuisines || []).map((c) => <span key={c} className="tag cuisine">{c}</span>)}
              {(recipe.types || []).map((t) => <span key={t} className="tag type">{t}</span>)}
              {recipe.prepTime && <span className="tag">{recipe.prepTime}</span>}
            </div>
            {renderStars(recipe.rating)}
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-muted">
                {(recipe.ingredients || []).length} ingredients
              </span>
              <div className="btn-group">
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/add/${recipe.id}`); }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, recipe.id)}>Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
