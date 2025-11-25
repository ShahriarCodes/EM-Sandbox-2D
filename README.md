# EM Sandbox 2D

<div align="center">
  <img alt="EM Sandbox 2D Banner" src="https://img.shields.io/badge/EM%20Sandbox%202D-Electrostatics%20Simulator-blue?style=for-the-badge&logo=react&logoColor=white" />
</div>

<div align="center">
  <strong>Real-time 2D Electrostatics Simulator</strong><br/>
  Finite-Difference Poisson Solver • Interactive Dielectrics • Live Field Visualization
</div>

A real-time, interactive 2D electrostatics simulator powered by a finite-difference Poisson solver. Visualize electric potential fields, manipulate dielectric materials, and explore electromagnetic behavior with an intuitive web-based interface.

App is live here: https://shahriarcodes.github.io/EM-Sandbox-2D/

## Features

### 🧮 Advanced Physics Engine
- **Finite-Difference Poisson Solver** – Accurately solves ∇·(ε∇V) = 0 on a 100×100 grid using Gauss-Seidel iteration
- **Real-Time Simulation** – Runs at 60 FPS with 40 solver iterations per frame for smooth convergence
- **Dielectric Slab Support** – Interactively position and resize a dielectric region with adjustable permittivity (ε)
- **Configurable Boundary Conditions** – Set voltage on top/bottom edges; left/right edges use zero-gradient Neumann conditions

### 🎨 Rich Visualization
- **Dynamic Heatmap** – Color-coded potential field with 5 built-in colormaps:
  - Turbo (vibrant multi-color)
  - Jet (classic rainbow)
  - Hot (red to yellow)
  - Magma (dark perceptual)
  - Grayscale (minimal)
- **Electric Field Vectors** – Quiver plot showing field direction and magnitude (E = -∇V)
- **Interactive Legend** – Voltage scale with real-time tick labels
- **Smooth Scaling** – 100×100 grid upscaled to 600×600 pixels with pixel-perfect rendering

### 🎮 Intuitive Controls
- **Play/Pause** – Control simulation execution
- **Reset** – Restore default parameters and initial state
- **Parameter Tuning**:
  - Slab permittivity (1.0 – ∞)
  - Background permittivity
  - Top/bottom boundary voltages
  - Vector field styling (color, opacity, width)
- **Interactive Slab Manipulation** – Drag to move, resize from corner handle

### ⚡ Performance Optimized
- **Typed Arrays** – Float64Array for potential grid, Float32Array for permittivity
- **Efficient Canvas Rendering** – Direct 2D context with minimal redraws
- **Smart State Updates** – Decoupled solver from UI state; physics relaxation continues during parameter changes

## Quick Start

### Prerequisites
- Node.js (v16+)

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## How It Works

The solver implements the finite-difference method for the generalized Poisson equation in electrostatics. The potential V is discretized on a 2D grid, and at each step:

1. **Epsilon Grid** stores permittivity (ε) at each grid point—high inside the slab, low in background
2. **Gauss-Seidel Iteration** updates potential by averaging neighboring cells weighted by permittivity
3. **Boundary Conditions** enforce voltage on top/bottom; symmetry (zero gradient) on left/right
4. **Visualization** maps potential values to colors and computes electric field vectors

This approach converges quickly and handles material discontinuities (dielectric interfaces) naturally.

## Project Structure

```
src/
├── App.tsx                    # Main component; state coordination
├── components/
│   ├── Controls.tsx           # Parameter UI panel
│   └── SimulationCanvas.tsx   # Canvas rendering & slab interaction
├── services/
│   └── solver.ts              # Physics engine & visualization
├── types.ts                   # TypeScript interfaces
├── constants.ts               # Grid size, defaults, iteration count
├── index.tsx                  # React entry point
└── index.html                 # HTML template
```

## Configuration

Edit `constants.ts` to customize:

```typescript
export const GRID_SIZE = 100;              // Grid resolution (default: 100×100)
export const CANVAS_SIZE = 600;            // Visual size in pixels (default: 600×600)
export const ITERATIONS_PER_FRAME = 40;    // Solver iterations per frame (increase for faster convergence)
```

## Technologies

- **React 19** – UI framework with modern hooks
- **TypeScript** – Type-safe development
- **Vite** – Lightning-fast build tool
- **Canvas 2D** – High-performance rendering
- **Tailwind CSS** – Styling
- **Lucide React** – Icon library

## Deployment

This is a static web app—deploy to any hosting service:

- **Vercel**, **Netlify** – Automatic builds
- **GitHub Pages** – Via CI/CD
- **AWS S3 + CloudFront** – Direct upload

## Future Enhancements

- 3D visualization (WebGL)
- Time-dependent (non-electrostatic) solver
- Preset geometries (spheres, cylinders, parallel plates)
- Charge density visualization
- Export simulation state/animations

## License

MIT
