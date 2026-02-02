# Recipe Manager

A personal recipe management app built with React and Vite. Store, organize, and discover recipes with AI-powered features.

## Features

- **Recipe Library** — Browse, search, and filter recipes by cuisine and meal type
- **Add & Edit Recipes** — Manual entry or paste-to-import with automatic parsing
- **Batch Import** — Import multiple recipes at once separated by `---`
- **AI Recipe Generation** — Generate recipes with OpenAI based on your preferences
- **AI Chat** — Ask questions about a recipe while cooking
- **AI Remix & Suggestions** — Get creative variations or improvement ideas
- **Nutrition Facts** — Per-serving nutrition lookup via the USDA FoodData Central API
- **Serving Scaler** — Adjust servings and see ingredient quantities update automatically
- **Shopping List** — Select recipes and generate a combined shopping list
- **Ingredient Preferences** — Define ingredient swaps (e.g., butter to ghee) that AI recipes use automatically
- **Dietary Tags** — Mark dietary preferences like vegetarian, vegan, gluten-free
- **Version History** — Track changes when editing recipes
- **Rating & Notes** — Rate recipes and add personal cooking notes
- **Dark/Light Theme** — Toggle between themes
- **File-Based Storage** — All data persists in a local `recipes-data.json` file, not browser localStorage

## Getting Started

### Prerequisites

- Node.js 18+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts the storage server (port 3001) and Vite dev server (port 5173). Open http://localhost:5173.

### Production

```bash
npm run build
npm start
```

Serves the built app and API from a single Express server on port 3001.

## API Keys

Two optional API keys can be configured in Settings:

- **OpenAI API Key** — Enables AI recipe generation, chat, remix, and suggestions
- **USDA FoodData Central API Key** — Enables nutrition facts lookup. Get a free key at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup)

Keys are stored locally in `recipes-data.json`.

## Tech Stack

- React 19
- Vite
- React Router
- Express (storage server)
