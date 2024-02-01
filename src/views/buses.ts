import gsap from 'gsap';
import { Container, Text } from '../PIXI';
import { createText } from '../utils';

type BusStop = 'kirkstall_lights' | 'kirkstall_lane';

type Bus = {
	line: string;
	scheduled: {
		time: string;
		date: Date;
	};
	expectedArrivalMins?: number;
	occupancy?: {
		occupied: number;
		capacity: number;
	};
};

const formatBusRow = (bus: Bus) => {
	const row = new Container();

	const scheduled = createText(bus.scheduled.time, 'orange');
	const line = createText(bus.line, 'yellow');
	line.x = scheduled.x + 25;

	if (bus.occupancy) {
		const seatsIcon = new Text('💺', { fontSize: 4 });
		seatsIcon.x = line.x + 22;
		seatsIcon.y = 2;
		const seats = createText(`${bus.occupancy.capacity - bus.occupancy.occupied} free`, 'orange');
		seats.x = seatsIcon.x + 6;

		row.addChild(seatsIcon, seats);
	}

	const arriving =
		bus.expectedArrivalMins != null
			? createText(bus.expectedArrivalMins > 0 ? bus.expectedArrivalMins + ' MINS' : 'DUE', 'green')
			: createText(bus.scheduled.time, 'orange');
	arriving.x = 95;

	row.addChild(scheduled, line, arriving);

	return row;
};

const fetchBuses = async (stop: BusStop) => {
	const res = await fetch(`/api/bus/${stop}`);
	const data = await res.json();

	const trains = new Container();
	trains.y = 2;

	for (const [i, train] of data.slice(0, 3).entries()) {
		const trainRow = formatBusRow(train);
		trainRow.y = i * 6;
		trains.addChild(trainRow);
	}

	return trains;
};

export const buses = async (parent: Container, stop: BusStop = 'kirkstall_lights') => {
	let buses = await fetchBuses(stop);
	parent.addChild(buses);

	const icon = new Text('🚌 🚎', {
		fontSize: 7
	});
	icon.x = 132;
	icon.y = 20;
	buses.addChild(icon);

	const tween = gsap.to(icon, {
		x: -50,
		duration: 10,
		repeat: -1,
		yoyo: false,
		repeatDelay: 0,
		ease: 'linear'
	});

	return {
		update: (dt: number) => {},
		destroy: async (dt: number) => {
			tween.kill();
			parent.removeChild(buses);
		}
	};
};
