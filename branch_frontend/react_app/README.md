# ATM CashPredict — React + Vite Frontend

## Project Structure

```
react_app/
├── index.html                  ← Entry HTML
├── vite.config.js              ← Vite + Flask proxy config
├── package.json
└── src/
    ├── main.jsx                ← React entry point
    ├── App.jsx                 ← Main layout (tabs, grid)
    ├── index.css               ← Global design tokens
    ├── utils/
    │   ├── api.js              ← All Flask API calls (axios)
    │   └── format.js           ← Number formatting helpers
    └── components/
        ├── Navbar.jsx          ← Top nav + health status
        ├── PredictionForm.jsx  ← Date/ATM/holiday inputs
        ├── SummaryCards.jsx    ← Total · Peak · Day type
        ├── ATMResultList.jsx   ← Per-ATM prediction bars
        ├── ConfidenceBands.jsx ← P10 / P50 / P90 chart
        ├── HistoryChart.jsx    ← 90-day area chart (Recharts)
        ├── ModelStats.jsx      ← sMAPE vs baseline bars
        └── MissingDates.jsx    ← Missing date pills
```

## Setup & Run

### 1. Install dependencies
```bash
cd branch_frontend/react_app
npm install
```

### 2. Start Flask backend (separate terminal)
```bash
cd ../../
python branch_backend/app.py
# Runs on http://127.0.0.1:5000
```

### 3. Start React dev server
```bash
npm run dev
# Opens http://localhost:3000
# Proxies API calls to Flask automatically
```

### 4. Build for production
```bash
npm run build
# Output → branch_frontend/static/react_dist/
# Flask can then serve the built files
```

## Features

| Tab | What it shows |
|---|---|
| **Predictions** | Summary cards + per-ATM bars with P50 / P90 |
| **History** | 90-day area chart per ATM (live from Flask) |
| **Model Stats** | sMAPE vs baseline comparison bars |
| **Missing Dates** | All 731 filled dates, filterable by ATM |

## Tech Stack

- **React 18** — component-based UI
- **Vite 5** — instant HMR dev server + fast build
- **Recharts** — responsive area chart
- **Axios** — HTTP client for Flask API
- **Cabinet Grotesk** — display font
- **Instrument Serif** — italic accent font
- **JetBrains Mono** — numbers / code

## Design System

Dark theme with emerald accent (`#6EE7B7`).
All design tokens are in `src/index.css` — change colors there.
