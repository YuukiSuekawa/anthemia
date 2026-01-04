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

    static lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }
}

/* Particle System */
class Particle {
    constructor(x, y, color, sizeScale = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Utils.randomRange(20, 50);
        this.size = Utils.randomRange(1, 3) * sizeScale;
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

    spawn(x, y, color, count = 5, sizeScale = 1) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, sizeScale));
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
        this.wobbleIntensity = 1.0; // Start strong
    }

    update(deltaTime) {
        this.radius = 5 + (this.amount / this.maxAmount) * 12;
        if (this.amount <= 0) {
            this.radius = 0;
        }
        this.wobbleTime += deltaTime * 18; // Even faster wobble
        this.wobbleIntensity *= 0.92; // Decay slower
    }

    draw(ctx) {
        if (this.amount <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Jelly Wobble effect
        const scaleX = 1 + Math.sin(this.wobbleTime) * 0.6 * this.wobbleIntensity;
        const scaleY = 1 + Math.cos(this.wobbleTime) * 0.6 * this.wobbleIntensity;
        ctx.scale(scaleX, scaleY);

        this.radius = Math.max(0, this.radius);

        // 1. Drop Shadow (Projected on ground) - "Outer Shadow"
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 8;
        ctx.shadowOffsetY = 8;

        // 2. Base Body (Color) using the requested style (Overlay/Gradient feel)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Utils.rgbToCss(this.color.r, this.color.g, this.color.b, 0.65);
        ctx.fill();

        // Turn off drop shadow for internal details
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 3. Inner Shadow / Shading Simulation
        // Gradient from Top-Left (Dark) to Bottom-Right (Light) to mimic "inset" shadow + light transmission
        const innerGrad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
        innerGrad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');   // Dark Top-Left (Inner Shadow)
        innerGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');    // Transparent Center
        innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)'); // Light Bottom-Right (Refraction)

        ctx.fillStyle = innerGrad;
        ctx.fill();

        // 4. Glossy Highlight (Crisp White Dot at Top-Left)
        ctx.beginPath();
        // Smaller, rounder highlight positioned at Top-Left
        ctx.ellipse(-this.radius * 0.4, -this.radius * 0.4, this.radius * 0.15, this.radius * 0.12, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
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
        this.radius = 120; // Doubled collision radius
        this.color = { r: 50, g: 50, b: 60 };
        this.fillLevel = 0;
        this.maxFill = 1000;
        this.uiMeter = document.getElementById('pot-fill');
        this.uiMeter = document.getElementById('pot-fill');
        this.liquidPhase = 0;
        this.isCollecting = false; // State to block filling during collection logic

        this.image = new Image();
        this.image.src = 'Resources/potion_empty.png';
        this.imageLoaded = false;
        this.image.onload = () => { this.imageLoaded = true; };
    }

    addHoney(color, amount) {
        if (this.isCollecting) return; // Reject honey while collecting

        this.color = Utils.mixColors(this.color, this.fillLevel, color, amount);
        this.fillLevel += amount;
        this.updateUI();

        if (this.fillLevel >= this.maxFill) {
            this.triggerCollection();
        }
    }

    triggerCollection() {
        this.isCollecting = true;

        // Play splash sound effect
        if (window.game && window.game.soundManager) {
            window.game.soundManager.playSplashSound();
        }

        // Spawn Flying Potion Animation
        if (window.game) window.game.spawnFlyingPotion(this.color);

        // Reset Logic
        setTimeout(() => {
            this.fillLevel = 0;
            this.color = { r: 50, g: 50, b: 60 }; // Reset color
            this.isCollecting = false;
            this.updateUI();
        }, 1000);
    }

    getEntranceLocation() {
        // Offset Y to find the bottle mouth (Top of neck)
        // Shifted to upper right as requested
        return { x: this.x + 45, y: this.y - 85 };
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

        // Doubled Size
        const w = 280;
        const h = 280;
        const imgX = -w / 2;
        const imgY = -h / 2;

        if (this.imageLoaded) {
            // 1. Draw Liquid
            ctx.save();
            ctx.beginPath();
            // Match the bottle's round bottom shape (adjusted for 2x size)
            // Original: (-4, 25, 26) -> New: (-8, 50, 52)
            ctx.arc(-8, 50, 52, 0, Math.PI * 2);
            ctx.clip();

            // Calculate liquid height
            // Bottle bulb diameter is ~104px (Radius 52)
            // Sync visual height to fill ratio strictly
            const fillRatio = Math.min(this.fillLevel / this.maxFill, 1);
            const currentHeight = 104 * fillRatio;
            const liquidY = 102 - currentHeight; // Bottom of circle (50 + 52) = 102

            if (fillRatio > 0) {
                // Fluid color
                const c = this.color;
                // Make liquid slightly glowing
                ctx.fillStyle = Utils.rgbToCss(c.r, c.g, c.b, 0.9);

                // Draw Rect for fill
                ctx.fillRect(-100, liquidY, 200, currentHeight + 20);

                // Top surface wave
                ctx.beginPath();
                ctx.moveTo(-100, liquidY);
                for (let ix = -100; ix <= 100; ix += 10) {
                    const wave = Math.sin(ix * 0.05 + this.liquidPhase * 3) * 6; // Doubled wave amp
                    ctx.lineTo(ix, liquidY + wave);
                }
                ctx.lineTo(100, 140); // Doubled from 70
                ctx.lineTo(-100, 140);
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
    constructor(x, y, game, startInNest = false) {
        this.game = game;

        if (startInNest) {
            this.x = game.nestPosition.x;
            this.y = game.nestPosition.y;
            this.state = 'IN_NEST';
            this.nestTimer = Utils.randomRange(1, 3); // Random wait time in nest
        } else {
            this.x = x;
            this.y = y;
            this.state = 'IDLE';
            this.nestTimer = 0;
        }

        this.angle = Math.random() * Math.PI * 2;
        this.speed = 70; // Speed 0.7x (of 100)
        this.turnSpeed = 3.0;
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
            case 'IN_NEST': this.updateInNest(dt); break;
            case 'EXITING_NEST': this.updateExitingNest(dt); break;
            case 'IDLE': this.updateIdle(dt); break;
            case 'SEEK': this.updateSeek(dt); break;
            case 'EAT': this.updateEat(dt); break;
            case 'RETURN': this.updateReturn(dt); break;
            case 'DEPOSIT': this.updateDeposit(dt); break;
            case 'TO_NEST': this.updateToNest(dt); break;
        }

        if (this.state !== 'EAT' && this.state !== 'DEPOSIT' && this.state !== 'IN_NEST') {
            // Speed reduction based on load (Max 1/2 speed at full capacity)
            const loadRatio = this.carriedHoney / this.maxCapacity;
            const currentSpeed = this.speed * (1 - loadRatio * 0.5);

            this.x += Math.cos(this.angle) * currentSpeed * dt;
            this.y += Math.sin(this.angle) * currentSpeed * dt;
        }
    }


    updateInNest(dt) {
        // Wait in nest
        this.nestTimer -= dt;
        if (this.nestTimer <= 0) {
            this.state = 'EXITING_NEST';
            // Set angle to move away from nest (downward)
            this.angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
        }
    }

    updateExitingNest(dt) {
        // Move away from nest
        const dist = Utils.distance(this.x, this.y, this.game.nestPosition.x, this.game.nestPosition.y);
        this.avoidPot(dt);
        if (dist > 50) {
            this.state = 'IDLE';
        }
    }

    updateToNest(dt) {
        // Move toward nest
        const nest = this.game.nestPosition;
        const angleToNest = Math.atan2(nest.y - this.y, nest.x - this.x);
        this.smoothTurn(angleToNest, dt);
        this.avoidPot(dt);

        const dist = Utils.distance(this.x, this.y, nest.x, nest.y);
        if (dist < 20) {
            // Entered nest
            this.x = nest.x;
            this.y = nest.y;
            this.state = 'IN_NEST';
            this.nestTimer = Utils.randomRange(2, 5); // Wait before exiting again
        }
    }

    updateIdle(dt) {
        this.angle += (Math.random() - 0.5) * this.turnSpeed * dt;
        const nearestHoney = this.findNearestHoney();
        if (nearestHoney) {
            this.target = nearestHoney;
            this.state = 'SEEK';
        }
        this.avoidPot(dt);
        this.keepInBounds();
    }

    avoidPot(dt) {
        const pot = this.game.pot;
        const potCenterX = pot.x;
        const potCenterY = pot.y + 50;
        const potRadius = 60;
        const avoidanceRadius = potRadius + 40; // Wider detection for smoothness

        const dx = this.x - potCenterX;
        const dy = this.y - potCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < avoidanceRadius) {
            const angleAway = Math.atan2(dy, dx);

            // Tangents with Outward Bias (Spiral Out)
            // Tangents with Outward Bias (Spiral Out)
            const spiralBias = Math.PI / 6; // 30 degrees outward
            // To spiral OUT, we need to angle closer to 'angleAway' (0 deg relative)
            // Original Tangents were +/- 90 deg. We want +/- 60 deg.
            const tangent1 = angleAway + Math.PI / 2 - spiralBias;
            const tangent2 = angleAway - Math.PI / 2 + spiralBias;

            // Determine which tangent is closer to current heading
            // Simple angle diff check
            const diff1 = Math.abs(Math.atan2(Math.sin(tangent1 - this.angle), Math.cos(tangent1 - this.angle)));
            const diff2 = Math.abs(Math.atan2(Math.sin(tangent2 - this.angle), Math.cos(tangent2 - this.angle)));

            const targetAngle = (diff1 < diff2) ? tangent1 : tangent2;

            // Intensity: 0 at outer edge, 1 at inner radius
            let intensity = 1.0 - (dist - potRadius) / (avoidanceRadius - potRadius);
            intensity = Math.max(0, Math.min(1, intensity));

            // Turn speed increases as we get closer
            // Base turn speed + added urgency
            const turnRate = 2.0 + intensity * 4.0;

            this.smoothTurn(targetAngle, dt * turnRate);

            // Hard collision pushout
            if (dist < potRadius) {
                const push = (potRadius - dist) * 8 * dt; // Stronger push
                this.x += Math.cos(angleAway) * push;
                this.y += Math.sin(angleAway) * push;
            }
        }
    }

    updateSeek(dt) {
        if (!this.target || this.target.amount <= 0) {
            this.state = this.carriedHoney > 0 ? 'RETURN' : 'IDLE';
            this.target = null;
            return;
        }
        const angleToTarget = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.smoothTurn(angleToTarget, dt);
        this.avoidPot(dt);
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
        const entrance = pot.getEntranceLocation();

        // Target the entrance, with some randomness to avoid stacking
        const targetX = entrance.x + Math.sin(this.wobblePhase) * 10;
        const targetY = entrance.y + Math.cos(this.wobblePhase) * 5;

        const angleToPot = Math.atan2(targetY - this.y, targetX - this.x);
        this.smoothTurn(angleToPot, dt);
        this.avoidPot(dt);

        const dist = Utils.distance(this.x, this.y, targetX, targetY);
        // Much closer distance threshold for the small entrance
        if (dist < 15) {
            this.state = 'DEPOSIT';
            // Play pour sound when starting to deposit
            this.game.soundManager.playPourSound();
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
            this.state = 'TO_NEST'; // Return to nest after depositing
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
        if (this.state === 'IN_NEST') return; // Don't draw if inside

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2); // Facing Up

        // Scale down slightly to fit new graphics
        const s = this.size / 6;
        ctx.scale(s, s);

        // Scale down if entering/exiting nest
        if (this.state === 'TO_NEST' || this.state === 'EXITING_NEST') {
            const dist = Utils.distance(this.x, this.y, window.game.nestPosition.x, window.game.nestPosition.y);
            if (dist < 30) {
                const scale = Math.max(0, dist / 30);
                ctx.scale(scale, scale);
            }
        }

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
        const fillAlpha = this.carriedHoney > 0 ? 0.6 : 0.1; // Slightly more opaque center
        const edgeAlpha = this.carriedHoney > 0 ? 0.8 : 0.3; // More transparent edge

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

        // Potion Collection System
        this.potionsCollected = 0;
        this.scoreDisplay = document.getElementById('score-display');
        this.flyingPotions = []; // List of active flying potions animations
        this.potionIcon = document.getElementById('potion-icon'); // Target for animation

        // Sound Manager
        this.soundManager = new SoundManager();

        // Load Nest Image
        this.nestImage = new Image();
        this.nestImage.src = "Resources/nest_hole2.png?v=" + new Date().getTime();
        this.nestImageLoaded = false;
        this.nestImage.onload = () => { this.nestImageLoaded = true; };

        // Nest Configuration
        this.nestPosition = { x: this.canvas.width / 2, y: 70 }; // Centered horizontally, fixed Y




        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('resize', () => {
            this.pot.x = this.canvas.width / 2;
            this.pot.y = this.canvas.height / 2;
            this.nestPosition.x = this.canvas.width / 2;
            this.nestPosition.y = 70; // Keep Y fixed
        });

        // Game State
        this.gameState = 'TITLE'; // 'TITLE', 'PLAYING'
        this.isPaused = false;
        this.setupTitleScreen();
        this.setupSettingsUI();
    }

    setupSettingsUI() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        const volumeSlider = document.getElementById('volume-slider');
        const resetBtn = document.getElementById('reset-btn');

        // Open Settings
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from spawning honey
            this.isPaused = true;
            settingsModal.classList.remove('hidden');
        });

        // Close Settings
        closeSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsModal.classList.add('hidden');
            this.isPaused = false;
            // Reset lastTime to avoid huge delta time jump
            this.lastTime = performance.now();
        });

        // Volume Control
        volumeSlider.addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            this.soundManager.setMasterVolume(vol);
        });

        // Reset Game
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Reset current progress?")) {
                this.resetGame();
                settingsModal.classList.add('hidden');
                this.isPaused = false;
                this.lastTime = performance.now();
            }
        });
    }

    resetGame() {
        // Clear entities
        this.ants = [];
        this.honeys = [];
        this.particles.particles = []; // Accessing internal array of ParticleSystem
        this.flyingPotions = [];

        // Reset Pot
        this.pot = new Pot(this.canvas.width / 2, this.canvas.height / 2);

        // Reset Score
        this.potionsCollected = 0;
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = "0";
        }

        // Respawn initial ants
        for (let i = 0; i < 20; i++) {
            this.spawnAnt(true);
        }
    }

    setupTitleScreen() {
        const titleScreen = document.getElementById('title-screen');
        const startHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.gameState === 'TITLE') {
                this.startGame();
            }
        };
        // Allow click/touch on the title screen
        titleScreen.addEventListener('click', startHandler);
        titleScreen.addEventListener('touchstart', startHandler);
    }

    startGame() {
        this.gameState = 'PLAYING';
        document.getElementById('title-screen').classList.add('hidden');

        // Resume AudioContext if needed (browser policy)
        if (this.soundManager && this.soundManager.ctx) {
            if (this.soundManager.ctx.state === 'suspended') {
                this.soundManager.ctx.resume();
            }
        }

        // Initial Spawns
        for (let i = 0; i < 20; i++) {
            this.spawnAnt(true); // true = start in nest
        }
    }

    init() {
        for (let i = 0; i < 30; i++) {
            this.spawnAnt();
        }
    }

    collectPotion() {
        this.soundManager.playBottleSound();
        this.potionsCollected++;
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = this.potionsCollected;

            // Score pop animation
            this.scoreDisplay.style.transform = "scale(1.5)";
            setTimeout(() => {
                this.scoreDisplay.style.transform = "scale(1)";
            }, 200);
        }
    }

    spawnFlyingPotion(color) {
        // Play bottle sound effect


        // Target position (UI icon)
        let tx = this.canvas.width - 50;
        let ty = this.canvas.height - 50;

        if (this.potionIcon) {
            const rect = this.potionIcon.getBoundingClientRect();
            // Convert page coords to canvas coords (assuming canvas fills window or similar)
            // Just use rect relative to viewport if canvas is full screen
            tx = rect.left + rect.width / 2;
            ty = rect.top + rect.height / 2;
        }

        this.flyingPotions.push({
            x: this.pot.x,
            y: this.pot.y,
            targetX: tx,
            targetY: ty,
            color: color,
            progress: 0,
            speed: 1.5 // Animation speed
        });
    }

    updateFlyingPotions(dt) {
        for (let i = this.flyingPotions.length - 1; i >= 0; i--) {
            const p = this.flyingPotions[i];
            p.progress += dt * p.speed;

            if (p.progress >= 1) {
                // Arrived
                this.collectPotion();
                this.flyingPotions.splice(i, 1);
            } else {
                // Ease out cubic
                const t = 1 - Math.pow(1 - p.progress, 3);
                p.x = Utils.lerp(this.pot.x, p.targetX, t);
                p.y = Utils.lerp(this.pot.y, p.targetY, t);
                p.scale = Utils.lerp(1.0, 0.2, t); // Shrink as it flies
            }
        }
    }

    drawFlyingPotions(ctx) {
        this.flyingPotions.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(p.scale, p.scale);

            // Draw a simplified potion (or use the icon image if available?)
            // Let's use the actual pot image + filled circle

            // 1. Liquid
            ctx.fillStyle = Utils.rgbToCss(p.color.r, p.color.g, p.color.b);
            ctx.beginPath();
            ctx.arc(0, 50, 48, 0, Math.PI * 2); // Simplified fill
            ctx.fill();

            // 2. Bottle (Reusing Pot logic roughly or just a circle outline for speed)
            // Use instance image if loaded
            if (this.pot.imageLoaded) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(this.pot.image, -140, -140, 280, 280);
                ctx.restore();
            }

            ctx.restore();
        });
    }

    spawnAnt(startInNest = false) {
        let x, y;
        if (startInNest) {
            // Spawn from nest
            x = this.nestPosition.x;
            y = this.nestPosition.y;
        } else {
            // Spawn from screen edges
            if (Math.random() < 0.5) {
                x = Math.random() < 0.5 ? -20 : this.canvas.width + 20;
                y = Math.random() * this.canvas.height;
            } else {
                x = Math.random() * this.canvas.width;
                y = Math.random() < 0.5 ? -20 : this.canvas.height + 20;
            }
        }
        this.ants.push(new Ant(x, y, this, startInNest));
    }

    setSelectedColor(color) {
        this.selectedColor = color;
    }

    handleClick(e) {
        if (this.gameState !== 'PLAYING') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if click is on the potion (prevent spawning inside avoidance zone)
        const potCenterX = this.pot.x;
        const potCenterY = this.pot.y + 50;
        const distToPot = Utils.distance(x, y, potCenterX, potCenterY);
        if (distToPot < 65) return; // Ignore clicks on the potion body

        // Spawn honey
        this.honeys.push(new Honey(x, y, this.selectedColor));

        // Play drop sound effect
        this.soundManager.playSplashSound();

        // Spawn particles
        const c = Utils.hexToRgb(this.selectedColor);
        this.particles.spawn(x, y, c, 10, 4);
    }

    start() {
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(currentTime) {
        if (this.isPaused) {
            requestAnimationFrame((time) => this.loop(time));
            return;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime; this.lastTime = currentTime;

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

        this.updateFlyingPotions(deltaTime);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Pot at bottom logic wise, but usually under ants?
        // Let's layer: Honey -> Pot (Back) -> Ants -> Particles
        // Actually Pot should be behind everything except Honey maybe?

        this.honeys.forEach(honey => honey.draw(this.ctx));

        // Draw Nest
        if (this.nestImageLoaded) {
            const nestSize = 100;
            this.ctx.drawImage(
                this.nestImage,
                this.nestPosition.x - nestSize / 2,
                this.nestPosition.y - nestSize / 2,
                nestSize,
                nestSize
            );
        } else {
            // Fallback: simple circle
            this.ctx.fillStyle = '#3a2a1a';
            this.ctx.beginPath();
            this.ctx.arc(this.nestPosition.x, this.nestPosition.y, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.pot.draw(this.ctx);
        this.ants.forEach(ant => ant.draw(this.ctx));
        this.particles.draw(this.ctx);
        this.drawFlyingPotions(this.ctx);
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
    window.game = game; // Expose to window for Pot access
    game.start();

    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const color = btn.getAttribute('data-color');
            game.setSelectedColor(color);
            game.soundManager.playSelectSound();
            e.stopPropagation();
        });
    });

    if (colorBtns.length > 0) {
        // Manually initialize the first color without triggering the click event (sound)
        const btn = colorBtns[0];
        btn.classList.add('active');
        const color = btn.getAttribute('data-color');
        game.setSelectedColor(color);
    }
});
