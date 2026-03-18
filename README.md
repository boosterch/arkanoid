# Arkanoid — Development Documentation

> A complete brick-breaker game built step-by-step with **Matter.js** physics engine.  
> Developed by **Jekko**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [File Structure](#file-structure)
4. [Step-by-Step Build Log](#step-by-step-build-log)
5. [Game Features](#game-features)
6. [Level Definitions](#level-definitions)
7. [Power-Up System](#power-up-system)
8. [Controls](#controls)
9. [Architecture Notes](#architecture-notes)

---

## Project Overview

A classic Arkanoid (brick-breaker) game running entirely in the browser with no build tools.  
Uses **Matter.js** for 2D physics (ball bouncing, collisions) and the **Canvas API** for all custom rendering (gradients, particles, glow effects).  
Sound is generated procedurally via the **Web Audio API** — no audio files needed.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 Canvas | Game rendering |
| Matter.js 0.20.0 (CDN) | 2D physics engine |
| Web Audio API | Procedural sound effects |
| Vanilla JavaScript | Game logic, no frameworks |
| CSS3 Animations | Intro fade-out transition |

---

## File Structure

```
├── index.html    # Game page, styles, responsive layout, intro overlay
├── intro.js      # Cinematic "Developed by Jekko" splash screen
├── game.js       # Full game engine (~1200 lines)
└── README.md     # This documentation
```

---

## Step-by-Step Build Log

### Step 1 — Engine + Canvas + Walls + Ball

**Goal:** Get Matter.js running with a bouncing ball.

- Created `index.html` with a 480×640 canvas and dark theme
- Loaded Matter.js via CDN
- Created `game.js` with engine setup (zero gravity for top-down style)
- Added 3 invisible walls (top, left, right) — bottom is open for ball to fall through
- Created a ball with perfect bounce (`restitution: 1`, no friction, no air resistance)
- Launched ball at a random upward angle
- Added `beforeUpdate` loop to normalize ball speed every frame (prevents slowdown/speedup)

**Key decisions:**
- Zero gravity (`gravity: { x: 0, y: 0 }`) since Arkanoid is not a platformer
- `inertia: Infinity` on the ball to prevent spin
- Constant speed normalization to fight Matter.js energy drift

---

### Step 2 — Paddle with Mouse/Keyboard Control

**Goal:** Add a player-controlled paddle.

- Created a static rectangle body for the paddle at the bottom of the screen
- Added `mousemove` listener to follow mouse cursor
- Added `keydown`/`keyup` tracking for arrow keys and A/D
- Paddle is clamped within wall boundaries
- Added angle-based paddle bounce: hit position maps to -60° to +60° from vertical

**Key decisions:**
- Paddle is `isStatic: true` — moved via `Body.setPosition()` each frame
- Bounce angle depends on where the ball hits the paddle (classic Arkanoid mechanic)

---

### Step 3 — Brick Grid + Collision Destruction

**Goal:** Add breakable bricks.

- Created a 6-row × 10-column grid of static rectangle bodies
- Color-coded rows: red (top), orange (middle), green (bottom)
- Added collision detection: when ball hits a brick, remove it from the world
- Tracked remaining bricks in an array for future win detection

**Key decisions:**
- Bricks are static bodies — Matter.js handles collision/bounce automatically
- Used `Composite.remove()` to destroy bricks on contact

---

### Step 4 — Score, Lives, Game Over / Win

**Goal:** Make it a complete game with win/lose conditions.

- Added score tracking: red = 50pts, orange = 30pts, green = 10pts
- Added 3 lives with heart display
- Ball falling below screen = lose a life, ball resets after 500ms delay
- 0 lives = Game Over screen
- All bricks destroyed = You Win screen
- SPACE key restarts the game
- HUD drawn via Canvas `afterRender` event

**Key decisions:**
- `launchBall()` and `resetBall()` extracted as reusable functions
- `beforeUpdate` checks ball Y position for out-of-bounds detection
- Game state flags (`gameOver`, `gameWon`) gate all physics and collision logic

---

### Step 5 — Polish: Particles, Glow, Trail, Sounds

**Goal:** Make it look and sound good.

- **Particle system:** Colored particles burst from destroyed bricks
- **Ball trail:** Fading white dots follow the ball
- **Ball glow:** Custom-drawn ball with cyan `shadowBlur`
- **Paddle glow:** Brighter cyan color
- **Canvas glow:** Red outer box-shadow on the border
- **Sound effects (Web Audio API):**
  - Square beep → brick destroyed
  - Triangle tap → paddle hit
  - Sine thud → wall bounce
  - Sawtooth buzz → lose life
  - Rising arpeggio → win
  - Descending buzz → game over
  - Sine ping → power-up collected
  - Ascending arpeggio → level complete

**Key decisions:**
- All sounds are procedural oscillators — no audio files
- Ball rendering set to `visible: false` in Matter.js, drawn manually with glow
- `AudioContext` created lazily on first user gesture to avoid browser policy warning

---

### Step 6 — Power-Ups

**Goal:** Add collectible power-ups that drop from bricks.

- 25% drop chance per brick destroyed
- 4 power-up types:

| Symbol | Color | Effect | Duration |
|--------|-------|--------|----------|
| **W** | Cyan | Wide Paddle (1.5×) | 8 seconds |
| **+** | Green | Extra Life (+1, max 5) | Instant |
| **M** | Orange | Multi-Ball (2 extra balls) | Until they fall |
| **S** | Purple | Slow Ball (60% speed) | 8 seconds |

- Power-ups are canvas-drawn objects (not physics bodies) falling at constant speed
- Collected when overlapping the paddle hitbox
- Timed effects tracked in `activePowerupTimers[]` with `setTimeout`
- HUD indicators show active effects (e.g., `[W]`, `[S]`, `[M]x2`)
- All power-ups cleared on restart and level transitions

**Key decisions:**
- Paddle resize uses `Body.setVertices()` to reshape the existing body
- Extra balls are full physics bodies with `label: "ball"` for collision reuse
- `currentBallSpeed` variable allows slow power-up to layer on top of level speed

---

### Step 7 — Multiple Levels

**Goal:** Add 5 unique levels with different brick patterns and increasing difficulty.

- Levels defined as text grid patterns (`.` = empty, letter = brick type):

| Level | Name | Speed | Pattern |
|-------|------|-------|---------|
| 1 | CLASSIC | 1.0× | Full 6-row grid |
| 2 | DIAMOND | 1.1× | Diamond shape |
| 3 | FORTRESS | 1.2× | Walled box with core |
| 4 | ZIGZAG | 1.35× | Diagonal stripes |
| 5 | FINAL WALL | 1.5× | Dense 9-row wall |

- 6 brick types: R(red/50), O(orange/30), G(green/10), B(blue/40), P(purple/60), Y(yellow/20)
- Level transition: "LEVEL COMPLETE!" overlay for 2 seconds, then auto-advance
- Each level shows name + "Click to start" prompt before launching
- Lives and score carry over between levels
- Beat all 5 = "YOU WIN! All 5 levels cleared!"

**Key decisions:**
- `createBricksForLevel(index)` reads grid strings to dynamically place bricks
- `getLevelSpeed()` returns `BALL_SPEED * level.speed` — used everywhere for consistency
- Power-ups reset between levels to prevent exploits

---

### Bug Fix — AudioContext Warning

**Problem:** Browser showed "AudioContext was not allowed to start" on page load.

**Fix:**
- Changed from eager `new AudioContext()` to lazy creation via `getAudioCtx()`
- Added a `gameStarted` flag — ball doesn't launch until first user gesture
- `startGame()` calls `getAudioCtx()` to warm up audio on the user gesture
- Added a "Click or press any key to start" title screen

---

### Bug Fix — Paddle Snapping on Key Release

**Problem:** When using arrow keys, releasing would snap the paddle to the mouse position.

**Fix:**
- Added `inputMode` variable: `"mouse"`, `"keyboard"`, or `"touch"`
- `keydown` on arrow/WASD → sets `inputMode = "keyboard"`
- `mousemove` → sets `inputMode = "mouse"`
- `touchmove` → sets `inputMode = "touch"`
- Game loop only follows mouse/touch when in the matching mode

---

### Bug Fix — Ball Sliding Along Walls

**Problem:** Ball occasionally hit walls at a shallow angle and slid along them.

**Fix:**
- Added `normalizeBall()` function called every physics frame
- Enforces a **20° minimum angle** from both horizontal and vertical
- If the ball's angle is too shallow, the velocity vector is nudged to the minimum
- Then re-normalized to `currentBallSpeed`

---

### Feature — Pause

- **ESC** or **P** key toggles pause
- On-screen ⏸/▶ button for mobile (touch devices only)
- Pause saves all ball velocities, zeroes them, and restores on resume
- `beforeUpdate` and `collisionStart` both guarded by `gamePaused` flag
- Overlay shows "PAUSED" with resume instructions

---

### Feature — Mobile / Touch Support

- `touchstart` → tap to start, tap to restart
- `touchmove` → drag finger to move paddle
- Touch coordinates mapped from scaled canvas to game coordinates
- Canvas auto-scales to fit viewport (`scaleCanvas()` on resize)
- Viewport meta prevents pinch-zoom (`maximum-scale=1.0, user-scalable=no`)
- `touch-action: none` on canvas prevents scroll/bounce
- On-screen pause button shown only on touch devices

---

### Feature — Graphics Upgrade

- **Gradient bricks:** Linear gradient (highlight → base color) + top shine strip + animated shimmer
- **Gradient paddle:** 3-tone vertical gradient + outer glow + shine line
- **Radial ball glow:** Soft aura + specular highlight dot
- **Gradient trail:** Cyan radial gradient instead of flat white dots
- **Improved particles:** Circles + directional spark streaks with gravity
- **Starfield background:** 80 twinkling stars drifting downward
- **Screen shake:** Triggered on brick destruction (strong) and paddle hit (subtle)
- **Floating score popups:** "+50" text rises from each destroyed brick
- **HUD glow:** Score, level, and heart text have matching color shadows
- All default Matter.js rendering disabled — everything custom-drawn in `afterRender`

---

### Feature — Intro Splash Screen

**File:** `intro.js` (self-contained IIFE, no global leaks)

- Full-screen canvas overlay on top of the game
- **"developed by"** — subtle gray text fades in
- **"JEKKO"** — 64px gradient logo (white → cyan → purple) with per-letter stagger reveal
- Each letter spawns cyan/purple sparks on appearance
- 60 orbiting particles in elliptical paths around the logo
- Animated accent line + pulsing ring
- Dark radial background + floating cyan dots
- Auto-advances after 4.5 seconds
- "tap to skip" hint after 30% progress
- Click/tap anywhere to skip immediately
- Fades out with CSS animation, overlay DOM element removed after

---

## Game Features

| Feature | Details |
|---------|---------|
| Physics | Matter.js — ball bounce, collision detection, restitution |
| Rendering | Custom Canvas 2D — gradients, glow, particles |
| Sound | Web Audio API — procedural oscillators, no files |
| Input | Mouse, keyboard (arrows/WASD), touch (mobile) |
| Levels | 5 unique layouts with increasing ball speed |
| Power-ups | 4 types: Wide, Life, Multi-Ball, Slow |
| HUD | Score, level name, lives, active power-up indicators |
| States | Start screen, playing, paused, level complete, game over, win |
| Mobile | Touch controls, auto-scaling canvas, on-screen pause button |
| Intro | Cinematic "Developed by Jekko" splash with skip |

---

## Level Definitions

Levels are defined as string grids where each character maps to a brick type:

```
. = empty space
R = Red    (50 pts)
O = Orange (30 pts)
G = Green  (10 pts)
B = Blue   (40 pts)
P = Purple (60 pts)
Y = Yellow (20 pts)
```

Example — Level 2 "DIAMOND":
```
....PP....
...RRRR...
..OOOOOO..
.GGGGGGGG.
..BBBBBB..
...YYYY...
....PP....
```

---

## Power-Up System

| Property | Value |
|----------|-------|
| Drop chance | 25% per brick |
| Fall speed | 2 px/frame |
| Timed duration | 8 seconds (Wide, Slow) |
| Collection | AABB overlap with paddle |
| Visual | Glowing colored square with letter symbol |
| HUD | `[W]`, `[S]`, `[M]x2` indicators below score |

---

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move paddle | Mouse / ← → / A D | Drag finger |
| Start game | Click / any key | Tap |
| Restart | SPACE | Tap |
| Pause | ESC / P | ⏸ button |
| Skip intro | Click | Tap |

---

## Architecture Notes

### Game Loop Flow

```
Engine.beforeUpdate
  ├── Guard: skip if !started / over / won / paused / levelComplete
  ├── Move paddle (based on inputMode)
  ├── Normalize ball speed + enforce min angle
  ├── Normalize extra balls
  ├── Check ball out-of-bounds → lose life or game over
  ├── Update particles, trail, power-ups, score popups
  └── Cleanup extra balls that fell off screen

Engine.collisionStart
  ├── Guard: skip if !started / over / won / paused / levelComplete
  ├── Ball + Paddle → angle-based bounce + sound + particles + shake
  ├── Ball + Wall → wall sound
  └── Ball + Brick → score + particles + popup + shake + sound
       ├── Maybe spawn power-up (25%)
       ├── Remove brick from world + array
       └── Check if level cleared → advance or win

Render.afterRender
  ├── Screen shake transform
  ├── Draw starfield background
  ├── Draw gradient bricks (with shine + shimmer)
  ├── Draw gradient paddle (with glow + shine)
  ├── Draw ball trail (radial gradient)
  ├── Draw main ball (radial glow + specular)
  ├── Draw extra balls
  ├── Draw particles + power-ups + score popups
  ├── End shake transform
  ├── Draw HUD (score, level, lives, power-up indicators)
  └── Draw overlays (start, level complete, pause, game over, win)
```

### State Machine

```
[Intro Splash] → click/tap/auto → [Start Screen]
[Start Screen] → click/tap/key → [Playing]
[Playing] → ESC/P → [Paused] → ESC/P → [Playing]
[Playing] → ball falls → [Playing] (life lost) or [Game Over]
[Playing] → all bricks cleared → [Level Complete] → auto → [Start Screen (next level)]
[Playing] → final level cleared → [You Win]
[Game Over / You Win] → SPACE/tap → [Start Screen (level 1)]
```
