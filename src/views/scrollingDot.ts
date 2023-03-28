import { Container, Graphics } from 'pixi.js-legacy';

export const scrollingDot = async (parent: Container) => {
    const graphics = new Graphics();
    graphics.beginFill('red');
    graphics.drawRect(0, 0, 1, 1);
    graphics.x = 127;

    parent.addChild(graphics);

    return {
        update: (dt: number) => {
            graphics.position.y += 0.4;
            if (graphics.position.y > 31) graphics.position.y = 0;
        },
        destroy: async (dt: number) => {}
    };
};
