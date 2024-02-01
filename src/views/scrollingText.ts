import { Container, Text, TextStyle } from '../PIXI';

const textStyle = new TextStyle({
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

export const scrollingText = async (parent: Container, content = '✈️🚌🚍🚎🚐🚏🚉🚅🚄🚂🛤️🚆', style = textStyle) => {
	const text = new Text(content, style);
	text.anchor.set(0.5, 0.5);
	text.x = +text.width / 2;
	text.y = 32 / 2 + 5;

	parent.addChild(text);

	return {
		update: (dt: number) => {
			text.position.x -= 1;
			if (text.position.x < -text.width / 2) text.position.x = 128 + text.width / 2;
		},
		destroy: async (dt: number) => {}
	};
};
