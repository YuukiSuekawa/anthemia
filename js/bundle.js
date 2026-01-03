/* Utils */
class Utils {
    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static distance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToCss(r, g, b, a = 1) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    }

    static mixColors(c1, w1, c2, w2) {
        const totalWeight = w1 + w2;
        if (totalWeight === 0) return c1;

        return {
            r: (c1.r * w1 + c2.r * w2) / totalWeight,
            g: (c1.g * w1 + c2.g * w2) / totalWeight,
            b: (c1.b * w1 + c2.b * w2) / totalWeight
        };
    }
}

/* Particle System */
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Utils.randomRange(10, 30);
        this.size = Utils.randomRange(1, 3);
        this.life = 1.0;
        this.decay = Utils.randomRange(0.5, 2.0);
    }

    update(dt) {
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.life -= this.decay * dt;
        this.size *= 0.95; // Shrink
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = Utils.rgbToCss(this.color.r, this.color.g, this.color.b);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    update(dt) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Make them glowy
        this.particles.forEach(p => p.draw(ctx));
        ctx.restore();
    }
}

/* Honey */
class Honey {
    constructor(x, y, colorHex) {
        this.x = x;
        this.y = y;
        this.color = Utils.hexToRgb(colorHex);
        this.maxAmount = 50;
        this.amount = this.maxAmount;
        this.radius = 15;
        this.wobbleTime = 0;
    }

    update(deltaTime) {
        this.radius = 5 + (this.amount / this.maxAmount) * 12;
        if (this.amount <= 0) {
            this.radius = 0;
        }
        this.wobbleTime += deltaTime * 3;
    }

    draw(ctx) {
        if (this.amount <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Wobble effect
        const scaleX = 1 + Math.sin(this.wobbleTime) * 0.05;
        const scaleY = 1 + Math.cos(this.wobbleTime) * 0.05;
        ctx.scale(scaleX, scaleY);

        // Main Drop
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-this.radius / 3, -this.radius / 3, this.radius / 10, 0, 0, this.radius);
        grad.addColorStop(0, Utils.rgbToCss(this.color.r, this.color.g, this.color.b, 0.9));
        grad.addColorStop(1, Utils.rgbToCss(this.color.r * 0.8, this.color.g * 0.8, this.color.b * 0.8, 0.95));
        ctx.fillStyle = grad;
        ctx.fill();

        // Glossy Highlight
        ctx.beginPath();
        ctx.ellipse(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.25, this.radius * 0.15, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        ctx.restore();
    }

    consume(rate) {
        this.amount -= rate;
        if (this.amount < 0) this.amount = 0;
        return this.amount > 0;
    }
}

/* Pot */
class Pot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 60; // Slightly larger for image
        this.color = { r: 50, g: 50, b: 60 };
        this.fillLevel = 0;
        this.maxFill = 1000;
        this.uiMeter = document.getElementById('pot-fill');
        this.liquidPhase = 0;

