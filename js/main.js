import { Game } from './game.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');

    // Resize canvas to fill container
    function resize() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    // Initialize Game
    const game = new Game(canvas);
    game.start();

    // Color Selection UI
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            colorBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            const color = btn.getAttribute('data-color');
            game.setSelectedColor(color);
            e.stopPropagation(); // Prevent triggering canvas click
        });
    });

    // Default select first color
    if (colorBtns.length > 0) {
        colorBtns[0].click();
    }
});
