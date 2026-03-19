

// ============================================
// Arkanoid - Step 7: Multiple Levels!
// ============================================

// Matter.js module aliases
const { Engine, Render, Runner, Bodies, Composite, Body, Events } = Matter;

// --- Game Constants ---
const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;

// Wall thickness (off-screen walls to act as boundaries)
const WALL_THICKNESS = 50;

// Ball settings
const BALL_RADIUS = 8;
const BALL_START_X = GAME_WIDTH / 2;
const BALL_START_Y = GAME_HEIGHT - 100;
const BALL_SPEED = 5;

// Paddle settings
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 14;
const PADDLE_Y = GAME_HEIGHT - 40;
const PADDLE_SPEED = 8;

// Brick settings
const BRICK_COLS = 10;
const BRICK_WIDTH = 40;
const BRICK_HEIGHT = 16;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 50;

// Brick color/point map: R=red, O=orange, G=green, B=blue, P=purple, Y=yellow
const BRICK_DEFS = {
    "R": { color: "#e94560", highlight: "#ff6b81", points: 50 },
    "O": { color: "#f5a623", highlight: "#ffd166", points: 30 },
    "G": { color: "#50fa7b", highlight: "#9efcb2", points: 10 },
    "B": { color: "#4cc9f0", highlight: "#8ce8ff", points: 40 },
    "P": { color: "#bd93f9", highlight: "#d8b4fe", points: 60 },
    "Y": { color: "#f1fa8c", highlight: "#fdffc4", points: 20 }
};

// --- Level Definitions ---
// Each level has a grid pattern (. = empty, letter = brick color key)
// and a ball speed multiplier
const LEVELS = [
    {
        name: "CLASSIC",
        speed: 1.0,
        grid: [
            "RRRRRRRRRR",
            "RRRRRRRRRR",
            "OOOOOOOOOO",
            "OOOOOOOOOO",
            "GGGGGGGGGG",
            "GGGGGGGGGG"
        ]
    },
    {
        name: "DIAMOND",
        speed: 1.1,
        grid: [
            "....PP....",
            "...RRRR...",
            "..OOOOOO..",
            ".GGGGGGGG.",
            "..BBBBBB..",
            "...YYYY...",
            "....PP...."
        ]
    },
    {
        name: "FORTRESS",
        speed: 1.2,
        grid: [
            "P.PPPPPP.P",
            "P.P....P.P",
            "P.P.RR.P.P",
            "P.P.RR.P.P",
            "P.P....P.P",
            "P.PPPPPP.P",
            "P........P",
            "PPPPPPPPPP"
        ]
    },
    {
        name: "ZIGZAG",
        speed: 1.35,
        grid: [
            "RR....RR..",
            "..OO....OO",
            "BB....BB..",
            "..GG....GG",
            "YY....YY..",
            "..PP....PP",
            "RR....RR..",
            "..OO....OO"
        ]
    },
    {
        name: "FINAL WALL",
        speed: 1.5,
        grid: [
            "PPPPPPPPPP",
            "RPRPRPRPRP",
            "PRPRPRPRPR",
            "OBOBOBOBOB",
            "BOBOOBOBOB",
            "GYGYGYGYGY",
            "YGYGYGYGGY",
            "BBBBBBBBBB",
            "PPPPPPPPPP"
        ]
    }
];

let currentLevel = 0;

// Game state
const MAX_LIVES = 3;
let lives = MAX_LIVES;
let score = 0;
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let levelComplete = false;
let levelTransitionTimer = null;
let gamePaused = false;
let savedVelocities = null;

// --- Multiplayer State ---
let mpAttackMessage = null;
let mpAttackMessageTimer = 0;
const MP_ATTACK_EFFECTS = {
    speed: { label: "⚡ SPEED UP!", color: "#e94560", duration: 6000 },
    shrink: { label: "📏 SHRINK!", color: "#f5a623", duration: 6000 },
    dark: { label: "🌑 DARKNESS!", color: "#bd93f9", duration: 5000 }
};
let mpDarknessActive = false;

// Power-up settings
const POWERUP_DROP_CHANCE = 0.25; // 25% chance per brick
const POWERUP_SIZE = 16;
const POWERUP_FALL_SPEED = 2;
const POWERUP_DURATION = 8000; // 8 seconds for timed effects

const POWERUP_TYPES = [
    { type: "wide",   color: "#4cc9f0", symbol: "W" },
    { type: "life",   color: "#50fa7b", symbol: "+" },
    { type: "multi",  color: "#f5a623", symbol: "M" },
    { type: "slow",   color: "#bd93f9", symbol: "S" }
];

const powerups = [];
const extraBalls = [];
let currentPaddleWidth = PADDLE_WIDTH;
let currentBallSpeed = BALL_SPEED * LEVELS[0].speed;
let activePowerupTimers = [];

// --- Starfield Background ---
const stars = [];
for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.3 + 0.05,
        twinkle: Math.random() * Math.PI * 2
    });
}

