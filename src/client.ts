// import '@pixi/gif';
import * as PIXI from './PIXI';
import { BaseTexture, Container, Program, Renderer, RenderTexture, Sprite } from './PIXI';
import { dotMatrixFilter, rgbaToRgb565 } from './utils';
import { clock } from './views/clock';
import { transportScreen } from './views/transportScreen';

await PIXI.Assets.init();

BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
Program.defaultFragmentPrecision = PIXI.PRECISION.HIGH;

const app = new PIXI.Application({
	width: 1280,
	height: 320,
	resolution: 1,
	forceCanvas: true
});
document.body.appendChild(app.view as any);

const renderer = app.renderer as Renderer;
const display = new Container();
const renderTexture = RenderTexture.create({ width: 128, height: 32 });
const renderSprite = new Sprite(renderTexture);
app.stage.addChild(renderSprite);
renderSprite.scale.set(10, 10);

app.stage.filters = [dotMatrixFilter(renderer.width, renderer.height)];
app.ticker.maxFPS = 30;

// Displays
display.addChild(transportScreen());
// app.ticker.add((await gifs(display)).update);
// app.ticker.add((await scrollingText(display)).update);
// app.ticker.add(await scrollingDot(display));
app.ticker.add((await clock(display)).update);

// Render
app.ticker.add(delta => {
	renderer.render(display, { renderTexture });
	renderer.render(app.stage);
});

let hasDisconnected = false;

const connect = () => {
	const ws = new WebSocket(`ws://${location.host}/pub`);
	ws.onopen = evt => {
		console.log('connected!', evt);

		if (hasDisconnected) {
			// Force refresh to get new client
			window.location.reload();
		} else {
			setInterval(() => {
				const pixels = renderer.extract.pixels(renderTexture);
				const rgb565 = rgbaToRgb565(pixels);
				ws.send(rgb565);
			}, (1000 * 1) / app.ticker.maxFPS);
		}
	};

	ws.onmessage = evt => {
		console.log('message!', evt);
	};

	ws.onclose = () => {
		console.log('websocket closed! refreshing!');

		hasDisconnected = true;

		setTimeout(() => {
			connect();
		}, 1000);
	};
};

// Draw to RGB
setTimeout(() => {
	connect();
}, 1000);
