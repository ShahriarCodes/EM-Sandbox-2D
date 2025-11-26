# Mathematics of the 2D Finite-Difference Solver

This document explains the mathematics implemented in `services/solver.ts`. It derives the discrete update used by the code, explains boundary conditions, and links the math to the actual implementation.

## PDE (Continuous form)
We solve the generalized (steady-state) Poisson equation for electrostatics with spatially varying permittivity $\varepsilon(x,y)$:

$$
\nabla\cdot\big(\varepsilon\,\nabla V\big) = 0
$$

In expanded form (2D):

$$
\frac{\partial}{\partial x}\left(\varepsilon\,\frac{\partial V}{\partial x}\right) + \frac{\partial}{\partial y}\left(\varepsilon\,\frac{\partial V}{\partial y}\right) = 0.
$$

Here $V(x,y)$ is the electric potential and $\varepsilon(x,y)$ is the permittivity field (the code stores this on a per-cell grid). The solver in this project assumes a uniform grid with unit spacing (grid index increments represent equal physical spacing). If your grid spacing is $h$ the finite-difference formula below should include factors of $h$ accordingly.

## Discretization (Finite-Volume style / centered differences)
We index the grid by integers $(i,j)$. Let $V_{i,j}$ denote the potential at cell $(i,j)$ and $\varepsilon_{i,j}$ the permittivity at that cell center.

A conservative discretization of the divergence operator proceeds by looking at fluxes across faces. The flux across the right face between cell $(i,j)$ and $(i+1,j)$ is approximated by

$$
F_{i+1/2,j} \approx \varepsilon_{i+1/2,j}\frac{V_{i+1,j}-V_{i,j}}{h},
$$

where we use a face-centered permittivity defined by averaging adjacent cell-centered values:

$$
\varepsilon_{i+1/2,j} = \frac{\varepsilon_{i,j} + \varepsilon_{i+1,j}}{2}.
$$

Applying the divergence in discrete form and setting the result to zero gives (with $h=1$ for simplicity):

$$
F_{i+1/2,j} - F_{i-1/2,j} + F_{i,j+1/2} - F_{i,j-1/2} = 0.
$$

Substituting the flux approximations yields the linear relation

$$
\varepsilon_{i+1/2,j}(V_{i+1,j}-V_{i,j}) - \varepsilon_{i-1/2,j}(V_{i,j}-V_{i-1,j}) \\
+ \varepsilon_{i,j+1/2}(V_{i,j+1}-V_{i,j}) - \varepsilon_{i,j-1/2}(V_{i,j}-V_{i,j-1}) = 0.
$$

Collecting terms and solving for $V_{i,j}$ gives the update formula used by the code:

$$
V_{i,j} = \frac{\varepsilon_{i+1/2,j}V_{i+1,j} + \varepsilon_{i-1/2,j}V_{i-1,j} + \varepsilon_{i,j+1/2}V_{i,j+1} + \varepsilon_{i,j-1/2}V_{i,j-1}}{\varepsilon_{i+1/2,j} + \varepsilon_{i-1/2,j} + \varepsilon_{i,j+1/2} + \varepsilon_{i,j-1/2}}.
$$

This is equivalent to a weighted average of neighbors where weights are the face-centered permittivities. In the code these face permittivities are computed by averaging adjacent cell epsilons, e.g. `epsU = (eps[i] + eps[iU]) * 0.5`.

### Correspondence with the implementation in `solver.ts`
- Grid indexing: the helper `idx(x, y)` maps coordinates to a flat array index: `i = y * GRID_SIZE + x`.
- Face permittivities: in code the four half-step permittivities are computed as

```ts
const epsU = (epsGrid[i] + epsGrid[iU]) * 0.5;
const epsD = (epsGrid[i] + epsGrid[iD]) * 0.5;
const epsL = (epsGrid[i] + epsGrid[iL]) * 0.5;
const epsR = (epsGrid[i] + epsGrid[iR]) * 0.5;
```

- Update formula: the code computes `newPot` as

```ts
const newPot = (
  epsU * potGrid[iU] +
  epsD * potGrid[iD] +
  epsL * potGrid[iL] +
  epsR * potGrid[iR]
) / sumEps;
potGrid[i] = newPot;
```

which matches the discrete equation above.

## Boundary Conditions
The implementation uses mixed boundary conditions:

- **Top and bottom edges (Dirichlet)**: fixed voltages are applied. The code sets the entire top row to `voltageTop` and bottom row to `voltageBottom` in `applyBoundaries()`.

- **Left and right edges (Neumann, zero-gradient)**: the code enforces zero horizontal gradient by copying the adjacent cell value into the boundary cell. Concretely, during the internal update the code handles `x === 0` and `x === GRID_SIZE - 1` by setting

```ts
if (x === 0) potGrid[idx(x, y)] = potGrid[idx(x + 1, y)];
if (x === GRID_SIZE - 1) potGrid[idx(x, y)] = potGrid[idx(x - 1, y)];
```

This approximates $\frac{\partial V}{\partial x} = 0$ at the left/right boundaries.

## Iterative Solver: Gauss–Seidel
The code uses an in-place Gauss–Seidel iteration: updates are written directly into the `potGrid` array, so each new value is immediately used by subsequent updates in the same sweep. This generally converges faster than the Jacobi method (which uses a separate buffer) for the same number of updates.

In `solveStep()` the code repeats the inner update `ITERATIONS_PER_FRAME` times per animation frame to accelerate relaxation. This parameter controls the convergence speed vs CPU cost.

### Convergence notes
- The method is unaccelerated Gauss–Seidel; convergence is guaranteed for this elliptic problem under reasonable conditions, but it can be slow for large grids or high-contrast permittivities.
-- Successive Over-Relaxation (SOR) or multigrid methods can dramatically reduce iteration counts. SOR introduces a relaxation parameter $\omega$ and updates as

$$
V_{i,j}^{(new)} = V_{i,j}^{(old)} + \omega\left(\hat{V}_{i,j} - V_{i,j}^{(old)}\right)
$$

where $\hat{V}_{i,j}$ is the Gauss–Seidel update above. Typical $\omega$ values are in $(1,2)$ for acceleration.

## Numerical considerations and implementation choices
- **Typed arrays**: potentials are stored in `Float64Array` (double precision) for numeric accuracy; permittivities are `Float32Array` which is sufficient for ε maps and saves memory.
-- **Grid spacing**: the implementation treats grid spacing as unity ($h = 1$). To convert to physical units scale potentials or include explicit `h` factors in fluxes.
- **Epsilon rasterization**: `updateEpsilonGrid()` rasterizes a rectangular slab by assigning `epsilonSlab` to cells inside the slab bounding box and `epsilonBg` elsewhere. The face-centered averaging handles permittivity discontinuities at material interfaces naturally in the discrete operator.

## Electric Field (post-processing)
The code computes the electric field \(\mathbf{E} = -\nabla V\) using central differences for visualization (vector field):

$$
E_x \approx -\frac{V_{i+1,j} - V_{i-1,j}}{2h}, \qquad E_y \approx -\frac{V_{i,j+1} - V_{i,j-1}}{2h}.
$$

In the implementation `renderVectorField()` computes these differences and draws arrows with a stride (spacing) to avoid clutter.

## Reference
- The finite-difference discretization for generalized Poisson equations is described in:

"Solving the Generalized Poisson Equation Using the Finite-Difference Method (FDM)" — available at: https://www.researchgate.net/publication/228411289_Solving_the_Generalized_Poisson_Equation_Using_the_Finite-Difference_Method_FDM