function drawStarfield(ctx) {
    const time = Date.now() * 0.001;
    for (const s of stars) {
        s.y += s.speed;
        if (s.y > GAME_HEIGHT) { s.y = 0; s.x = Math.random() * GAME_WIDTH; }
        const alpha = 0.3 + 0.3 * Math.sin(time * 2 + s.twinkle);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// --- Floating Score Popups ---
const scorePopups = [];

function spawnScorePopup(x, y, points, color) {
    scorePopups.push({ x, y, text: `+${points}`, color, life: 1.0, vy: -1.5 });
}

function updateScorePopups() {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) scorePopups.splice(i, 1);
    }
}

function drawScorePopups(ctx) {
    for (const p of scorePopups) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
}

// --- Screen Shake ---
let shakeIntensity = 0;
let shakeDecay = 0.9;

function triggerShake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
}

function getShakeOffset() {
    if (shakeIntensity < 0.1) { shakeIntensity = 0; return { x: 0, y: 0 }; }
    const ox = (Math.random() - 0.5) * shakeIntensity * 2;
    const oy = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeIntensity *= shakeDecay;
    return { x: ox, y: oy };
}

// --- Particle System ---
const particles = [];

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.015 + Math.random() * 0.025,
            size: 1.5 + Math.random() * 3,
            color,
            isSpark: Math.random() > 0.5
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx *= 0.99;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles(ctx) {
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.isSpark) {
            // Streaked spark
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.fillRect(-p.size * 2, -p.size * 0.3, p.size * 4, p.size * 0.6);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

// --- Ball Trail ---
const trail = [];
const TRAIL_LENGTH = 12;

function updateTrail() {
    trail.push({ x: ball.position.x, y: ball.position.y });
    if (trail.length > TRAIL_LENGTH) trail.shift();
}

function drawTrail(ctx) {
    for (let i = 0; i < trail.length; i++) {
        const t = i / trail.length;
        const alpha = t * 0.5;
        const size = BALL_RADIUS * t;
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(
            trail[i].x, trail[i].y, 0,
            trail[i].x, trail[i].y, size
        );
        grad.addColorStop(0, "#4cc9f0");
        grad.addColorStop(1, "rgba(76, 201, 240, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// --- Sound System (Web Audio API) ---
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(freq, duration, type) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

function playBrickSound()  { playSound(520, 0.1, "square"); }
function playPaddleSound() { playSound(300, 0.08, "triangle"); }
function playWallSound()   { playSound(200, 0.06, "sine"); }
function playLoseLifeSound() { playSound(150, 0.3, "sawtooth"); }
function playWinSound() {
    playSound(523, 0.15, "square");
    setTimeout(() => playSound(659, 0.15, "square"), 150);
    setTimeout(() => playSound(784, 0.3, "square"), 300);
}
function playGameOverSound() {
    playSound(300, 0.2, "sawtooth");
    setTimeout(() => playSound(200, 0.4, "sawtooth"), 200);
}
function playPowerupSound() { playSound(880, 0.15, "sine"); }
function playLevelCompleteSound() {
    playSound(440, 0.12, "square");
    setTimeout(() => playSound(554, 0.12, "square"), 120);
    setTimeout(() => playSound(659, 0.12, "square"), 240);
    setTimeout(() => playSound(880, 0.25, "square"), 360);
}

// --- Engine Setup ---
const engine = Engine.create({
    gravity: { x: 0, y: 0 } // No gravity — Arkanoid is top-down style
});

const canvas = document.getElementById("gameCanvas");
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Use Matter.js built-in renderer
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: "#16213e"
    }
});

// --- Create Walls (top, left, right) ---
// Bottom is open (ball falls out = lose life later)
const walls = [
    // Top wall
    Bodies.rectangle(GAME_WIDTH / 2, -WALL_THICKNESS / 2, GAME_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, {
        isStatic: true,
        render: { fillStyle: "#e94560" },
        label: "wallTop"
    }),
    // Left wall
    Bodies.rectangle(-WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS * 2, {
        isStatic: true,
        render: { fillStyle: "#e94560" },
        label: "wallLeft"
    }),
    // Right wall
    Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS * 2, {
        isStatic: true,
        render: { fillStyle: "#e94560" },
        label: "wallRight"
    })
];

// --- Create Ball ---
const ball = Bodies.circle(BALL_START_X, BALL_START_Y, BALL_RADIUS, {
    restitution: 1,    // Perfect bounce (no energy loss)
    friction: 0,       // No friction
    frictionAir: 0,    // No air resistance
    inertia: Infinity, // Prevent rotation
    render: {
        fillStyle: "#ffffff",
        visible: false  // We'll draw the ball ourselves with glow
    },
    label: "ball"
});

// --- Create Paddle ---
const paddle = Bodies.rectangle(GAME_WIDTH / 2, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT, {
    isStatic: true,
    chamfer: { radius: 4 },
    render: { fillStyle: "#4cc9f0", visible: false },
    label: "paddle"
});

// --- Create Bricks ---
const bricks = [];

