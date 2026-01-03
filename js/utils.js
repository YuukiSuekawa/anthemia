export class Utils {
    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static distance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // HEX color to RGB object
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // RGB object to CSS string
    static rgbToCss(r, g, b, a = 1) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    }

    // Mix two colors based on weight
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
