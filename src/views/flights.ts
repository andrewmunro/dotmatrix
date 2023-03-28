import gsap from 'gsap';
import { Container, Renderer, Text } from 'pixi.js-legacy';
import { createText } from '../utils';

const MaxStringLength = 11;

type Flight = {
	scheduled: {
		time: string;
		date: Date;
	};
	origin: string;
	message?: string;
    id: string;
};

const formatFlightRow = (flight: Flight) => {
	const row = new Container();

    if (flight.origin.length > MaxStringLength) {
        flight.origin = `${flight.origin.slice(0, MaxStringLength)} . . .`
    }

    const scheduled = createText(flight.scheduled.time, 'orange');
    const origin = createText(flight.origin, 'yellow');
    origin.x = 24;

    row.addChild(scheduled, origin);

    if (flight.message) {
        const message = createText(flight.message, flight.message.includes('lnd') ? 'green' : 'red')
        message.x = 89;
        row.addChild(message);
    }

	return row;
};

const fetchFlights = async () => {
	const res = await fetch('/api/flights/arrivals');
	const data = await res.json();

    const flights = new Container();
    flights.y = 2;

    for (const [i, flight] of data.slice(0, 3).entries()) {
        const flightRow = formatFlightRow(flight);
        flightRow.y = i * 6;
        flights.addChild(flightRow);
    }

    return flights;
}

export const flights = async (parent: Container) => {
	let flights = await fetchFlights();
    parent.addChild(flights);

    const icon = new Text('🚁', {
        fontSize: 7,
    });
    icon.x = 132;
    icon.y = 19;
    // icon.anchor.x = icon.anchor.y = 0.5;
    // icon.rotation = 5;
    // icon.scale.x = -1;
    flights.addChild(icon);

    const tween = gsap.to(icon, {
        x: -50, duration: 10, repeat: -1, yoyo: false, repeatDelay: 0, ease: 'linear'
    });

    return {
        update: (dt: number) => {},
        destroy: async (dt: number) => {
            tween.kill();
            parent.removeChild(flights);
        }
    };
};
