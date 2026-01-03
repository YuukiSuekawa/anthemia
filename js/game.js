import { Ant } from './ant.js';
import { Honey } from './honey.js';
import { Pot } from './pot.js';
import { Utils } from './utils.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ants = [];
        this.honeys = [];
        // Place pot in center
        this.pot = new Pot(canvas.width / 2, canvas.height / 2);

        this.lastTime = 0;
        this.selectedColor = '#FF3333';

        this.init();

        // Bind click event
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Update pot position on resize
        window.addEventListener('resize', () => {
            this.pot.x = this.canvas.width / 2;
            this.pot.y = this.canvas.height / 2;
        });
    }

    init() {
        // Spawn initial ants
        for (let i = 0; i < 20; i++) {
            this.spawnAnt();
        }
    }

    spawnAnt() {
        // Spawn from edges
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -10 : this.canvas.width + 10;
            y = Math.random() * this.canvas.height;
        } else {
            x = Math.random() * this.canvas.width;
            y = Math.random() < 0.5 ? -10 : this.canvas.height + 10;
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

        this.honeys.push(new Honey(x, y, this.selectedColor));
    }

    start() {
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(deltaTime) {
        // Update Ants
        this.ants.forEach(ant => ant.update(deltaTime));

        // Update Honeys
        this.honeys.forEach(honey => honey.update(deltaTime));
        // Remove empty honeys
        this.honeys = this.honeys.filter(h => h.amount > 0);

        // Pot doesn't need much updating per frame logic yet
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Pot (Bottom layer)
        this.pot.draw(this.ctx);

        // Draw Honeys
        this.honeys.forEach(honey => honey.draw(this.ctx));

        // Draw Ants
        this.ants.forEach(ant => ant.draw(this.ctx));
    }
}
