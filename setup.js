import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create required directories
const dirs = [
    'assets',
    'assets/images',
    'assets/textures',
    'assets/models',
    'config',
    'utils',
    'models'
];

dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Create placeholder files for assets
const placeholders = {
    'assets/images/phone-thumb.jpg': 'placeholder.js',
    'assets/images/phone-1.jpg': 'placeholder.js',
    'assets/images/phone-2.jpg': 'placeholder.js',
    'assets/images/phone-3.jpg': 'placeholder.js',
    'assets/textures/phone-body.jpg': 'placeholder.js',
    'assets/textures/phone-screen.jpg': 'placeholder.js'
};

Object.entries(placeholders).forEach(([file, content]) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        fs.copyFileSync(
            path.join(__dirname, 'assets/images', content),
            filePath
        );
        console.log(`Created placeholder: ${file}`);
    }
});

console.log('Setup complete! Run `npm start` to start the server.');
