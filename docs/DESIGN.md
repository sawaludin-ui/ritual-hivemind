# Hivemind — Design System v1

> **Foundation:** Dala/Refero dark cosmic system, adapted for a multi-agent dApp
> **Core difference:** Dala is a landing page; Hivemind is a living swarm. The design serves data density, agent visualization, and real-time on-chain activity — not just a single hero moment.
> **Vibe:** Dark tech + swarm emergence + trustless intelligence

---

## 0. Design Read

**Reading this as:** Web3 dApp dashboard + landing hybrid for crypto-native devs & early Ritual adopters, with a dark-cosmic / agency-sci-fi language, leaning toward Tailwind v4 + custom CSS + restrained neon.

**Dials:**
- `DESIGN_VARIANCE: 8` — asymmetric layouts, particle field as visual identity
- `MOTION_INTENSITY: 7` — swarm animations, live agent pulses, particle drift
- `VISUAL_DENSITY: 5` — dashboards need data, but void keeps it breathing

---

## 1. Color Tokens

### Base Palette (Inherited from Refero/Dala)

| Token | Hex | Role |
|-------|-----|------|
| `--color-void` | `#000000` | Page background, base canvas |
| `--color-bone` | `#ffffff` | Primary text, icons, hairlines |
| `--color-ash` | `#bdbdbd` | Secondary text, subtle borders |
| `--color-smoke` | `#9a9a9a` | Tertiary text, nav resting state |
| `--color-plum-voltage` | `#8052ff` | **Primary action** — the only filled CTA |
| `--color-amber-spark` | `#ffb829` | Outlined action borders, warning states |
| `--color-lichen` | `#15846e` | Decorative marks, success states |

### Hivemind Extended Palette (dApp-specific)

| Token | Hex | Role |
|-------|-----|------|
| `--color-swarm-active` | `#8052ff` | Agent actively thinking/executing |
| `--color-swarm-idle` | `#3a3a3a` | Agent registered but idle |
| `--color-swarm-success` | `#15846e` | Task completed, verification passed |
| `--color-swarm-fail` | `#ff4444` | Task failed, TEE rejection |
| `--color-bounty` | `#ffb829` | Bounty highlight, reward indicator |
| `--color-reputation-gold` | `#ffb829` | High reputation agent indicator |
| `--color-surface-card` | `rgba(255,255,255,0.03)` | Card background (semi-transparent) |
| `--color-surface-hover` | `rgba(255,255,255,0.06)` | Card/row hover state |
| `--color-border-card` | `rgba(255,255,255,0.08)` | Card border (1px hairline) |
| `--color-border-active` | `rgba(128,82,255,0.30)` | Active/focused border |

### Color Authority Rules (MANDATORY)
1. **Plum Voltage = single source of filled color.** Only one element per section gets a saturated fill.
2. **Never use more than 1 filled chromatic button per view.**
3. **Green (Lichen) = success/verification only.** Not an accent color, not a CTA.
4. **Amber = warning/outlined only.** Never a filled primary button.
5. **No gradients, no glows, no shadows.** Depth comes from the void + color contrast.

---

## 2. Typography

### Typeface
**Primary:** Space Grotesk (substitute for Acronym)
- **Weights:** 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Fallback:** Inter, system-ui, sans-serif
- **Mono:** JetBrains Mono (for addresses, hashes, code, contract data)

**Rule:** Single family. Weight + tracking do the work. No serifs.

### Type Scale (Adapted for dApp)

| Role | Size | Weight | Line Height | Tracking | Use |
|------|------|--------|-------------|----------|-----|
| `hero` | 72px | 300 | 0.90 | -0.04em | Landing headline (thin etched) |
| `display` | 48px | 300 | 1.00 | -0.04em | Section titles |
| `heading-lg` | 36px | 500 | 1.10 | 0.00 | Page titles, major sections |
| `heading` | 24px | 500 | 1.20 | 0.00 | Card titles, swarm labels |
| `heading-sm` | 18px | 600 | 1.30 | 0.00 | Subtask headers, agent names |
| `subheading` | 15px | 400 | 1.50 | 0.025em | Body copy, descriptions |
| `body` | 14px | 400 | 1.50 | 0.021em | Table cells, list items, metadata |
| `caption` | 12px | 500 | 1.50 | 0.05em | Eyebrows, labels, timestamps |
| `mono` | 13px | 400 | 1.50 | 0.00 | Addresses, tx hashes, code |
| `mono-sm` | 11px | 400 | 1.50 | 0.00 | Compact data, gas prices |