function createBricksForLevel(levelIndex) {
    const level = LEVELS[levelIndex];
    const grid = level.grid;
    const rows = grid.length;
    const cols = BRICK_COLS;
    const offsetLeft = (GAME_WIDTH - (cols * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const ch = grid[row][col];
            if (!ch || ch === "." || !BRICK_DEFS[ch]) continue;

            const def = BRICK_DEFS[ch];
            const x = offsetLeft + col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_WIDTH / 2;
            const y = BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_HEIGHT / 2;

            const brick = Bodies.rectangle(x, y, BRICK_WIDTH, BRICK_HEIGHT, {
                isStatic: true,
                render: { fillStyle: def.color, visible: false },
                label: "brick",
                brickColor: ch,
                brickPoints: def.points
            });

            bricks.push(brick);
        }
    }
}

function getLevelSpeed() {
    return BALL_SPEED * LEVELS[currentLevel].speed;
}

createBricksForLevel(currentLevel);

// --- Add everything to the world ---
Composite.add(engine.world, [...walls, ball, paddle, ...bricks]);

// --- Ball launch / reset helpers ---
function launchBall() {
    const speed = getLevelSpeed();
    const angle = -Math.PI / 4 + (Math.random() * Math.PI / 6);
    Body.setVelocity(ball, {
        x: speed * Math.cos(angle),
        y: -speed * Math.abs(Math.sin(angle))
    });
}

function resetBall() {
    Body.setPosition(ball, { x: BALL_START_X, y: BALL_START_Y });
    Body.setVelocity(ball, { x: 0, y: 0 });
    setTimeout(launchBall, 500);
}

// --- Power-up System ---
function spawnPowerup(x, y) {
    if (Math.random() > POWERUP_DROP_CHANCE) return;
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({ x, y, ...type });
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += POWERUP_FALL_SPEED;

        // Check paddle collection
        if (p.y + POWERUP_SIZE / 2 >= PADDLE_Y - PADDLE_HEIGHT / 2 &&
            p.y - POWERUP_SIZE / 2 <= PADDLE_Y + PADDLE_HEIGHT / 2 &&
            p.x >= paddle.position.x - currentPaddleWidth / 2 &&
            p.x <= paddle.position.x + currentPaddleWidth / 2) {
            activatePowerup(p.type);
            playPowerupSound();
            spawnParticles(p.x, p.y, p.color, 8);
            powerups.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (p.y > GAME_HEIGHT + POWERUP_SIZE) {
            powerups.splice(i, 1);
        }
    }
}

function activatePowerup(type) {
    switch (type) {
        case "wide":
            setWidePaddle();
            break;
        case "life":
            lives = Math.min(lives + 1, MAX_LIVES + 2); // max 5 lives
            break;
        case "multi":
            spawnExtraBalls();
            break;
        case "slow":
            setSlowBall();
            break;
    }
}

function setWidePaddle() {
    currentPaddleWidth = PADDLE_WIDTH * 1.5;
    resizePaddle(currentPaddleWidth);
    clearTimerByType("wide");
    const timer = setTimeout(() => {
        currentPaddleWidth = PADDLE_WIDTH;
        resizePaddle(currentPaddleWidth);
    }, POWERUP_DURATION);
    activePowerupTimers.push({ type: "wide", timer });
}

function resizePaddle(width) {
    const pos = { x: paddle.position.x, y: PADDLE_Y };
    Composite.remove(engine.world, paddle);
    const verts = Bodies.rectangle(pos.x, pos.y, width, PADDLE_HEIGHT, {
        isStatic: true,
        chamfer: { radius: 4 },
        render: { fillStyle: "#4cc9f0", visible: false },
        label: "paddle"
    });
    // Copy new vertices to paddle
    Body.setVertices(paddle, verts.vertices);
    Body.setPosition(paddle, pos);
    Composite.add(engine.world, paddle);
}

function spawnExtraBalls() {
    for (let i = 0; i < 2; i++) {
        const extra = Bodies.circle(ball.position.x, ball.position.y, BALL_RADIUS, {
            restitution: 1,
            friction: 0,
            frictionAir: 0,
            inertia: Infinity,
            render: { fillStyle: "#f5a623", visible: false },
            label: "ball"
        });
        const angle = (i === 0 ? -1 : 1) * Math.PI / 4;
        Body.setVelocity(extra, {
            x: currentBallSpeed * Math.sin(angle),
            y: -currentBallSpeed * Math.cos(angle)
        });
        Composite.add(engine.world, extra);
        extraBalls.push(extra);
    }
}

function setSlowBall() {
    currentBallSpeed = getLevelSpeed() * 0.6;
    clearTimerByType("slow");
    const timer = setTimeout(() => {
        currentBallSpeed = getLevelSpeed();
    }, POWERUP_DURATION);
    activePowerupTimers.push({ type: "slow", timer });
}

function clearTimerByType(type) {
    activePowerupTimers = activePowerupTimers.filter(t => {
        if (t.type === type) {
            clearTimeout(t.timer);
            return false;
        }
        return true;
    });
}

