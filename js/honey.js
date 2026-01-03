import { Utils } from './utils.js';

export class Honey {
    constructor(x, y, colorHex) {
        this.x = x;
        this.y = y;
        this.color = Utils.hexToRgb(colorHex);
        this.maxAmount = 50;
        this.amount = this.maxAmount;
        this.radius = 15;
    }

    update(deltaTime) {
        // Slowly shrink if being eaten or overtime? 
        // For now, size depends on amount
        this.radius = 5 + (this.amount / this.maxAmount) * 10;
        if (this.amount <= 0) {
            this.radius = 0;
        }
    }

    draw(ctx) {
        if (this.amount <= 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Utils.rgbToCss(this.color.r, this.color.g, this.color.b, 0.8);
        ctx.fill();

        // Shine effect
        ctx.beginPath();
        ctx.arc(this.x - this.radius / 3, this.y - this.radius / 3, this.radius / 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.restore();
    }

    consume(rate) {
        this.amount -= rate;
        if (this.amount < 0) this.amount = 0;
        return this.amount > 0;
    }
}
