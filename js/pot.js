import { Utils } from './utils.js';

export class Pot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.color = { r: 100, g: 100, b: 100 }; // Starts greyish (empty)
        this.fillLevel = 0;
        this.maxFill = 1000; // Arbitrary unit
        this.uiMeter = document.getElementById('pot-fill');
    }

    addHoney(color, amount) {
        // Mix colors: Current Color * FillLevel + New Color * Amount
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

    draw(ctx) {
        ctx.save();

        // Draw Pot Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#d4af37'; // Gold rim
        ctx.stroke();

        // Draw Liquid
        if (this.fillLevel > 0) {
            ctx.beginPath();
            // Simple visual representation of fill
            const innerRadius = (this.radius - 4) * Math.min(this.fillLevel / (this.maxFill * 0.5) + 0.2, 1);
            ctx.arc(this.x, this.y, Math.max(0, innerRadius), 0, Math.PI * 2);
            ctx.fillStyle = Utils.rgbToCss(this.color.r, this.color.g, this.color.b);
            ctx.fill();
        }

        ctx.restore();
    }
}
