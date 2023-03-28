import '@pixi/gif';
import * as PIXI from 'pixi.js-legacy';
import { BaseTexture, Container, Program, Renderer, RenderTexture, Sprite } from 'pixi.js-legacy';
import { dotMatrixFilter, rgbaToRgb565 } from './utils';
import { clock } from './views/clock';
import { transportScreen } from './views/transportScreen';

BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
Program.defaultFragmentPrecision = PIXI.PRECISION.HIGH;

const app = new PIXI.Application({
    width: 1280,
    height: 320,
    resolution: 1,
    forceCanvas: true,
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

// Draw to RGB
setTimeout(() => {
    // const ws = new WebSocket(`ws://192.168.0.114`);
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = evt => {
        console.log('connected!', evt);

        setInterval(() => {
            const pixels = renderer.extract.pixels(renderTexture);
            const rgb565 = rgbaToRgb565(pixels);
            ws.send(rgb565);
        }, 1000 * 1 / 15);
    };

    ws.onmessage = evt => {
        console.log('message!', evt);
    };
}, 1000);