### Typography Rules
- **Weight 300 at 48px+ = the "etched in light" signature.** Never use weight 700 at display sizes.
- **Body minimum 14px on black.** Anything smaller loses legibility against the void.
- **Positive tracking at body sizes** (+0.021em to +0.025em). Black needs air to read.
- **Negative tracking only at 48px+ display.**
- **Mono for all blockchain data:** addresses, hashes, contract addresses, tx IDs, gas, block numbers.

---

## 3. Spacing & Layout

### Spacing Scale (6px base unit)

| Token | Value | Use |
|-------|-------|-----|
| `--spacing-6` | 6px | Icon gaps, inline separators |
| `--spacing-12` | 12px | Element gaps, label-input spacing |
| `--spacing-18` | 18px | Card internal padding (compact) |
| `--spacing-24` | 24px | Card padding (default), section padding |
| `--spacing-30` | 30px | Section gap (small) |
| `--spacing-36` | 36px | Component group spacing |
| `--spacing-60` | 60px | Major section gap |
| `--spacing-96` | 96px | Hero-to-content transition |
| `--spacing-120` | 120px | Landing section separation |

### Layout Constants
- **Page max-width:** 1400px (wider for dashboards)
- **Content max-width:** 680px (narrow for landing text blocks)
- **Card padding:** 24px
- **Section gap:** 60px
- **Grid gap:** 18px (default), 24px (spacious)

### Layout Rules
- **Dashboard: asymmetric grid.** Left sidebar (240px) + main content (flex-1). No centered panels.
- **Landing: 50/50 split hero.** Text block left (max 480px), particle field right (edge-to-edge).
- **Mobile: single column stack.** Cards go full-width, sidebar becomes bottom nav or hidden.
- **Never center a dashboard.** Dashboards are left-aligned with sidebar anchor.

---

## 4. Border Radius (Pill System)

| Element | Radius | Rule |
|---------|--------|------|
| Buttons (primary) | 24px | Full pill — the only filled element |
| Buttons (ghost) | 24px | Same pill, no fill |
| Cards | 16px | Rounded squares, not pills |
| Modals/Sheets | 16px | Top only on mobile |
| Inputs | 12px | Slightly tighter than cards |
| Tags/Badges | 24px | Full pill — status indicators |
| Tooltips | 8px | Small, functional |
| Nav items | 24px | Pill hover background |

**Rule:** Pill (24px) = interactive. Rounded square (12-16px) = container. Sharp (0px) = dividers, code blocks.

---

## 5. Surfaces & Elevation

### Surface System
| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Void | `#000000` | Base canvas — everything sits on black |
| 1 | Card | `rgba(255,255,255,0.03)` | Task cards, agent cards (subtle elevation) |
| 2 | Hover | `rgba(255,255,255,0.06)` | Row hover, interactive feedback |
| 3 | Active | `rgba(128,82,255,0.08)` | Selected item, focused element |

### Elevation Rules
- **No shadows. No glows. No gradients.**
- Depth = color contrast against void + subtle alpha surfaces.
- A "card" is a 1px hairline border + 0.03 alpha background on black.
- **Never stack more than 2 surface levels** (card → hover → active max).

---

## 6. Component Library

### 6.1 Primary Action Button
```
Background: Plum Voltage #8052ff
Text: Bone #ffffff
Font: Space Grotesk weight 600, 12px
Tracking: 0.05em, UPPERCASE
Padding: 14px 24px
Border-radius: 24px (full pill)
No border. No shadow.
```
The only filled button in the system. Use ONCE per view.

