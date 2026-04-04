# Aura Design System — Token Reference

## Decision: CSS Variables são a Fonte Canônica (DS-7)

CSS variables in `src/app/globals.css` are the single source of truth.
Tailwind tokens in `tailwind.config.ts` consume CSS vars via `var()`.

### Surface Tokens
| Token | CSS Var | Dark Value | Light Value |
|-------|---------|-----------|-------------|
| `bg-surface` | `var(--surface)` | `#0f172a` | `#ffffff` |
| `bg-surface-raised` | `var(--surface-raised)` | `#1e293b` | `#f1f5f9` |
| `bg-surface-overlay` | `var(--surface-overlay)` | `#334155` | `#e2e8f0` |
| `bg-surface-subtle` | `var(--surface-subtle)` | `rgba(30,41,59,0.5)` | `rgba(241,245,249,0.5)` |

### Border Tokens
| Token | CSS Var | Dark Value | Light Value |
|-------|---------|-----------|-------------|
| `border-border` | `var(--border)` | `#1e293b` | `#e2e8f0` |
| `border-border-subtle` | `var(--border-subtle)` | `#334155` | `#f1f5f9` |
| `border-border-focus` | `var(--border-focus)` | `#3b82f6` | `#3b82f6` |

### Typography
- **Canonical font:** Geist (imported in `layout.tsx`)
- `--font-geist-sans` CSS variable set by Next.js Geist loader
- `font-family: var(--font-geist-sans), system-ui, sans-serif;`
- Inter deprecated as primary font (DS-7)

### Opacity Modifiers
Classes like `bg-surface/50` do NOT work with `var()` color tokens.
Use `bg-surface-subtle` or explicit rgba values instead.

### MATED Zone Tokens (NOT using var() — intentional)
Zone tokens are hardcoded in tailwind.config.ts for performance.
These never change between light/dark mode.