        this.image = new Image();
        this.image.src = 'Resources/potion_empty.png';
        this.imageLoaded = false;
        this.image.onload = () => { this.imageLoaded = true; };
    }

    addHoney(color, amount) {
        this.color = Utils.mixColors(this.color, this.fillLevel, color, amount);
        this.fillLevel += amount;
        this.updateUI();
    }

    updateUI() {
        if (this.uiMeter) {
            const percentage = Math.min((this.fillLevel / this.maxFill) * 100, 100);
            this.uiMeter.style.width = `${percentage}%`;
            this.uiMeter.style.backgroundColor = Utils.rgbToCss(this.color.r, this.color.g, this.color.b);
        }
    }

    update(dt) {
        this.liquidPhase += dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const w = 140; // Image width
        const h = 140; // Image height
        const imgX = -w / 2;
        const imgY = -h / 2;

        if (this.imageLoaded) {
            // 1. Draw Liquid
            ctx.save();
            ctx.beginPath();
            // Match the bottle's round bottom shape (adjusted for transparency)
            // Shifted down and left more
            ctx.arc(-4, 25, 26, 0, Math.PI * 2);
            ctx.clip();

            // Calculate liquid height
            const fillRatio = Math.min(this.fillLevel / this.maxFill, 1);
            const liquidHeight = 90 * fillRatio;
            const liquidY = 60 - liquidHeight; // Start from bottom

            if (fillRatio > 0) {
                // Fluid color
                const c = this.color;
                // Make liquid slightly glowing
                ctx.fillStyle = Utils.rgbToCss(c.r, c.g, c.b, 0.9);

                // Draw Rect for fill
                ctx.fillRect(-50, liquidY, 100, liquidHeight + 10);

                // Top surface wave
                ctx.beginPath();
                ctx.moveTo(-50, liquidY);
                for (let ix = -50; ix <= 50; ix += 5) {
                    const wave = Math.sin(ix * 0.1 + this.liquidPhase * 3) * 3;
                    ctx.lineTo(ix, liquidY + wave);
                }
                ctx.lineTo(50, 70);
                ctx.lineTo(-50, 70);
                ctx.fill();
            }
            ctx.restore();

            // 2. Draw Bottle Image (Screen Blend to keep highlights and transparency)
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(this.image, imgX, imgY, w, h);
            ctx.restore();

        } else {
            // Fallback
            ctx.fillStyle = '#444';
            ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }
}
/* Ant */
class Ant {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;

        this.angle = Math.random() * Math.PI * 2;
        this.speed = 70; // Speed 0.7x (of 100)
        this.turnSpeed = 3.0;

        this.state = 'IDLE';
        this.target = null;

        this.maxCapacity = 10;
        this.carriedHoney = 0;
        this.carriedColor = { r: 255, g: 255, b: 255 };