### 6.2 Ghost / Secondary Button
```
Background: transparent
Border: 1px solid rgba(255,255,255,0.12)
Text: Bone #ffffff
Font: Space Grotesk weight 500, 12px
Padding: 12px 22px
Border-radius: 24px
Hover: background rgba(255,255,255,0.04)
```

### 6.3 Outline Accent Button
```
Border: 1px solid rgba(128,82,255,0.40)
Text: Plum Voltage #8052ff (or Amber #ffb829 for warnings)
Same dimensions as ghost button.
```

### 6.4 Task Card
```
Background: rgba(255,255,255,0.03)
Border: 1px solid rgba(255,255,255,0.08)
Border-radius: 16px
Padding: 24px
Min-height: 180px

Structure:
┌────────────────────────────────────┐
│ [Status Badge]         [Bounty]    │
│                                     │
│ Task Title (18px, weight 500)       │
│ Description (14px, 2 lines max)     │
│                                     │
│ Agents: 3/8 active  •  12m left     │
│ [View Swarm →]                     │
└────────────────────────────────────┘
```

### 6.5 Agent Card
```
Same surface as Task Card.

Structure:
┌────────────────────────────────────┐
│ Agent Avatar (particle micro-icon)   │
│                                     │
│ Agent Name (16px, weight 600)       │
│ Capabilities: [research] [coding]    │
│                                     │
│ Rep: ⭐ 94  •  Tasks: 23  •  Earned │
│ Status: ● Active (Lichen dot)      │
└────────────────────────────────────┘
```

### 6.6 Swarm Viewer (Key Differentiator)
The live agent visualization panel. This is the product's signature component.

```
Full-width panel on black background.
Left: agent list with live status dots.
Center: particle field showing agent connections (lines between active agents).
Right: current task progress bar.

Agents appear as nodes in a particle constellation.
Active agents = Plum Voltage nodes with pulsing rings.
Idle agents = Smoke nodes, static.
Connections = hairline lines between collaborating agents.

Updates in real-time via WebSocket/event polling.
Every agent action (claim, think, submit) triggers a micro-animation.
```

### 6.7 Leaderboard Table
```
Full-width data table on black background.

Headers: 11px, weight 600, UPPERCASE, tracking 0.05em, color Smoke
Rows: 14px, weight 400, color Bone
Row hover: rgba(255,255,255,0.04) background
Row divider: 1px solid rgba(255,255,255,0.04)

Columns:
Rank (1-50) | Agent Name | Rep Score | Tasks Completed | Total Earned | Win Rate

Sortable columns (indicated by subtle arrow on hover).
Top 3 rows: Amber Spark (#ffb829) rank number (gold highlight).
```

### 6.8 Status Badges
```
Pill shape, 24px radius, 10-12px font.

Active/Executing: background rgba(128,82,255,0.15), text Plum Voltage
  → Animated pulsing dot (2px, Plum Voltage) before label
Completed: background rgba(21,132,110,0.15), text Lichen
Failed: background rgba(255,68,68,0.15), text #ff4444
Pending: border-only, text Smoke, no fill
Idle: text Smoke, no indicator

Micro-interaction: badge scales to 1.02 on status change.
```

### 6.9 Progress Bar
```
Background: rgba(255,255,255,0.06) (track)
Fill: Plum Voltage #8052ff (progress)
Height: 4px
Border-radius: 2px (full pill at this height)
Width: 100%

Optional: segmented (multi-agent progress per subtask).
Animated fill transition: 600ms ease-out.
```

### 6.10 Wallet / Chain Badge
```
Connected wallet indicator in header.

Background: rgba(255,255,255,0.04)
Border: 1px solid rgba(255,255,255,0.08)
Border-radius: 24px
Padding: 6px 12px

Content: truncated address (0x1234...5678) in Mono 12px
+ Network indicator dot (Lichen for testnet, Plum for mainnet)
+ Balance (optional)
```

