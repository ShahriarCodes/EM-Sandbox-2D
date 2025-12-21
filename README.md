# EM Sandbox 2D

<div align="center">
  <img alt="EM Sandbox 2D Banner" src="https://img.shields.io/badge/EM%20Sandbox%202D-Electrostatics%20Simulator-blue?style=for-the-badge&logo=react&logoColor=white" />
</div>

Interactive 2D electrostatics simulator (finite-difference Poisson solver). Manipulate dielectrics, set boundary voltages, and visualize potential and field vectors.

Live demo: https://em2d.mdshahriar.com

## Quick Start

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Brief Solver Math
The solver implements the generalized Poisson equation with spatially varying permittivity $\varepsilon(x,y)$:

$$
\nabla\cdot\big(\varepsilon\\nabla V\big)=0
$$


Using a conservative finite-difference discretization (grid spacing $h=1$), the in-place Gauss–Seidel update at grid cell $(i,j)$ is a weighted average of neighbors:

$$
V_{i,j} = \frac{\varepsilon_{i+1/2,j}V_{i+1,j}+\varepsilon_{i-1/2,j}V_{i-1,j}+\varepsilon_{i,j+1/2}V_{i,j+1}+\varepsilon_{i,j-1/2}V_{i,j-1}}{\varepsilon_{i+1/2,j}+\varepsilon_{i-1/2,j}+\varepsilon_{i,j+1/2}+\varepsilon_{i,j-1/2}}
$$

where face-centered permittivities are averages (e.g. $\varepsilon_{i+1/2,j}=\tfrac{\varepsilon_{i,j}+\varepsilon_{i+1,j}}{2}$). Top/bottom boundaries are Dirichlet (fixed voltage); left/right are zero-gradient Neumann.

See `services/solver.ts` and `SOLVER_MATH.md` for a full derivation and details.

## References
This project builds upon the methodology described in the paper by James R. Nagel <span style="color:#16a34a;font-weight:600">[1]</span>.


<span style="color:#16a34a;font-weight:600">[1]</span> James Nagel and Nageljr@ieee Org, "Solving the Generalized Poisson Equation Using the Finite-Difference Method (FDM)", Feb 2011. Available: https://www.researchgate.net/publication/228411289_Solving_the_Generalized_Poisson_Equation_Using_the_Finite-Difference_Method_FDM



## Project layout

Key files:
- `App.tsx` — app state & UI
- `components/SimulationCanvas.tsx` — canvas rendering and interaction
- `components/Controls.tsx` — UI controls
- `services/solver.ts` — solver implementation

## Configuration

Edit `constants.ts` to tune grid and speed:

```ts
export const GRID_SIZE = 100;
export const CANVAS_SIZE = 600;
export const ITERATIONS_PER_FRAME = 40;
```

## Deployment

Deploy with Vite-built `dist` (this repo includes a `deploy` script using `gh-pages`):

```bash
npm run build
npm run deploy
```

## License

MIT
