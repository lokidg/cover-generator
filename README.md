# Cover Generator

A React + Vite tool for generating social media cover images using the Heerich generative art engine. It produces isometric voxel compositions with real-time parameter tuning via a DialKit floating control panel, and exports as PNG or animated GIF.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-latest-purple)

## Features

- **Generative isometric art** — Seeded PRNG-based compositions with configurable clusters, primitives, and camera angles
- **Real-time controls** — DialKit floating panel for tweaking parameters (seed, cluster count, opacity, grid size, etc.)
- **Text overlay** — Add your name and title on top of the generated art
- **Dimension presets** — LinkedIn (1584×396), Twitter/X, Facebook, or custom dimensions
- **PNG export** — Download the current composition as a high-res PNG
- **GIF export** — Render multi-frame animated GIFs with progress tracking
- **Preset system** — Save and load parameter configurations

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd cover-generator

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build for production (output in `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `dialkit` | Floating control panel for parameter tuning |
| `motion` | Animations (used by DialKit) |
| `gif.js` | Client-side GIF encoding for animated exports |

### External (CDN)

| Resource | Purpose |
|----------|---------|
| [Heerich](https://cdn.jsdelivr.net/npm/heerich@latest/dist/heerich.js) | Isometric voxel rendering engine |
| Google Fonts (Outfit + Inter) | Typography |

### Dev

| Package | Purpose |
|---------|---------|
| `vite` / `@vitejs/plugin-react` | Build tooling and HMR |
| `vitest` | Test runner |
| `jsdom` | DOM environment for tests |
| `fast-check` | Property-based testing |
| `vitest-canvas-mock` | Canvas API mocking in tests |
| `@vitest/coverage-v8` | Code coverage |

## Project Structure

```
src/
├── components/        # React UI components (CanvasViewport, Toolbar, ProgressOverlay)
├── dialkit/           # DialKit composition panel hook
├── engine/            # Composition engine, Gestalt constraints, seeded PRNG, Heerich adapter
├── export/            # PNG and GIF export modules
├── hooks/             # Custom hooks (canvas resize, composition params, dimensions)
├── presets/           # Preset save/load system
├── rendering/         # SVG-to-canvas rasterization, text overlay rendering
├── styles/            # CSS tokens and app styles
├── App.jsx            # Root component
└── main.jsx           # Entry point
```

## Usage

1. **Adjust parameters** — Use the DialKit panel (bottom of screen) to tweak seed, cluster count, opacity, camera angle, and grid size.
2. **Add text** — Enter your name and title in the floating input panel (top-left).
3. **Pick dimensions** — Select a social media preset or enter custom width/height.
4. **Regenerate** — Click the ↻ button to generate a new composition with the current seed.
5. **Export** — Use the toolbar to download as PNG or render an animated GIF.

## Design Tokens

The app uses a consistent design language:

- Background: `#FAFAFA` / Surfaces: `#FFFFFF`
- Primary text: `#0F172A` / Secondary: `#475569`
- Accent: `#4F46E5` (indigo)
- Fonts: Outfit (headings) + Inter (body)
- 8px spacing grid

## License

Private project.
