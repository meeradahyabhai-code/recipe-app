import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Library from './pages/Library';
import RecipeDetail from './pages/RecipeDetail';
import AddRecipe from './pages/AddRecipe';
import Settings from './pages/Settings';
import GenerateRecipe from './pages/GenerateRecipe';
import { getTheme, saveTheme } from './services/storage';
import './App.css';

function useTheme() {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}

function NavBar({ theme, onToggleTheme }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">Recipe Manager</Link>
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>Library</Link>
        <Link to="/add" className={isActive('/add')}>+ Add</Link>
        <Link to="/generate" className={isActive('/generate')}>AI</Link>
        <Link to="/settings" className={isActive('/settings')}>Settings</Link>
        <button className="theme-toggle" onClick={onToggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '\u2600' : '\u263D'}
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <BrowserRouter>
      <NavBar theme={theme} onToggleTheme={toggle} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/add" element={<AddRecipe />} />
          <Route path="/add/:id" element={<AddRecipe />} />
          <Route path="/generate" element={<GenerateRecipe />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