### 6.11 Navigation Bar
```
Fixed top, 64px height, full-width.
Background: rgba(0,0,0,0.80) + backdrop-filter blur(12px)
Border-bottom: 1px solid rgba(255,255,255,0.06)

Layout:
[Logo/Wordmark Left] — [Nav Links Center-Right] — [Wallet Badge Right]

Nav links: 14px, weight 400, tracking 0.021em
  Resting: Smoke #9a9a9a
  Hover: Bone #ffffff
  Active: Plum Voltage underline (2px, 24px width indicator)

Mobile: Logo left, hamburger right. Menu slides from right.
```

### 6.12 Synthesis Report Card
```
Larger card (min-height 320px) for final task output.

Structure:
┌──────────────────────────────────────────┐
│ Synthesis Report — Task #42                │
│                                           │
│ Consensus Score: 91/100 ████████░░        │
│                                           │
│ Final Answer (body, max 80ch)             │
│ [Expand full report →]                    │
│                                           │
│ Dissenting Opinions (2):                   │
│ • Agent-5: "ZK-rollups lead in..."       │
│ • Agent-8: "Optimistic approach better..."│
│                                           │
│ Agents Contributed: 6/8                    │
│ [Rate Agents]  [Share]  [View On-Chain]   │
└──────────────────────────────────────────┘
```

### 6.13 Particle Constellation (Brand Identity)
```
Adapted from Dala: instead of a single static brain, Hivemind's constellation
represents SWARM EMERGENCE.

- Thousands of micro-shapes (triangles, circles, diamonds, squares, 2-6px)
- Clustered into organic forms suggesting networks, intelligence, collective assembly
- Colors: Plum Voltage (dominant), Amber Spark, Lichen, Bone (rare)
- Density varies: thick clusters where agents are active, sparse at edges
- Dynamic: agents that are currently "thinking" glow brighter
- Lines (hairline, 0.5px) connect collaborating agents in the swarm viewer

Hero: left text block + right particle constellation (50/50 split)
Swarm Viewer: full-width particle field with agent nodes + connection lines
Sections: each section gets a unique constellation cluster as focal anchor
Background: sparse particle drift across the entire page, density varies by section
```

---

## 7. Component States (Full Cycle)

Every interactive component must implement all states:

### Button States
- **Resting:** Plum Voltage fill
- **Hover:** Slightly lighter (Plum Voltage + 10% brightness, simulate with alpha)
- **Active/Pressed:** scale(0.98), translateY(1px) — physical push
- **Disabled:** opacity 0.30, cursor not-allowed
- **Loading:** replace text with 3-dot pulse OR spinner (not both)

### Card States
- **Resting:** 0.03 alpha + hairline border
- **Hover:** 0.06 alpha, border brightens slightly
- **Active/Selected:** Plum Voltage border (0.30 alpha), 0.08 alpha bg
- **Empty:** "No tasks yet" — centered, 1 paragraph + 1 CTA, particle background

### Input States
- **Resting:** transparent bg, 1px border rgba(255,255,255,0.10), 12px radius
- **Focus:** Plum Voltage border, no glow (glow is banned)
- **Error:** #ff4444 border, error text below
- **Disabled:** opacity 0.30
- **Placeholder:** Smoke color, never use as label

### Data States
- **Loading:** Skeleton cards matching exact layout shape (not generic spinner)
- **Empty:** Beautifully composed empty state with suggestion
- **Error:** Inline error + retry button
- **Streaming/Real-time:** Pulsing indicator dot + "Live" badge

---

## 8. Iconography

**Library:** Phosphor Icons (primary) — `@phosphor-icons/react`
- **Stroke width:** 1.5px (default), 2px (bold variant for emphasis)
- **Sizes:** 16px (inline), 20px (UI), 24px (feature), 48px+ (hero marks)
- **Colors:** Bone (default), Smoke (muted), Plum Voltage (accent), Lichen (decorative)

**One family per project.** No mixing icon libraries.

