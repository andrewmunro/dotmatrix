import * as PIXI from 'pixi.js-legacy';
import '@pixi/gif';
import { Assets, BaseTexture, Buffer, Container, DisplayObject, Program, Renderer, RenderTexture, Sprite } from 'pixi.js-legacy';
import { dotMatrixFilter, rgbaToRgb565 } from './utils';
import { scrollingDot } from './views/scrollingDot';
import { scrollingText } from './views/scrollingText';
import { gifs } from './views/gifs';
import { trains } from './views/trains';
import { clock } from './views/clock';

BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
Program.defaultFragmentPrecision = PIXI.PRECISION.HIGH;

const app = new PIXI.Application({
    width: 1280,
    height: 320,
    resolution: 1,
    forceCanvas: true,
    // background: 'blue'
});
document.body.appendChild(app.view as any);

const renderer = app.renderer as Renderer;
const display = new Container();
const renderTexture = RenderTexture.create({ width: 128, height: 32 });
const renderSprite = new Sprite(renderTexture);
app.stage.addChild(renderSprite);
renderSprite.scale.set(10, 10);

app.stage.filters = [dotMatrixFilter(renderer.width, renderer.height)];

// app.ticker.add(await gifs(display));
// app.ticker.add(await scrollingText(display));
app.ticker.add(await trains(display));
app.ticker.add(await clock(display));
app.ticker.maxFPS = 30;
// app.ticker.add(await scrollingDot(display));

app.ticker.add(delta => {
    renderer.render(display, { renderTexture });
    renderer.render(app.stage);
});

setTimeout(() => {
    // const ws = new WebSocket(`ws://192.168.0.114`);
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = evt => {
        console.log('connected!', evt);

        setInterval(() => {
            const pixels = renderer.extract.pixels(renderTexture);
            const rgb565 = rgbaToRgb565(pixels);
            ws.send(rgb565);
        }, 60);
    };

    ws.onmessage = evt => {
        console.log('message!', evt);
    };
}, 1000);

