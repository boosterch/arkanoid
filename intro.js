// ============================================
// Intro: "Developed by Jekko" cinematic splash
// ============================================

(function () {
    const overlay = document.getElementById("introOverlay");
    const canvas = document.getElementById("introCanvas");
    const ctx = canvas.getContext("2d");

    // Hi-DPI support
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // --- Timing ---
    const INTRO_DURATION = 4500; // ms total
    const FADE_IN_END = 0.2;    // 0–20% fade in
    const HOLD_END = 0.75;      // 20–75% hold
    const FADE_OUT_END = 1.0;   // 75–100% fade out
    let startTime = null;
    let done = false;

    // --- Particles around logo ---
    const introParticles = [];
    for (let i = 0; i < 60; i++) {
        introParticles.push({
            angle: Math.random() * Math.PI * 2,
            radius: 80 + Math.random() * 140,
            speed: 0.2 + Math.random() * 0.6,
            size: 1 + Math.random() * 2.5,
            hue: 200 + Math.random() * 160 // cyan to purple range
        });
    }

    // --- Letter reveal sparks ---
    const sparks = [];

    function spawnLetterSparks(x, y) {
        for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 4;
            sparks.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s - 1,
                life: 1,
                decay: 0.02 + Math.random() * 0.03,
                size: 1 + Math.random() * 2,
                hue: 200 + Math.random() * 100
            });
        }
    }

    // --- Floating background dots ---
    const bgDots = [];
    for (let i = 0; i < 40; i++) {
        bgDots.push({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 1.5 + 0.5,
            speed: 0.0002 + Math.random() * 0.0004,
            alpha: 0.1 + Math.random() * 0.2
        });
    }

    // --- "JEKKO" letter geometry for glow outline ---
    const JEKKO_LETTERS = "JEKKO";
    let letterSparksSpawned = [false, false, false, false, false];

    // --- Main draw ---
    function draw(timestamp) {
        if (done) return;
        if (!startTime) startTime = timestamp;

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / INTRO_DURATION, 1);

        // Clear
        ctx.clearRect(0, 0, W(), H());

        // Background
        const bgGrad = ctx.createRadialGradient(W() / 2, H() / 2, 0, W() / 2, H() / 2, Math.max(W(), H()) * 0.7);
        bgGrad.addColorStop(0, "#0f1025");
        bgGrad.addColorStop(1, "#050510");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W(), H());

        // Background floating dots
        for (const d of bgDots) {
            d.y -= d.speed;
            if (d.y < 0) { d.y = 1; d.x = Math.random(); }
            ctx.globalAlpha = d.alpha;
            ctx.fillStyle = "#4cc9f0";
            ctx.beginPath();
            ctx.arc(d.x * W(), d.y * H(), d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Compute master alpha for fade in/out
        let alpha = 1;
        if (progress < FADE_IN_END) {
            alpha = progress / FADE_IN_END;
        } else if (progress > HOLD_END) {
            alpha = 1 - (progress - HOLD_END) / (FADE_OUT_END - HOLD_END);
        }
        alpha = Math.max(0, Math.min(1, alpha));

        const cx = W() / 2;
        const cy = H() / 2;

        ctx.globalAlpha = alpha;

        // --- Orbiting particles ---
        const time = elapsed * 0.001;
        for (const p of introParticles) {
            p.angle += p.speed * 0.016;
            const px = cx + Math.cos(p.angle + time * 0.2) * p.radius;
            const py = cy + Math.sin(p.angle + time * 0.2) * p.radius * 0.5;
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = `hsl(${p.hue}, 80%, 70%)`;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = alpha;

        // --- Horizontal accent line ---
        const lineW = 200 * Math.min(1, progress / FADE_IN_END);
        const lineGrad = ctx.createLinearGradient(cx - lineW, cy + 42, cx + lineW, cy + 42);
        lineGrad.addColorStop(0, "rgba(76, 201, 240, 0)");
        lineGrad.addColorStop(0.3, "rgba(76, 201, 240, 0.6)");
        lineGrad.addColorStop(0.5, "rgba(189, 147, 249, 0.8)");
        lineGrad.addColorStop(0.7, "rgba(76, 201, 240, 0.6)");
        lineGrad.addColorStop(1, "rgba(76, 201, 240, 0)");
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - lineW, cy + 42);
        ctx.lineTo(cx + lineW, cy + 42);
        ctx.stroke();

        // --- "developed by" text ---
        const devReveal = Math.min(1, Math.max(0, (progress - 0.05) / 0.15));
        ctx.globalAlpha = alpha * devReveal;
        ctx.fillStyle = "#8892b0";
        ctx.font = "300 14px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "4px";
        ctx.fillText("developed by", cx, cy - 38);

        // --- "JEKKO" logo ---
        const logoReveal = Math.min(1, Math.max(0, (progress - 0.1) / 0.2));
        ctx.globalAlpha = alpha * logoReveal;

        // Text measurement for spark spawning
        ctx.font = "bold 64px 'Segoe UI', Arial, sans-serif";
        const logoText = JEKKO_LETTERS;
        const textWidth = ctx.measureText(logoText).width;
        const logoX = cx - textWidth / 2;

        // Per-letter reveal with stagger
        let xOffset = 0;
        for (let i = 0; i < logoText.length; i++) {
            const letterDelay = 0.1 + i * 0.04;
            const letterProgress = Math.min(1, Math.max(0, (progress - letterDelay) / 0.1));
            const letterAlpha = alpha * letterProgress;
            const letterScale = 0.7 + 0.3 * letterProgress;

            const charW = ctx.measureText(logoText[i]).width;
            const charX = logoX + xOffset + charW / 2;

            // Spawn sparks when letter appears
            if (letterProgress > 0.5 && !letterSparksSpawned[i]) {
                letterSparksSpawned[i] = true;
                spawnLetterSparks(charX, cy + 8);
            }

            ctx.save();
            ctx.translate(charX, cy + 8);
            ctx.scale(letterScale, letterScale);
            ctx.globalAlpha = letterAlpha;

            // Letter glow
            ctx.shadowColor = "#4cc9f0";
            ctx.shadowBlur = 20;

            // Gradient fill per letter
            const lGrad = ctx.createLinearGradient(0, -30, 0, 30);
            lGrad.addColorStop(0, "#ffffff");
            lGrad.addColorStop(0.4, "#4cc9f0");
            lGrad.addColorStop(1, "#bd93f9");
            ctx.fillStyle = lGrad;

            ctx.font = "bold 64px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(logoText[i], 0, 0);

            ctx.restore();
            xOffset += charW;
        }

        // --- Sparks ---
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.05;
            s.life -= s.decay;
            if (s.life <= 0) { sparks.splice(i, 1); continue; }
            ctx.globalAlpha = alpha * s.life;
            ctx.fillStyle = `hsl(${s.hue}, 90%, 75%)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- Pulsing outer ring ---
        const ringAlpha = alpha * 0.15 * (0.5 + 0.5 * Math.sin(time * 3));
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = "#4cc9f0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 110 + Math.sin(time * 2) * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // --- "tap to skip" hint ---
        if (progress > 0.3) {
            const skipAlpha = alpha * 0.4 * (0.5 + 0.5 * Math.sin(time * 2));
            ctx.globalAlpha = skipAlpha;
            ctx.fillStyle = "#556688";
            ctx.font = "12px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("tap or click to skip", cx, H() - 40);
        }

        ctx.globalAlpha = 1;

        // Auto-finish
        if (progress >= 1) {
            finishIntro();
            return;
        }

        requestAnimationFrame(draw);
    }

    // --- Finish & remove overlay ---
    function finishIntro() {
        if (done) return;
        done = true;
        overlay.classList.add("fade-out");
        overlay.addEventListener("animationend", () => {
            overlay.remove();
        });
    }

    // Skip on click/tap
    overlay.addEventListener("click", finishIntro);
    overlay.addEventListener("touchstart", (e) => {
        e.preventDefault();
        finishIntro();
    }, { passive: false });

    // Start the animation
    requestAnimationFrame(draw);
})();
