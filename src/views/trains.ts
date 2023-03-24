import { Assets, Container, TextStyle, Text, SCALE_MODES, BitmapText, Loader, IBitmapTextStyle, BitmapFont, Sprite, BaseTexture, Renderer, Texture } from "pixi.js-legacy";

const font = await Assets.load('silkscreen.fnt');

const textStyle: Partial<IBitmapTextStyle> = {
    fontName: 'silkscreen',
    fontSize: 8,
    tint: 'white',
    align: 'left',
    letterSpacing: -1,
};

export const trains = async (parent: Container, renderer: Renderer) => {
    const text = new BitmapText('1ST 12 :45 34 LEEDS 8 MINUTES', textStyle);

    parent.addChild(text);

    return async (dt: number) => { 
        // text.updateText();
    }
}