function drawPowerups(ctx) {
    for (const p of powerups) {
        // Rounded square
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const half = POWERUP_SIZE / 2;
        ctx.roundRect(p.x - half, p.y - half, POWERUP_SIZE, POWERUP_SIZE, 4);
        ctx.fill();
        ctx.restore();

        // Letter
        ctx.fillStyle = "#16213e";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, p.x, p.y);
    }
    ctx.textBaseline = "alphabetic";
}

function cleanupExtraBalls() {
    for (let i = extraBalls.length - 1; i >= 0; i--) {
        const eb = extraBalls[i];
        if (eb.position.y > GAME_HEIGHT + BALL_RADIUS) {
            Composite.remove(engine.world, eb);
            extraBalls.splice(i, 1);
        }
    }
}

function resetPowerups() {
    powerups.length = 0;
    for (const eb of extraBalls) {
        Composite.remove(engine.world, eb);
    }
    extraBalls.length = 0;
    for (const t of activePowerupTimers) {
        clearTimeout(t.timer);
    }
    activePowerupTimers.length = 0;
    currentPaddleWidth = PADDLE_WIDTH;
    currentBallSpeed = getLevelSpeed();
    resizePaddle(PADDLE_WIDTH);
}

// Ball starts stationary — waits for user gesture to launch

// --- Paddle Controls ---
const keys = {};

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) {
        inputMode = "keyboard";
    }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

// Mouse control
let mouseX = GAME_WIDTH / 2;
let inputMode = "mouse"; // "mouse", "keyboard", or "touch"
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (GAME_WIDTH / rect.width);
    inputMode = "mouse";
});

// Touch control
let touchX = GAME_WIDTH / 2;

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = (touch.clientX - rect.left) * (GAME_WIDTH / rect.width);
    inputMode = "touch";

    if (!gameStarted && !levelComplete) {
        startGame();
    } else if (gameOver || gameWon) {
        restartGame();
    }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = (touch.clientX - rect.left) * (GAME_WIDTH / rect.width);
    inputMode = "touch";
}, { passive: false });

// --- Mobile: scale canvas to fit viewport ---
function scaleCanvas() {
    const maxW = window.innerWidth - 16;
    const maxH = window.innerHeight - 16;
    const scale = Math.min(maxW / GAME_WIDTH, maxH / GAME_HEIGHT, 1);
    canvas.style.width = (GAME_WIDTH * scale) + "px";
    canvas.style.height = (GAME_HEIGHT * scale) + "px";
}
scaleCanvas();
window.addEventListener("resize", scaleCanvas);

// --- Mobile: show pause button on touch devices ---
const pauseBtn = document.getElementById("pauseBtn");
if ("ontouchstart" in window) {
    pauseBtn.style.display = "block";
}
pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (gameStarted && !gameOver && !gameWon && !levelComplete) {
        if (gamePaused) resumeGame();
        else pauseGame();
    }
});
pauseBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
});

// --- Ball normalization: constant speed + minimum bounce angle ---
const MIN_ANGLE = Math.PI / 9; // 20° — prevents near-horizontal/vertical sliding

function normalizeBall(b) {
    let vx = b.velocity.x;
    let vy = b.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed === 0) return;

    // Enforce minimum angle from horizontal and vertical
    const angle = Math.atan2(Math.abs(vy), Math.abs(vx));
    if (angle < MIN_ANGLE) {
        // Too horizontal — nudge vertical component
        vx = Math.sign(vx) * Math.cos(MIN_ANGLE);
        vy = Math.sign(vy || 1) * Math.sin(MIN_ANGLE);
    } else if (angle > Math.PI / 2 - MIN_ANGLE) {
        // Too vertical — nudge horizontal component
        vx = Math.sign(vx || 1) * Math.sin(MIN_ANGLE);
        vy = Math.sign(vy) * Math.cos(MIN_ANGLE);
    }

    // Normalize to target speed
    const len = Math.sqrt(vx * vx + vy * vy);
    Body.setVelocity(b, {
        x: (vx / len) * currentBallSpeed,
        y: (vy / len) * currentBallSpeed
    });
}

