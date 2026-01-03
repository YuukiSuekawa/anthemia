import { Utils } from './utils.js';

export class Ant {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;

        // Physics
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 40; // Pixels per second
        this.turnSpeed = 2.0;

        // State
        this.state = 'IDLE'; // IDLE, SEEK, EAT, RETURN, DEPOSIT
        this.target = null; // Honey object or Pot

        // Inventory
        this.maxCapacity = 10;
        this.carriedHoney = 0;
        this.carriedColor = { r: 255, g: 255, b: 255 }; // Default clearish

        // Visuals
        this.size = 6;
        this.wobblePhase = Math.random() * 10;
    }

    update(dt) {
        this.wobblePhase += dt * 5;

        switch (this.state) {
            case 'IDLE':
                this.updateIdle(dt);
                break;
            case 'SEEK':
                this.updateSeek(dt);
                break;
            case 'EAT':
                this.updateEat(dt);
                break;
            case 'RETURN':
                this.updateReturn(dt);
                break;
            case 'DEPOSIT':
                this.updateDeposit(dt);
                break;
        }

        // Move forward
        if (this.state !== 'EAT' && this.state !== 'DEPOSIT') {
            this.x += Math.cos(this.angle) * this.speed * dt;
            this.y += Math.sin(this.angle) * this.speed * dt;
        }
    }

    updateIdle(dt) {
        // Wander randomly
        this.angle += (Math.random() - 0.5) * this.turnSpeed * dt;

        // Look for honey
        const nearestHoney = this.findNearestHoney();
        if (nearestHoney) {
            this.target = nearestHoney;
            this.state = 'SEEK';
        }

        // Keep within bounds roughly
        if (this.x < -50 || this.x > this.game.canvas.width + 50 ||
            this.y < -50 || this.y > this.game.canvas.height + 50) {
            const centerX = this.game.canvas.width / 2;
            const centerY = this.game.canvas.height / 2;
            this.angle = Math.atan2(centerY - this.y, centerX - this.x);
        }
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
        if (dist < this.target.radius + 5) {
            this.state = 'EAT';
        }
    }

    updateEat(dt) {
        if (!this.target || this.target.amount <= 0) {
            // Finished eating or honey gone, check if full or need more
            if (this.carriedHoney > 0) {
                this.state = 'RETURN';
            } else {
                this.state = 'IDLE';
            }
            this.target = null;
            return;
        }

        const rate = 10 * dt; // Eat speed
        if (this.target.consume(rate)) {
            // Mix consumed color into abdomen
            const oldAmount = this.carriedHoney;
            this.carriedHoney += rate;

            // Mix physics
            this.carriedColor = Utils.mixColors(this.carriedColor, oldAmount, this.target.color, rate);

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
        if (dist < pot.radius) {
            this.state = 'DEPOSIT';
        }
    }

    updateDeposit(dt) {
        const rate = 20 * dt; // Deposit speed
        this.carriedHoney -= rate;

        // Add to pot
        // We add small increments to pot visually, logic simplified
        this.game.pot.addHoney(this.carriedColor, rate);

        if (this.carriedHoney <= 0) {
            this.carriedHoney = 0;
            this.carriedColor = { r: 255, g: 255, b: 255 }; // Reset color
            this.state = 'IDLE';
            // Turn around
            this.angle += Math.PI;
        }
    }

    findNearestHoney() {
        let minDist = Infinity;
        let nearest = null;
        for (const honey of this.game.honeys) {
            const d = Utils.distance(this.x, this.y, honey.x, honey.y);
            // Sensing radius
            if (d < 200 && d < minDist) {
                minDist = d;
                nearest = honey;
            }
        }
        return nearest;
    }

    smoothTurn(targetAngle, dt) {
        let diff = targetAngle - this.angle;
        // Normalize to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed * dt);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Legs (simplified animation)
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        const legOffset = Math.sin(this.wobblePhase) * 2;

        // Left legs
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, -8 + legOffset); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(5, -8 - legOffset); ctx.stroke();
        // Right legs
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 8 - legOffset); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(5, 8 + legOffset); ctx.stroke();

        // Body (Thorax + Head)
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(3, 0, this.size / 1.5, this.size / 2, 0, 0, Math.PI * 2); // Head
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-2, 0, this.size / 1.2, this.size / 2, 0, 0, Math.PI * 2); // Thorax
        ctx.fill();

        // Abdomen (The Jewel)
        // Draw mostly circular abdomen at the back
        const abSize = this.size * 1.5 + (this.carriedHoney / this.maxCapacity) * 3;
        const abX = -this.size - abSize / 2;

        ctx.beginPath();
        ctx.arc(abX, 0, abSize, 0, Math.PI * 2);

        // Color logic
        const c = this.carriedColor;
        // Adjust alpha based on fullness
        const alpha = 0.5 + (this.carriedHoney / this.maxCapacity) * 0.5;

        const grad = ctx.createRadialGradient(abX - 2, -2, 1, abX, 0, abSize);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); // Highlight
        grad.addColorStop(0.3, Utils.rgbToCss(c.r, c.g, c.b, alpha));
        grad.addColorStop(1, Utils.rgbToCss(c.r * 0.5, c.g * 0.5, c.b * 0.5, alpha)); // Darker edge

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
    }
}
