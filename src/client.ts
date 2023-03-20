import * as PIXI from 'pixi.js-legacy';
import '@pixi/gif';
import { Assets, BaseTexture, Buffer, Container, DisplayObject, Renderer, RenderTexture, Sprite } from 'pixi.js-legacy';

BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

const app = new PIXI.Application({
	width: 1280,
	height: 320,
	resolution: 1,
	antialias: false,
	forceCanvas: true
});

document.body.appendChild(app.view as any);
// app.view.style = 'zoom: 10';

const renderer = app.renderer as Renderer;

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
const dotMatrixFilter = new PIXI.Filter(undefined, dotMatrixShader, {
	uResolution: [app.renderer.width, app.renderer.height],
	dotSize: 0.35, // Adjust this value to change the dot size (0.0 - 1.0)
	cellSize: 10 // Adjust this value to change the cell size (in pixels)
});

// Apply the filter to a PixiJS sprite
app.stage.filters = [dotMatrixFilter];

const textStyle = new PIXI.TextStyle({
	fontFamily: 'Arial',
	fontSize: 16,
	lineHeight: 16,
	fontStyle: 'italic',
	fontWeight: 'bold',
	fill: ['#ffffff', '#00ff99'], // gradient
	stroke: '#4a1850',
	strokeThickness: 5,
	dropShadow: true,
	dropShadowColor: '#000000',
	dropShadowBlur: 4,
	dropShadowAngle: Math.PI / 6,
	dropShadowDistance: 6,
	wordWrap: true,
	wordWrapWidth: 440,
	lineJoin: 'round'
});

const image = await Assets.load('jake.gif');
image.width = 64;
image.height = 32;

const image2 = await Assets.load(
	'https://media4.giphy.com/media/wosNsGaxczbIA/giphy.gif?cid=ecf05e47c0ykhynrsz1kbos9yq6ipn71t3nbmq7s1cdjnv7a&rid=giphy.gif&ct=g'
);
image2.width = 64;
image2.height = 32;
image2.position.x = 64;

var graphics = new PIXI.Graphics();
graphics.beginFill('red');
graphics.drawRect(0, 0, 1, 1);
graphics.x = 127;

const text = new PIXI.Text('🍆🎆🍑🚦💥🧨🥇⛷️', textStyle);
text.anchor.set(0.5, 0.5);
text.x = 128 / 2;
text.y = 32 / 2 + 5;

const display = new Container();
display.addChild(text);
display.addChild(image);
display.addChild(image2);
display.addChild(graphics);
text.position.x = 128 + text.width / 2;

const renderTexture = RenderTexture.create({ width: 128, height: 32 });
const renderSprite = new Sprite(renderTexture);

app.stage.addChild(renderSprite);
renderSprite.scale.set(10, 10);

app.ticker.add(delta => {
	graphics.position.y += 0.4;
	if (graphics.position.y > 31) graphics.position.y = 0;
	text.position.x -= 5;
	if (text.position.x < -text.width / 2) text.position.x = 128 + text.width / 2;

	renderer.render(display, { renderTexture });
	renderer.render(app.stage);
});

setTimeout(() => {
	const pixels = renderer.extract.pixels(renderTexture);
	const rgb565 = rgbaToRgb565(pixels);

	const ws = new WebSocket(`ws://${location.host}/ws`);
	ws.onopen = evt => {
		console.log('connected!', evt);

		setInterval(() => {
			const pixels = renderer.extract.pixels(renderTexture);
			const rgb565 = rgbaToRgb565(pixels);
			ws.send(rgb565);
		}, 33);
	};

	ws.onmessage = evt => {
		console.log('message!', evt);
	};
}, 1000);

function rgbaToRgb565(rgba: Uint8Array) {
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