// --- Game Loop: Keep ball speed constant + move paddle + check bounds ---
Events.on(engine, "beforeUpdate", () => {
    // Multiplayer: auto-start when server sends "go"
    if (typeof MP !== "undefined" && MP.gameGo && !gameStarted) {
        MP.gameGo = false;
        startGame();
    }

    if (!gameStarted || gameOver || gameWon || levelComplete || gamePaused) return;

    // -- Move paddle --
    let paddleX = paddle.position.x;

    if (inputMode === "keyboard") {
        if (keys["ArrowLeft"] || keys["a"]) {
            paddleX -= PADDLE_SPEED;
        }
        if (keys["ArrowRight"] || keys["d"]) {
            paddleX += PADDLE_SPEED;
        }
    } else if (inputMode === "touch") {
        paddleX = touchX;
    } else {
        paddleX = mouseX;
    }

    // Clamp paddle within walls
    const halfPaddle = currentPaddleWidth / 2;
    paddleX = Math.max(halfPaddle, Math.min(GAME_WIDTH - halfPaddle, paddleX));
    Body.setPosition(paddle, { x: paddleX, y: PADDLE_Y });

    // -- Keep ball speed constant + enforce minimum angle --
    normalizeBall(ball);

    // -- Keep extra balls at same speed --
    for (const eb of extraBalls) {
        normalizeBall(eb);
    }

    // -- Ball fell below screen --
    if (ball.position.y > GAME_HEIGHT + BALL_RADIUS) {
        lives--;
        if (lives <= 0) {
            gameOver = true;
            Body.setVelocity(ball, { x: 0, y: 0 });
            playGameOverSound();
            if (typeof MP !== "undefined" && MP.active) {
                MP.sendLost();
                MP.resetCombo();
            }
        } else {
            playLoseLifeSound();
            resetBall();
            if (typeof MP !== "undefined" && MP.active) MP.resetCombo();
        }
    }

    // -- Update particles and trail --
    updateParticles();
    updateTrail();
    updatePowerups();
    cleanupExtraBalls();
    updateScorePopups();

    // -- Multiplayer: process incoming attacks --
    if (typeof MP !== "undefined" && MP.active) {
        const attack = MP.popAttack();
        if (attack && MP_ATTACK_EFFECTS[attack]) {
            applyMPAttack(attack);
        }
        // Send state every 10 frames
        if (engine.timing.timestamp % 10 < 1) {
            const totalBricks = LEVELS[currentLevel].grid.reduce((sum, row) => sum + [...row].filter(c => c !== ".").length, 0);
            MP.sendState(score, lives, bricks.length, currentLevel, totalBricks);
        }
    }
});

// --- Collisions: paddle bounce + brick destruction + scoring + sounds ---
Events.on(engine, "collisionStart", (event) => {
    if (!gameStarted || gameOver || gameWon || levelComplete || gamePaused) return;

    for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];

        // -- Paddle bounce --
        if (labels.includes("ball") && labels.includes("paddle")) {
            const hitBall = pair.bodyA.label === "ball" ? pair.bodyA : pair.bodyB;
            const hitPos = (hitBall.position.x - paddle.position.x) / (currentPaddleWidth / 2);
            const maxAngle = Math.PI / 3;
            const angle = hitPos * maxAngle;

            Body.setVelocity(hitBall, {
                x: currentBallSpeed * Math.sin(angle),
                y: -currentBallSpeed * Math.cos(angle)
            });
            playPaddleSound();
            spawnParticles(hitBall.position.x, hitBall.position.y, "#4cc9f0", 8);
            triggerShake(1.5);
        }

        // -- Wall bounce --
        if (labels.includes("ball") && (labels.includes("wallTop") || labels.includes("wallLeft") || labels.includes("wallRight"))) {
            playWallSound();
        }

        // -- Brick destruction + scoring --
        if (labels.includes("ball") && labels.includes("brick")) {
            const brick = pair.bodyA.label === "brick" ? pair.bodyA : pair.bodyB;

            // Add score based on brick type
            score += brick.brickPoints || 10;

            // Particles burst in brick color
            const def = BRICK_DEFS[brick.brickColor];
            const color = def ? def.color : "#ffffff";
            spawnParticles(brick.position.x, brick.position.y, color, 14);

            // Floating score popup
            spawnScorePopup(brick.position.x, brick.position.y - 10, brick.brickPoints || 10, color);

            // Screen shake
            triggerShake(3);

            playBrickSound();

            // Multiplayer: track combo, maybe send attack
            if (typeof MP !== "undefined" && MP.active) {
                const sentAttack = MP.onBrickDestroyed();
                if (sentAttack) {
                    mpAttackMessage = "⚔ ATTACK SENT!";
                    mpAttackMessageTimer = 90;
                }
            }

            // Maybe spawn a power-up
            spawnPowerup(brick.position.x, brick.position.y);

            // Remove from world
            Composite.remove(engine.world, brick);

            // Remove from tracking array
            const idx = bricks.indexOf(brick);
            if (idx > -1) bricks.splice(idx, 1);

            // Level cleared!
            if (bricks.length === 0) {
                if (currentLevel < LEVELS.length - 1) {
                    // Advance to next level
                    levelComplete = true;
                    Body.setVelocity(ball, { x: 0, y: 0 });
                    playLevelCompleteSound();
                    levelTransitionTimer = setTimeout(advanceLevel, 2000);
                } else {
                    // Beat the final level!
                    gameWon = true;
                    Body.setVelocity(ball, { x: 0, y: 0 });
                    playWinSound();
                    if (typeof MP !== "undefined" && MP.active) MP.sendWon();
                }
            }
        }
    }
});

// --- Custom Rendering: gradient bricks, paddle, ball, starfield ---
function drawGradientBricks(ctx) {
    const time = Date.now() * 0.001;
    for (const brick of bricks) {
        const def = BRICK_DEFS[brick.brickColor];
        if (!def) continue;
        const bx = brick.position.x - BRICK_WIDTH / 2;
        const by = brick.position.y - BRICK_HEIGHT / 2;

        // Gradient body
        const grad = ctx.createLinearGradient(bx, by, bx, by + BRICK_HEIGHT);
        grad.addColorStop(0, def.highlight);
        grad.addColorStop(1, def.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bx, by, BRICK_WIDTH, BRICK_HEIGHT, 2);
        ctx.fill();

        // Top shine
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(bx + 2, by + 1, BRICK_WIDTH - 4, BRICK_HEIGHT / 3);

        // Subtle animated shimmer
        const shimmer = 0.03 * Math.sin(time * 3 + brick.position.x * 0.1);
        if (shimmer > 0) {
            ctx.globalAlpha = shimmer;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx, by, BRICK_WIDTH, BRICK_HEIGHT);
            ctx.globalAlpha = 1;
        }
    }
}