**Custom marks:**
- Agent avatar: small particle cluster icon (3-5 micro-shapes, generated, not hand-drawn)
- Logo: wordmark "HIVEMIND" in Space Grotesk weight 300, 24px, tracking -0.04em
  + small particle constellation emblem (3 dots + 2 lines, Plum Voltage)
- Empty states: single large outlined geometric icon (80-120px), centered

---

## 9. Motion & Animation

### Principles
- **Motion serves data, not decoration.**
- Swarm animations show agent state changes — functional, not gratuitous.
- No infinite-loop animations. Everything settles to rest.

### Animation Tokens
| Animation | Duration | Easing | Use |
|-----------|----------|--------|-----|
| `--transition-fast` | 150ms | ease-out | Hover states, button press |
| `--transition-normal` | 300ms | ease-out | Card expand, modal open |
| `--transition-slow` | 600ms | ease-out | Page transitions, progress fill |
| `--transition-swarm` | 800ms | ease-in-out | Agent status change, particle pulse |

### Specific Animations
1. **Agent pulse:** Active agent dot pulses (scale 1 → 1.3 → 1, 800ms loop, 3 times then rest)
2. **Particle drift:** Background particles slowly shift (1-2px per second, random direction)
3. **Connection line draw:** Lines between agents draw on collaboration (stroke-dashoffset animation)
4. **Card expand:** Task → synthesis report expands with height transition, 400ms
5. **Status badge morph:** Scale 1 → 1.02 on change, 150ms
6. **Progress fill:** Width transition, 600ms ease-out
7. **Button press:** scale(0.98) + translateY(1px), 100ms
8. **Page enter:** Content fades up 8px, 400ms, staggered per section

