import { Assets, BitmapText, Filter, IBitmapTextStyle } from 'pixi.js-legacy';

export function rgbaToRgb565(rgba: Uint8Array) {
    const length = rgba.length / 4;
    const rgb565 = new Uint16Array(length);

    for (let i = 0; i < length; i++) {
        const r = rgba[i * 4];
        const g = rgba[i * 4 + 1];
        const b = rgba[i * 4 + 2];

        const r5 = ((r * 31) / 255) | 0;
        const g6 = ((g * 63) / 255) | 0;
        const b5 = ((b * 31) / 255) | 0;

        const rgb = (r5 << 11) | (g6 << 5) | b5;
        rgb565[i] = rgb;
    }

    // Convert Uint16Array to array of hex byte strings
    const hexStrings = new Array(rgb565.length);
    for (let i = 0; i < rgb565.length; i++) {
        hexStrings[i] = '0x' + (rgb565[i] >> 8).toString(16).padStart(2, '0') + (rgb565[i] & 0xff).toString(16).padStart(2, '0');
    }

    return rgb565;
}

const dotMatrixShader = `
precision mediump float;

uniform sampler2D uSampler;
uniform vec2 uResolution;
uniform float uTime;
uniform float dotSize;
uniform float cellSize;

varying vec2 vTextureCoord;

void main() {
    vec2 uv = vTextureCoord;
    vec2 uvScaled = uv * uResolution;

    // Calculate the cell and dot coordinates
    vec2 cell = floor(uvScaled / cellSize);
    vec2 dot = mod(uvScaled, cellSize) / cellSize;
    
    // Check if the current pixel is within the dot area
    float isDot = step(dotSize, length(dot - 0.5));

    // Sample the image color
    vec4 color = texture2D(uSampler, uv);

    // Apply the dot matrix effect
    gl_FragColor = mix(color, vec4(0.0), isDot);
}
`;

// Create the PixiJS filter with the dot matrix shader
export const dotMatrixFilter = (width: number, height: number) =>
    new Filter(undefined, dotMatrixShader, {
        uResolution: [width, height],
        dotSize: 0.35, // Adjust this value to change the dot size (0.0 - 1.0)
        cellSize: 10 // Adjust this value to change the cell size (in pixels)
    });


await Assets.load('silkscreen.fnt');
await Assets.load('pixel7.fnt');

const textStyle: Partial<IBitmapTextStyle> = {
    fontName: 'silkscreen',
    fontSize: 8,
    tint: 'white',
    align: 'left',
    letterSpacing: -1
};

export const createText = (text: string, tint = 'yellow', font: 'silkscreen'|'pixel7' = 'silkscreen') => {
    text = text.replaceAll(':', ' :');

    return new BitmapText(text, {
        ...textStyle,
        tint,
        fontName: font,
        fontSize: font == 'silkscreen' ? 8 : 10,
        letterSpacing: font == 'silkscreen' ? -1 : 0
    });
};