function drawGradientPaddle(ctx) {
    const px = paddle.position.x - currentPaddleWidth / 2;
    const py = PADDLE_Y - PADDLE_HEIGHT / 2;

    // Main gradient
    const grad = ctx.createLinearGradient(px, py, px, py + PADDLE_HEIGHT);
    grad.addColorStop(0, "#8ce8ff");
    grad.addColorStop(0.4, "#4cc9f0");
    grad.addColorStop(1, "#2a7ab5");

    ctx.save();
    ctx.shadowColor = "#4cc9f0";
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(px, py, currentPaddleWidth, PADDLE_HEIGHT, 4);
    ctx.fill();
    ctx.restore();

    // Top shine line
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.roundRect(px + 4, py + 1, currentPaddleWidth - 8, 3, 1);
    ctx.fill();
}

function drawBallGlow(ctx, b, color, glowColor) {
    // Outer glow
    const grad = ctx.createRadialGradient(
        b.position.x, b.position.y, 0,
        b.position.x, b.position.y, BALL_RADIUS * 3
    );
    grad.addColorStop(0, glowColor);
    grad.addColorStop(0.3, glowColor.replace(")", ",0.3)").replace("rgb", "rgba"));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, BALL_RADIUS * 3, 0, Math.PI * 2);
    ctx.fill();

    // Inner ball
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Specular highlight
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(b.position.x - 2, b.position.y - 2, BALL_RADIUS * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

// --- HUD: Draw score, lives, particles, glow, and overlays ---
Events.on(render, "afterRender", () => {
    const ctx = render.context;
    const shake = getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // -- Starfield --
    drawStarfield(ctx);

    // -- Gradient bricks --
    drawGradientBricks(ctx);

    // -- Gradient paddle --
    drawGradientPaddle(ctx);

    // -- Ball trail --
    drawTrail(ctx);

    // -- Main ball glow --
    drawBallGlow(ctx, ball, "#ffffff", "rgb(76, 201, 240)");

    // -- Extra ball glows --
    for (const eb of extraBalls) {
        drawBallGlow(ctx, eb, "#f5a623", "rgb(245, 166, 35)");
    }

    // -- Particles --
    drawParticles(ctx);

    // -- Power-ups --
    drawPowerups(ctx);

    // -- Score popups --
    drawScorePopups(ctx);

    ctx.restore(); // end screen shake

    // Score (top-left) with glow
    ctx.save();
    ctx.shadowColor = "#4cc9f0";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${score}`, 10, 20);
    ctx.restore();

    // Level (center)
    ctx.save();
    ctx.shadowColor = "#f1fa8c";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#f1fa8c";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`LVL ${currentLevel + 1} - ${LEVELS[currentLevel].name}`, GAME_WIDTH / 2, 20);
    ctx.restore();

    // Lives (top-right) as hearts
    ctx.save();
    ctx.shadowColor = "#e94560";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#e94560";
    ctx.textAlign = "right";
    ctx.font = "bold 16px monospace";
    ctx.fillText("❤".repeat(lives), GAME_WIDTH - 10, 20);
    ctx.restore();

    // Active power-up indicators
    let indicatorX = 10;
    const indicatorY = 36;
    for (const t of activePowerupTimers) {
        const pt = POWERUP_TYPES.find(p => p.type === t.type);
        if (pt) {
            ctx.fillStyle = pt.color;
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`[${pt.symbol}]`, indicatorX, indicatorY);
            indicatorX += 30;
        }
    }
    if (extraBalls.length > 0) {
        ctx.fillStyle = "#f5a623";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`[M]x${extraBalls.length}`, indicatorX, indicatorY);
    }

    // -- Multiplayer: opponent HUD + attack messages --
    if (typeof MP !== "undefined" && MP.active) {
        drawOpponentHUD(ctx);
        drawAttackMessage(ctx);
        if (mpDarknessActive) {
            drawDarknessOverlay(ctx);
        }
        // Show MP result overlay
        if (MP.resultMessage && !gameOver && !gameWon) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            ctx.fillStyle = "#50fa7b";
            ctx.font = "bold 28px monospace";
            ctx.textAlign = "center";
            ctx.fillText(MP.resultMessage, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10);
            ctx.fillStyle = "#ffffff";
            ctx.font = "16px monospace";
            ctx.fillText(`Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);
            ctx.fillText("Tap or press SPACE to exit", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 55);
        }
    }

    // Start screen
    if (!gameStarted && !levelComplete) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "#4cc9f0";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ARKANOID", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);

        // Multiplayer countdown
        if (typeof MP !== "undefined" && MP.countdown !== null) {
            ctx.fillStyle = "#f1fa8c";
            ctx.font = "bold 64px monospace";
            ctx.fillText(MP.countdown === 0 ? "GO!" : MP.countdown, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);

            ctx.fillStyle = "#e94560";
            ctx.font = "bold 14px monospace";
            ctx.fillText(`Room: ${MP.roomCode}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 55);
        } else {
            ctx.fillStyle = "#f1fa8c";
            ctx.font = "bold 20px monospace";
            ctx.fillText(`Level ${currentLevel + 1}: ${LEVELS[currentLevel].name}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);

            ctx.fillStyle = "#ffffff";
            ctx.font = "18px monospace";
            ctx.fillText("Tap, click, or press any key", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35);
            ctx.fillText("to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 58);
        }
    }

    // Level Complete overlay
    if (levelComplete) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "#f1fa8c";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL COMPLETE!", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

        ctx.fillStyle = "#ffffff";
        ctx.font = "20px monospace";
        ctx.fillText(`${LEVELS[currentLevel].name}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);

        if (currentLevel < LEVELS.length - 1) {
            ctx.fillStyle = "#4cc9f0";
            ctx.font = "18px monospace";
            ctx.fillText(`Next: ${LEVELS[currentLevel + 1].name}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35);
        }
    }

    // Pause overlay
    if (gamePaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

        ctx.font = "18px monospace";
        ctx.fillText("Press ESC, P, or tap ⏸", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    }

    // Game Over overlay
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "#e94560";
        ctx.font = "bold 40px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);

        ctx.fillStyle = "#ffffff";
        ctx.font = "20px monospace";
        ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
        ctx.fillText("Tap or press SPACE to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
    }

    // Win overlay
    if (gameWon) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = "#50fa7b";
        ctx.font = "bold 40px monospace";
        ctx.textAlign = "center";
        ctx.fillText("YOU WIN!", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

        ctx.fillStyle = "#ffffff";
        ctx.font = "20px monospace";
        ctx.fillText(`All ${LEVELS.length} levels cleared!`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
        ctx.fillText("Tap or press SPACE to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 65);
    }
});

// --- Level Advance ---
function advanceLevel() {
    levelComplete = false;
    currentLevel++;

    // Clear old bricks
    for (const brick of bricks) {
        Composite.remove(engine.world, brick);
    }
    bricks.length = 0;

    // Create new level bricks
    createBricksForLevel(currentLevel);
    Composite.add(engine.world, [...bricks]);

    // Update base ball speed for this level
    currentBallSpeed = getLevelSpeed();

    // Reset power-ups (timed ones expire)
    resetPowerups();

    // Reset ball
    resetBall();

    // In multiplayer, auto-start next level; in solo, wait for user
    if (typeof MP !== "undefined" && MP.active) {
        gameStarted = true;
        setTimeout(launchBall, 600);
    } else {
        gameStarted = false;
    }
}

// --- Restart game on SPACE ---
function restartGame() {
    // Reset state
    lives = MAX_LIVES;
    score = 0;
    gameOver = false;
    gameWon = false;
    gameStarted = false;
    levelComplete = false;
    currentLevel = 0;
    gamePaused = false;
    if (levelTransitionTimer) {
        clearTimeout(levelTransitionTimer);
        levelTransitionTimer = null;
    }
    particles.length = 0;
    trail.length = 0;
    scorePopups.length = 0;
    mpDarknessActive = false;
    mpAttackMessage = null;
    mpAttackMessageTimer = 0;

    // Remove remaining bricks
    for (const brick of bricks) {
        Composite.remove(engine.world, brick);
    }
    bricks.length = 0;

    // Recreate bricks for level 1
    createBricksForLevel(currentLevel);
    Composite.add(engine.world, [...bricks]);

    // Reset ball
    resetBall();

    // Reset power-ups
    resetPowerups();
}

function pauseGame() {
    gamePaused = true;
    pauseBtn.textContent = "▶";
    savedVelocities = {
        ball: { x: ball.velocity.x, y: ball.velocity.y },
        extras: extraBalls.map(eb => ({ x: eb.velocity.x, y: eb.velocity.y }))
    };
    Body.setVelocity(ball, { x: 0, y: 0 });
    for (const eb of extraBalls) {
        Body.setVelocity(eb, { x: 0, y: 0 });
    }
}

function resumeGame() {
    gamePaused = false;
    pauseBtn.textContent = "⏸";
    if (savedVelocities) {
        Body.setVelocity(ball, savedVelocities.ball);
        extraBalls.forEach((eb, i) => {
            if (savedVelocities.extras[i]) {
                Body.setVelocity(eb, savedVelocities.extras[i]);
            }
        });
        savedVelocities = null;
    }
}

function startGame() {
    if (!gameStarted) {
        // In multiplayer, only start when server says "go"
        if (typeof MP !== "undefined" && MP.connected && !MP.gameGo) return;
        gameStarted = true;
        getAudioCtx();
        launchBall();
    }
}

canvas.addEventListener("click", startGame);

document.addEventListener("keydown", (e) => {
    // Toggle pause
    if ((e.code === "Escape" || e.code === "KeyP") && gameStarted && !gameOver && !gameWon && !levelComplete) {
        if (gamePaused) {
            resumeGame();
        } else {
            pauseGame();
        }
        return;
    }
    if (!gameStarted) {
        startGame();
        return;
    }
    if (e.code === "Space" && (gameOver || gameWon)) {
        if (typeof MP !== "undefined" && MP.active) {
            MP.disconnect();
        }
        restartGame();
    }
    // Also exit on SPACE when MP result is showing
    if (e.code === "Space" && typeof MP !== "undefined" && MP.resultMessage) {
        MP.disconnect();
        restartGame();
    }
});

// --- Multiplayer: attack effects + opponent HUD ---
function applyMPAttack(attackType) {
    const effect = MP_ATTACK_EFFECTS[attackType];
    if (!effect) return;
    mpAttackMessage = effect.label;
    mpAttackMessageTimer = 120;
    triggerShake(5);
    playSound(180, 0.3, "sawtooth");

    switch (attackType) {
        case "speed":
            currentBallSpeed = getLevelSpeed() * 1.5;
            setTimeout(() => { currentBallSpeed = getLevelSpeed(); }, effect.duration);
            break;
        case "shrink":
            currentPaddleWidth = PADDLE_WIDTH * 0.6;
            resizePaddle(currentPaddleWidth);
            setTimeout(() => {
                currentPaddleWidth = PADDLE_WIDTH;
                resizePaddle(currentPaddleWidth);
            }, effect.duration);
            break;
        case "dark":
            mpDarknessActive = true;
            setTimeout(() => { mpDarknessActive = false; }, effect.duration);
            break;
    }
}

function drawOpponentHUD(ctx) {
    const op = MP.opponentState;
    if (!op) return;

    // Opponent panel — right side
    const panelX = GAME_WIDTH - 145;
    const panelY = 44;
    const panelW = 138;
    const panelH = 68;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(233, 69, 96, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#e94560";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("OPPONENT", panelX + 8, panelY + 14);

    ctx.fillStyle = "#ffffff";
    ctx.font = "11px monospace";
    ctx.fillText(`Score: ${op.score}`, panelX + 8, panelY + 30);
    ctx.fillText(`Lives: ${"❤".repeat(op.lives)}`, panelX + 8, panelY + 44);

    // Brick progress bar
    const barX = panelX + 8;
    const barY = panelY + 52;
    const barW = panelW - 16;
    const barH = 6;
    const progress = op.totalBricks > 0 ? 1 - (op.bricksLeft / op.totalBricks) : 0;

    ctx.fillStyle = "#1e1e3e";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#e94560";
    ctx.fillRect(barX, barY, barW * progress, barH);
}

function drawAttackMessage(ctx) {
    if (mpAttackMessageTimer <= 0 || !mpAttackMessage) return;
    mpAttackMessageTimer--;

    const alpha = Math.min(1, mpAttackMessageTimer / 30);
    const y = GAME_HEIGHT / 2 - 100 + (1 - alpha) * -20;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#e94560";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(mpAttackMessage, GAME_WIDTH / 2, y);
    ctx.globalAlpha = 1;
}

function drawDarknessOverlay(ctx) {
    // Radial hole around ball, rest is dark
    const grad = ctx.createRadialGradient(
        ball.position.x, ball.position.y, 30,
        ball.position.x, ball.position.y, 150
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

// --- Multiplayer: lobby UI wiring ---
const mpModeBtn = document.getElementById("mpModeBtn");
const mpCreateBtn = document.getElementById("mpCreateBtn");
const mpJoinBtn = document.getElementById("mpJoinBtn");
const mpReadyBtn = document.getElementById("mpReadyBtn");
const mpBackBtn = document.getElementById("mpBackBtn");
const mpCodeInput = document.getElementById("mpCodeInput");

if (mpModeBtn) {
    mpModeBtn.addEventListener("click", async () => {
        const serverUrl = prompt(
            "Enter server WebSocket URL:\n(e.g. ws://localhost:3000 or wss://your-server.com)",
            "ws://localhost:3000"
        );
        if (!serverUrl) return;
        try {
            await MP.connect(serverUrl);
            MP.showLobby();
        } catch {
            alert("Could not connect to server. Make sure it's running.");
        }
    });
}

if (mpCreateBtn) {
    mpCreateBtn.addEventListener("click", () => MP.createRoom());
}

if (mpJoinBtn) {
    mpJoinBtn.addEventListener("click", () => {
        const code = mpCodeInput.value.trim();
        if (code.length === 4) MP.joinRoom(code);
    });
}

if (mpReadyBtn) {
    mpReadyBtn.addEventListener("click", () => MP.setReady());
}

if (mpBackBtn) {
    mpBackBtn.addEventListener("click", () => {
        MP.disconnect();
        MP.hideLobby();
    });
}

// --- Start the engine and renderer ---
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

console.log(`🎮 Arkanoid Step 7 — ${LEVELS.length} levels! Good luck!`);