### Motion Rules
- **No infinite animations** (except particle drift background — that's atmospheric, not a UI element)
- **No motion for motion's sake.**
- **Reduce motion:** `prefers-reduced-motion` → disable all animations, static only
- **GPU-friendly:** animate `transform` and `opacity` only. Never `height`, `width`, or layout properties.

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Layout Change |
|-------------|-------|---------------|
| `xs` | < 480px | Single column, full-width cards, bottom nav |
| `sm` | 480-640px | Single column, slightly padded |
| `md` | 640-768px | Swarm viewer collapses to vertical list, sidebar hidden |
| `lg` | 768-1024px | Sidebar visible (collapsible), 2-col task grid |
| `xl` | 1024-1280px | Full layout: sidebar + 3-col grid + swarm viewer |
| `2xl` | 1280-1536px | Max-width 1400px centered, full particle field visible |
| `ultrawide` | > 1536px | Content capped at 1400px, extra void on sides |

### Mobile Rules
- **Every multi-column layout must declare its < 768px fallback.**
- **Swarm viewer on mobile:** vertical agent list (not particle field). Particle field becomes background only.
- **Tables on mobile:** collapse to cards (each row = a card).
- **Navigation:** bottom tab bar (mobile), top bar (desktop).
- **Modals:** full-screen sheets from bottom on mobile, centered dialog on desktop.

---

## 11. Accessibility (WCAG AA Minimum)

### Contrast Requirements
| Element | Against Background | Minimum Ratio |
|---------|-------------------|---------------|
| Body text (14px+) | `#000000` | 4.5:1 → Bone #ffffff = 21:1 ✅ |
| Large text (18px+) | `#000000` | 3:1 → Bone #ffffff = 21:1 ✅ |
| Secondary text | `#000000` | 4.5:1 → Ash #bdbdbd = 11.3:1 ✅ |
| Tertiary text | `#000000` | 4.5:1 → Smoke #9a9a9a = 7.8:1 ✅ |
| Plum Voltage on white | Never used | Invert only |
| Green (Lichen) on black | `#000000` | 4.5:1 → #15846e = 5.1:1 ✅ |
| Amber on black | `#000000` | 3:1 (large) → #ffb829 = 11.5:1 ✅ |

### Focus States
- **All interactive elements:** visible focus ring (2px Plum Voltage outline, 4px offset)
- **Skip link:** "Skip to content" — hidden until focused, first tab stop
- **Keyboard navigation:** all components reachable via Tab, Enter/Space to activate

### Screen Reader
- **All status badges:** aria-label includes state ("Task Active", "Agent Idle")
- **Swarm viewer:** aria-live="polite" region for real-time updates
- **Charts/data:** text fallback for all visual data
- **Icon-only buttons:** aria-label required

---

## 12. Data Display Patterns

### Address/Transaction Display
```
Always truncated: 0x1234...5678 (first 6, last 4)
Full address on hover/copy.
Font: JetBrains Mono 13px.
Color: Smoke (resting), Bone (hover).
Copy icon: 16px, appears on hover.
```

### Timestamps
```
Format: "2m ago", "12s ago" (relative, auto-updating)
Full timestamp on hover: "2026-06-29 14:23:45 UTC"
Font: Space Grotesk 12px, weight 400
Color: Smoke
```

### Numbers (Bounty, Reputation, Gas)
```
Large numbers: comma-separated, no decimals unless < 1
Bounty: Amber color if > 0, Smoke if 0
Reputation: Gold (Amber Spark) for top 10%, Bone for rest
Gas: Mono font, 11px, Smoke color, "~25 gwei" format
```

### Empty States (Mandatory)
```
Every list/table/grid must have a designed empty state.
Not just "No items found" — include:
- A brief explanation of what goes here
- A visual (outlined icon, 80-120px, particle background)
- A single CTA to create the first item
- Particle drift in background (atmospheric, not distracting)
```

---

## 13. Do's and Don'ts

### DO
✅ Use Plum Voltage (#8052ff) as the ONLY filled button in any view
✅ Set display headlines at weight 300, 48-72px — thin is the signature
✅ Apply 24px radius to all interactive elements, 16px to cards
✅ Use hairline borders (1px, low alpha) for cards — never shadows
✅ Let the particle constellation own 50%+ of hero real estate
✅ Keep section gaps at 60px, let the void breathe
✅ Use positive tracking (+0.021-0.05em) at body sizes and below
✅ Show all component states: loading, empty, error, active, disabled
✅ Animate agent status changes — that's the product, not decoration
✅ Truncate addresses (0x1234...5678), show full on hover
✅ Implement mobile fallback for every multi-column layout

### DON'T
❌ Never use shadows, glows, or elevation effects
❌ Never add a second filled chromatic button — one action color per view
❌ Never use weight 700 at display sizes (48px+) — 300 is the signature
❌ Never set body below 14px on black — loses legibility
❌ Never use border-radius smaller than 12px on any interactive element
❌ Never place bright text on colored background — invert only (light on dark)
❌ Never add gradients, textures, or noise to surfaces
❌ Never show raw addresses in UI without truncation
❌ Never use more than 1 eyebrow per 3 sections (eyebrow restraint)
❌ Never center a dashboard — dashboards are left-aligned
❌ Never ship a component without its empty/error/loading states

---

## 14. Page Templates

### Landing Page
```
┌──────────────────────────────────────────────────┐
│  NAV (fixed, 64px)                          │
│  [HIVEMIND]  [Manifesto] [Swarm] [Agents]   │
│                              [Connect Wallet]  │
├────────────────────────────────────────────────┤
│  HERO (50/50 split, min-h-screen)            │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ Text Block      │  │ Particle Field     │   │
│  │ (max 480px)    │  │ (brain/swarm)     │   │
│  │                │  │ edge-to-edge       │   │
│  │ Eyebrow         │  │                    │   │
│  │ Display (72px)  │  │                    │   │
│  │ Body            │  │                    │   │
│  │ CTA Pill        │  │                    │   │
│  └────────────────┘  └────────────────────┘   │
├────────────────────────────────────────────────┤
│  LIVE SWARM PREVIEW (full-width)            │
│  3 active tasks  •  12 agents online         │
│  [mini particle field showing activity]     │
├────────────────────────────────────────────────┤
│  FEATURE GRID (2x2)                         │
│  [Create Task] [Register Agent]             │
│  [Browse Swarms] [Leaderboard]              │
├────────────────────────────────────────────────┤
│  "BUILT ON RITUAL" section                   │
│  Precompile badges: LLM • HTTP • TEE        │
├────────────────────────────────────────────────┤
│  FOOTER                                      │
│  Links • Docs • Discord • GitHub • Twitter   │
└────────────────────────────────────────────────┘
```

### Task Board (Dashboard)
```
┌────────────────────────────────────────────────────┐
│  NAV                                          │
├──────────┬─────────────────────────────────────┤
│ SIDEBAR   │  MAIN (flex-1)                     │
│ (240px)    │                                      │
│            │  [Filters: All | Open | InProgress]   │
│ 📋 Tasks   │                                      │
│ 🤖 Agents  │  ┌──────┐ ┌──────┐ ┌──────┐      │
│ � Swarm    │  │Task 1│ │Task 2│ │Task 3│      │
│ 🏆 Leader  │  └──────┘ └──────┘ └──────┘      │
│ 📊 Stats   │                                      │
│            │  ┌──────┐ ┌──────┐ ┌──────┐      │
│            │  │Task 4│ │Task 5│ │Task 6│      │
│            │  └──────┘ └──────┘ └──────┘      │
├──────────┴─────────────────────────────────────┤
│  PARTICLE FIELD (background, ambient layer)    │
└────────────────────────────────────────────────────┘
```

### Swarm Viewer (Full Page)
```
┌────────────────────────────────────────────────────────┐
│  ← Back to Tasks    SWARM #42: "Best L2 Comparison"   │
│  Progress: ████████░░ 80%  •  6/8 agents               │
├────────────────────────────────────────────────────────┤
│                                                          │
│           PARTICLE CONSTELLATION (LIVE)                   │
│                                                          │
│   Agent-5 ◉ ──────────┐                                 │
│   [Thinking: ZK-rollups]│                                │
│                          ├─── Agent-2 ◉                   │
│   Agent-8 ◉ ───────────┘   [Done: Economic analysis]     │
│   [Thinking: Optimistic]                                   │
│                                                          │
│   Agent-12 ◉ (idle, waiting for task)                    │
│                                                          │
├────────────────────────────────────────────────────────┤
│  SYNTHESIS PANEL (collapsed, expands on complete)     │
│  Consensus: 91/100  •  2 dissenting opinions            │
│  [View Full Report]  [Rate Agents]  [Share]              │
└────────────────────────────────────────────────────────┘
```

---

## 15. CSS Custom Properties (Full)

```css
:root {
  /* ===== COLORS ===== */
  --color-void: #000000;
  --color-bone: #ffffff;
  --color-ash: #bdbdbd;
  --color-smoke: #9a9a9a;
  --color-plum-voltage: #8052ff;
  --color-amber-spark: #ffb829;
  --color-lichen: #15846e;

  /* Extended dApp colors */
  --color-swarm-active: #8052ff;
  --color-swarm-idle: #3a3a3a;
  --color-swarm-success: #15846e;
  --color-swarm-fail: #ff4444;
  --color-bounty: #ffb829;
  --color-reputation-gold: #ffb829;
  --color-surface-card: rgba(255, 255, 255, 0.03);
  --color-surface-hover: rgba(255, 255, 255, 0.06);
  --color-border-card: rgba(255, 255, 255, 0.08);
  --color-border-active: rgba(128, 82, 255, 0.30);

  /* ===== TYPOGRAPHY ===== */
  --font-sans: 'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Type Scale */
  --text-hero: 72px;
  --text-display: 48px;
  --text-heading-lg: 36px;
  --text-heading: 24px;
  --text-heading-sm: 18px;
  --text-subheading: 15px;
  --text-body: 14px;
  --text-caption: 12px;
  --text-mono: 13px;
  --text-mono-sm: 11px;

  /* Weights */
  --font-light: 300;
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* ===== SPACING ===== */
  --spacing-unit: 6px;
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* ===== RADIUS ===== */
  --radius-pill: 24px;
  --radius-card: 16px;
  --radius-input: 12px;
  --radius-tooltip: 8px;

  /* ===== LAYOUT ===== */
  --page-max: 1400px;
  --content-max: 680px;
  --sidebar-width: 240px;

  /* ===== ANIMATION ===== */
  --transition-fast: 150ms ease-out;
  --transition-normal: 300ms ease-out;
  --transition-slow: 600ms ease-out;
  --transition-swarm: 800ms ease-in-out;
}

/* ===== TAILWIND v4 @THEME ===== */
@theme {
  --color-void: #000000;
  --color-bone: #ffffff;
  --color-ash: #bdbdbd;
  --color-smoke: #9a9a9a;
  --color-plum-voltage: #8052ff;
  --color-amber-spark: #ffb829;
  --color-lichen: #15846e;
  --color-swarm-active: #8052ff;
  --color-swarm-idle: #3a3a3a;
  --color-swarm-success: #15846e;
  --color-swarm-fail: #ff4444;
  --color-bounty: #ffb829;
  --color-reputation-gold: #ffb829;

  --font-sans: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --text-hero: 72px;
  --text-hero--line-height: 0.9;
  --text-hero--letter-spacing: -0.04em;
  --text-hero--font-weight: 300;
  --text-display: 48px;
  --text-display--line-height: 1;
  --text-display--letter-spacing: -0.04em;
  --text-display--font-weight: 300;

  --radius-pill: 24px;
  --radius-card: 16px;
  --radius-input: 12px;
  --radius-tooltip: 8px;
}
```

---

## 16. Implementation Notes

### Font Loading
```html
<!-- Next.js: next/font -->
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
const sans = Space_Grotesk({ subsets: ['latin'], weight: ['300','400','500','600','700'] })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'] })
```

### Particle Generation
- Particles are `<canvas>` or SVG `<g>` elements, not DOM divs (performance)
- Seed-based random distribution — same seed = same constellation (deterministic for testing)
- Agent connections: lines drawn between active agent nodes in the swarm viewer
- Performance: throttle to 30fps for particle animations, 60fps for UI interactions
- Mobile: reduce particle count by 60%, disable drift animation

### Dark Mode Only
- Hivemind is dark-mode ONLY. No light mode toggle.
- The void is the brand. A light mode would destroy the visual identity.
- System dark mode preference = always on for this app.

---

## 17. File Structure (Frontend)

```
src/
├── app/
│   ├── layout.tsx          (root layout, nav, particle bg)
│   ├── page.tsx            (landing page)
│   ├── tasks/
│   │   ├── page.tsx        (task board)
│   │   └── [id]/
│   │       └── page.tsx    (swarm viewer for task)
│   ├── agents/
│   │   ├── page.tsx        (agent registry)
│   │   └── [id]/
│   │       └── page.tsx    (agent profile)
│   └── leaderboard/
│       └── page.tsx        (global rankings)
├── components/
│   ├── ui/                 (primitives: Button, Card, Badge, Input)
│   ├── layout/             (Nav, Sidebar, Footer)
│   ├── task/              (TaskCard, TaskGrid, TaskFilters)
│   ├── agent/             (AgentCard, AgentList, AgentBadge)
│   ├── swarm/             (SwarmViewer, ParticleField, AgentNode)
│   ├── data/              (DataTable, Leaderboard, Stats)
│   └── web3/              (WalletButton, ChainBadge, TxStatus)
├── styles/
│   ├── globals.css         (CSS custom properties + Tailwind)
│   └── particles.css       (particle animation keyframes)
├── hooks/
│   ├── useSwarm.ts        (swarm state + WebSocket)
│   ├── useParticles.ts   (particle renderer)
│   └── useWallet.ts     (wagmi/ethers wallet)
└── lib/
    ├── constants.ts        (contract addresses, RPC URLs)
    ├── types.ts           (TypeScript types matching Solidity structs)
    └── utils.ts           (formatters, truncators, timestamp)
```
```

