import { Container } from '../PIXI';
import { buses } from './buses';
import { flights } from './flights';
import { trains } from './trains';

const interval = 1000 * 10;

const getScreen = async function* (parent: Container) {
	while (true) {
		yield await buses(parent, 'kirkstall_lane');
		yield await buses(parent, 'kirkstall_lights');
		yield await trains(parent);
		yield await flights(parent);
	}
};

export const transportScreen = () => {
	const display = new Container();

	const it = getScreen(display);
	let current: any = null;

	const nextScreen = async () => {
		const next = await it.next();

		if (current) {
			current.destroy();
		}

		current = next.value;
	};

	nextScreen();
	setInterval(() => nextScreen(), interval);

	return display;
};