        this.size = 3.5; // Size 1/2
        this.wobblePhase = Math.random() * 10;
        this.legCycle = 0;
    }

    update(dt) {
        this.wobblePhase += dt * 5;
        // Move legs only when moving
        if (this.state !== 'EAT' && this.state !== 'DEPOSIT') {
            this.legCycle += dt * 15;
        }

        switch (this.state) {
            case 'IDLE': this.updateIdle(dt); break;
            case 'SEEK': this.updateSeek(dt); break;
            case 'EAT': this.updateEat(dt); break;
            case 'RETURN': this.updateReturn(dt); break;
            case 'DEPOSIT': this.updateDeposit(dt); break;
        }

        if (this.state !== 'EAT' && this.state !== 'DEPOSIT') {
            // Speed reduction based on load (Max 1/2 speed at full capacity)
            const loadRatio = this.carriedHoney / this.maxCapacity;
            const currentSpeed = this.speed * (1 - loadRatio * 0.5);

            this.x += Math.cos(this.angle) * currentSpeed * dt;
            this.y += Math.sin(this.angle) * currentSpeed * dt;
        }
    }

    updateIdle(dt) {
        this.angle += (Math.random() - 0.5) * this.turnSpeed * dt;
        const nearestHoney = this.findNearestHoney();
        if (nearestHoney) {
            this.target = nearestHoney;
            this.state = 'SEEK';
        }
        this.keepInBounds();
    }

    updateSeek(dt) {
        if (!this.target || this.target.amount <= 0) {
            this.state = 'IDLE';
            this.target = null;
            return;
        }
        const angleToTarget = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.smoothTurn(angleToTarget, dt);
        const dist = Utils.distance(this.x, this.y, this.target.x, this.target.y);
        if (dist < this.target.radius + 8) {
            this.state = 'EAT';
        }
    }

    updateEat(dt) {
        if (!this.target || this.target.amount <= 0) {
            this.state = this.carriedHoney > 0 ? 'RETURN' : 'IDLE';
            this.target = null;
            return;
        }
        const rate = 7.5 * dt; // Eat speed 1/2
        if (this.target.consume(rate)) {
            const oldAmount = this.carriedHoney;
            this.carriedHoney += rate;
            this.carriedColor = Utils.mixColors(this.carriedColor, oldAmount, this.target.color, rate);

            // Eating particles
            if (Math.random() < 0.1) {
                this.game.particles.spawn(this.target.x, this.target.y, this.target.color, 1);
            }

            if (this.carriedHoney >= this.maxCapacity) {
                this.carriedHoney = this.maxCapacity;
                this.state = 'RETURN';
                this.target = null;
            }
        }
    }

    updateReturn(dt) {
        const pot = this.game.pot;
        const angleToPot = Math.atan2(pot.y - this.y, pot.x - this.x);
        this.smoothTurn(angleToPot, dt);
        const dist = Utils.distance(this.x, this.y, pot.x, pot.y);
        if (dist < pot.radius + 5) {
            this.state = 'DEPOSIT';
        }
    }

    updateDeposit(dt) {
        const rate = 10 * dt; // Deposit speed 1/2
        this.carriedHoney -= rate;
        this.game.pot.addHoney(this.carriedColor, rate);

        // Deposit particles
        if (Math.random() < 0.2) {
            this.game.particles.spawn(this.x, this.y, this.carriedColor, 1);
        }

        if (this.carriedHoney <= 0) {
            this.carriedHoney = 0;
            this.carriedColor = { r: 255, g: 255, b: 255 };
            this.state = 'IDLE';
            this.angle += Math.PI;
        }
    }

    findNearestHoney() {
        let minDist = Infinity;
        let nearest = null;
        for (const honey of this.game.honeys) {
            const d = Utils.distance(this.x, this.y, honey.x, honey.y);
            if (d < 250 && d < minDist) {
                minDist = d;
                nearest = honey;
            }
        }
        return nearest;
    }

    keepInBounds() {
        if (this.x < -50 || this.x > this.game.canvas.width + 50 ||
            this.y < -50 || this.y > this.game.canvas.height + 50) {
            const centerX = this.game.canvas.width / 2;
            const centerY = this.game.canvas.height / 2;
            this.angle = Math.atan2(centerY - this.y, centerX - this.x);
        }
    }

    smoothTurn(targetAngle, dt) {
        let diff = targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed * dt);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2); // Facing Up

        // Scale down slightly to fit new graphics
        const s = this.size / 6;
        ctx.scale(s, s);

        // Legs (Jointed)
        ctx.strokeStyle = '#444'; // Dark legs
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 3; i++) {
            const yOffset = -4 + i * 5; // Leg spacing
            const legLen1 = 2; // Cute short legs
            const phase = this.legCycle + i * 2;
            const dir = (i < 2) ? -1 : 1; // Front & Middle forward

            // Left Leg
            let angle = Math.sin(phase) * 0.3 - 0.3; // Swing
            let kneeX = -4 - Math.cos(angle) * legLen1;
            let kneeY = yOffset + Math.sin(angle) * legLen1;
            let footX = kneeX - 3;
            let footY = kneeY + 3 * dir;

            ctx.beginPath();
            ctx.moveTo(-3, yOffset);
            ctx.lineTo(kneeX, kneeY);
            ctx.lineTo(footX, footY);
            ctx.stroke();

            // Right Leg
            angle = Math.sin(phase + Math.PI) * 0.3 + 0.3; // Opposite Phase
            kneeX = 4 + Math.cos(angle) * legLen1;
            kneeY = yOffset + Math.sin(angle) * legLen1;
            footX = kneeX + 3;
            footY = kneeY + 3 * dir; // Flip Y offset

            ctx.beginPath();
            ctx.moveTo(3, yOffset);
            ctx.lineTo(kneeX, kneeY);
            ctx.lineTo(footX, footY);
            ctx.stroke();
        }

        // Body Segments
        // Thorax (Middle)
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(0, -9, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Antennae
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-2, -12); ctx.quadraticCurveTo(-6, -20, -10, -15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, -12); ctx.quadraticCurveTo(6, -20, 10, -15); ctx.stroke();

        // Mandibles
        ctx.fillStyle = '#554';
        ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(-1, -16); ctx.lineTo(0, -13); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2, -13); ctx.lineTo(1, -16); ctx.lineTo(0, -13); ctx.fill();

        // Abdomen (The Jewel)
        const abSize = 8 + (this.carriedHoney / this.maxCapacity) * 12;
        const abY = 8 + abSize * 0.6;

        // Glassy effect
        const c = this.carriedColor;
        const width = abSize * 0.9;
        const height = abSize;

        // Base transparency based on fullness
        const fillAlpha = this.carriedHoney > 0 ? 0.4 : 0.1; // More transparent center
        const edgeAlpha = this.carriedHoney > 0 ? 0.9 : 0.3;

        const baseColor = this.carriedHoney > 0 ? c : { r: 150, g: 150, b: 160 };

        // 1. Inner Glow / Refraction (Bottom)
        const innerGrad = ctx.createRadialGradient(0, abY + height * 0.4, 1, 0, abY, height);
        innerGrad.addColorStop(0, Utils.rgbToCss(baseColor.r, baseColor.g, baseColor.b, edgeAlpha));
        innerGrad.addColorStop(0.8, Utils.rgbToCss(baseColor.r, baseColor.g, baseColor.b, fillAlpha)); // Transparent middle
        innerGrad.addColorStop(1, Utils.rgbToCss(baseColor.r * 0.5, baseColor.g * 0.5, baseColor.b * 0.5, edgeAlpha)); // Dark rim

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(0, abY, width, height, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Specular Highlight (Top Reflection)
        ctx.beginPath();
        ctx.ellipse(width * 0.3, abY - height * 0.4, width * 0.25, height * 0.15, -0.5, 0, Math.PI * 2);
        const shineGrad = ctx.createLinearGradient(0, abY - height * 0.6, 0, abY - height * 0.2);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = shineGrad;
        ctx.fill();

        // 3. Bottom Reflection (Caustics)
        ctx.beginPath();
        ctx.arc(0, abY + height * 0.5, width * 0.4, Math.PI, 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // 4. Rim Light (Outline)
        ctx.strokeStyle = Utils.rgbToCss(baseColor.r, baseColor.g, baseColor.b, 0.3);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(0, abY, width, height, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

/* Game */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = new ParticleSystem();
        this.ants = [];
        this.honeys = [];
        this.pot = new Pot(canvas.width / 2, canvas.height / 2);

        this.lastTime = 0;
        this.selectedColor = '#FF3333';

        this.init();

        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('resize', () => {
            this.pot.x = this.canvas.width / 2;
            this.pot.y = this.canvas.height / 2;
        });
    }

    init() {
        for (let i = 0; i < 30; i++) {
            this.spawnAnt();
        }
    }

    spawnAnt() {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -20 : this.canvas.width + 20;
            y = Math.random() * this.canvas.height;
        } else {
            x = Math.random() * this.canvas.width;
            y = Math.random() < 0.5 ? -20 : this.canvas.height + 20;
        }
        this.ants.push(new Ant(x, y, this));
    }

    setSelectedColor(color) {
        this.selectedColor = color;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Spawn honey
        this.honeys.push(new Honey(x, y, this.selectedColor));

        // Spawn particles
        const c = Utils.hexToRgb(this.selectedColor);
        this.particles.spawn(x, y, c, 10);
    }

    start() {
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Limiting delta time for safety
        const dt = Math.min(deltaTime, 0.1);

        this.update(dt);
        this.draw();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(deltaTime) {
        this.ants.forEach(ant => ant.update(deltaTime));
        this.pot.update(deltaTime);
        this.honeys.forEach(honey => honey.update(deltaTime));
        this.particles.update(deltaTime);

        this.honeys = this.honeys.filter(h => h.amount > 0);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Pot at bottom logic wise, but usually under ants?
        // Let's layer: Honey -> Pot (Back) -> Ants -> Particles
        // Actually Pot should be behind everything except Honey maybe?

        this.honeys.forEach(honey => honey.draw(this.ctx));
        this.pot.draw(this.ctx);
        this.ants.forEach(ant => ant.draw(this.ctx));
        this.particles.draw(this.ctx);
    }
}

/* Main */
window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');

    function resize() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    const game = new Game(canvas);
    game.start();

    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const color = btn.getAttribute('data-color');
            game.setSelectedColor(color);
            e.stopPropagation();
        });
    });

    if (colorBtns.length > 0) {
        colorBtns[0].click();
    }
});
