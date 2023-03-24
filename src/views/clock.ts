import { Container, Graphics } from 'pixi.js-legacy';
import { createText } from '../utils';

export const clock = async (parent: Container) => {
    const clock = new Container();
    parent.addChild(clock);
    clock.x = (128 - 30) / 2;
    clock.y = 22;

    const time = createText('', 'red', 'pixel7');
    
    const bg = new Graphics();
    bg.x = -2;
    bg.beginFill(0x000000);
    bg.drawRect(0, 0, 36, 10);


    clock.addChild(bg, time);

    return async (dt: number) => {
        const now = new Date();
        time.text = `${new Date().toTimeString().split(' ')[0]}`;
    };
};
