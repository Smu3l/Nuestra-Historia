const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'assets', 'sprites');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const TILE_W = 24, TILE_H = 32;
const PAL = {
    BLACK: '#1a1a1a', SKIN: '#f1c27d', WHITE: '#ffffff',
    BLUE: '#3498db', BLUE_D: '#2980b9', BROWN: '#6d4c41',
    PINK: '#ff4d6d', GRAY: '#cccccc'
};

function drawCharacterFrame(ctx, type, dir, frame) {
    let legL = 0, legR = 0, bob = 0;
    if (frame === 1) { legL = -2; legR = 2; bob = 1; }
    if (frame === 3) { legL = 2; legR = -2; bob = 1; }

    const isMJ = type === 'mariajose';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(TILE_W/2, 30, 7, 2, 0, 0, Math.PI*2); ctx.fill();

    ctx.save();
    ctx.translate(TILE_W/2 - 8, 4); // Center 16x24 in 24x32

    if (isMJ) {
        // Pelo fondo
        ctx.fillStyle = PAL.BLACK;
        ctx.fillRect(3, 5 + bob, 10, 11);
        
        // Cuerpo
        ctx.fillStyle = PAL.WHITE;
        ctx.fillRect(4, 12 + bob, 8, 6);
        
        // Piernas/Falda
        ctx.fillStyle = PAL.BLACK;
        ctx.fillRect(5, 17 + legL, 3, 5); ctx.fillRect(8, 17 + legR, 3, 5);
        ctx.fillStyle = PAL.WHITE;
        ctx.fillRect(5, 22 + legL, 3, 2); ctx.fillRect(8, 22 + legR, 3, 2);

        // Cara
        ctx.fillStyle = PAL.SKIN;
        ctx.fillRect(4, 3 + bob, 8, 9);
        
        // Pelo Arriba y Lazo
        ctx.fillStyle = PAL.BLACK;
        ctx.fillRect(3, 1 + bob, 10, 4);
        ctx.fillStyle = PAL.PINK;
        ctx.fillRect(9, 1 + bob, 3, 3);
        
        // Gafas
        ctx.fillStyle = '#111111';
        ctx.fillRect(4, 6 + bob, 3, 2); ctx.fillRect(9, 6 + bob, 3, 2);
    } else {
        // Samuel
        ctx.fillStyle = PAL.BLUE;
        ctx.fillRect(4, 12 + bob, 8, 6);
        ctx.fillStyle = PAL.JEAN || '#34495e';
        ctx.fillRect(5, 18 + legL, 3, 5); ctx.fillRect(8, 18 + legR, 3, 5);
        
        ctx.fillStyle = PAL.SKIN;
        ctx.fillRect(4, 4 + bob, 8, 8);
        
        ctx.fillStyle = PAL.BROWN;
        ctx.fillRect(4, 1 + bob, 8, 4);
        ctx.fillRect(3, 2 + bob, 10, 2);
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(5, 7 + bob, 1, 1); ctx.fillRect(10, 7 + bob, 1, 1);
        
        ctx.fillStyle = PAL.WHITE;
        ctx.fillRect(5, 23 + legL, 3, 1); ctx.fillRect(8, 23 + legR, 3, 1);
    }
    ctx.restore();
}

function generateCharacterSpriteSheet(type) {
    const canvas = createCanvas(4 * TILE_W, 4 * TILE_H), ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            ctx.save(); ctx.translate(c * TILE_W, r * TILE_H);
            drawCharacterFrame(ctx, type, c, r); ctx.restore();
        }
    }
    const filename = type + '.png', filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, canvas.toBuffer('image/png'));
    console.log(`Generated: ${filepath}`);
}

generateCharacterSpriteSheet('mariajose');
generateCharacterSpriteSheet('samuel');

function generateCharacterSpriteSheet(type) {
    const canvas = createCanvas(4 * TILE_W, 4 * TILE_H), ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            ctx.save(); ctx.translate(c * TILE_W, r * TILE_H);
            drawCharacterFrame(ctx, type, c, r); ctx.restore();
        }
    }
    const filename = type + '.png', filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, canvas.toBuffer('image/png'));
    console.log(`Generated: ${filepath}`);
}

generateCharacterSpriteSheet('mariajose');
generateCharacterSpriteSheet('samuel');
