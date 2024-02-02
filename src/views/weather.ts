import { Container, Graphics, Text } from 'pixi.js-legacy';
import { createText } from '../utils';

export const weather = () => {
	const weather = new Container();
	weather.x = 0;
	weather.y = 22;

	const weatherIcon = new Text('☁️', { fontSize: 7 });
	weatherIcon.x = 2;
	weatherIcon.y = 1;
	const temp = createText('9C', 'cyan', 'pixel7');
	temp.x = 13;

	const bg = new Graphics();
	bg.x = -2;
	bg.beginFill(0x000000);
	bg.drawRect(0, 0, 30, 10);

	weather.addChild(bg, weatherIcon, temp);

	const updateWeather = async () => {
		const res = await fetch('/api/weather');
		const data = await res.json();
		weatherIcon.text = data.emoji;
		temp.text = `${data.temp}C`;
	};

	setInterval(updateWeather, 1000 * 60 * 5);
	updateWeather();

	return weather;
};
