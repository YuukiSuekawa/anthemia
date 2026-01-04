const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const resourcesDir = path.join(baseDir, 'Resources');
const outputFile = path.join(baseDir, 'js/AudioResources.js');

const files = {
    "splash": "水滴3.mp3",
    "bottle": "氷の入ったグラス.mp3",
    "pour": "グラスに水を注ぐ.mp3",
    "select": "決定ボタンを押す41.mp3"
};

console.log("Starting AudioResources regeneration (Node.js)...");

let content = "const AudioResources = {\n";

for (const [key, filename] of Object.entries(files)) {
    const filePath = path.join(resourcesDir, filename);

    if (fs.existsSync(filePath)) {
        try {
            const buffer = fs.readFileSync(filePath);
            const b64 = buffer.toString('base64');
            const mime = "data:audio/mp3;base64,";

            content += `    ${key}: \`${mime}${b64}\`,\n`;
            console.log(`Processed ${key} from ${filename}`);
        } catch (err) {
            console.error(`Error reading ${filename}:`, err);
        }
    } else {
        console.warn(`File not found: ${filePath}`);
    }
}

content += "};\n";

fs.writeFileSync(outputFile, content, 'utf8');
console.log("AudioResources.js regenerated successfully.");
