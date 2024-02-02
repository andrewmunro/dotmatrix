import { ServerWebSocket, WebSocketServeOptions } from 'bun';
import bunExpress from 'bun-serve-express';
import express from 'express';

// import { webSocketServer } from './ws/websocketServer';
process.env.TZ = 'Europe/London';

type WebSocketData = {
	url: URL;
	id: string;
	ready: boolean;
};

const randomId = () => {
	return Math.random().toString(36).substring(2, 7);
};

let latestFrame: Buffer | null = null;

const app = bunExpress({
	websocket: {
		open(ws) {
			ws.data.id = randomId();
			ws.data.ready = false;

			setTimeout(
				() => {
					ws.data.ready = true;
				},
				process.env.SEND_DELAY ? parseInt(process.env.SEND_DELAY) : 3000
			);

			if (ws.data.url.pathname == '/pub') {
				pubSockets.push(ws);
				console.log('new publisher', ws.data.id);
			}

			if (ws.data.url.pathname == '/sub') {
				subSockets.push(ws);

				console.log('new subscriber', ws.data.id);
			}
		},
		message(ws, message) {
			if (ws.data.url.pathname == '/pub') {
				// Ensure is binary data
				if (typeof message == 'string') return;

				// TODO figure out better solution
				// Ensure only first connected WS data is forwarded to RGB screen
				if (ws.data.id != pubSockets[0].data.id) return;

				latestFrame = message;
			}

			if (ws.data.url.pathname == '/sub') {
				console.log('message from sub', message);
			}
		},
		close(ws, code, message) {
			if (ws.data.url.pathname == '/pub') {
				pubSockets.splice(pubSockets.indexOf(ws), 1);
				console.log('publisher disconnected');
			}

			if (ws.data.url.pathname == '/sub') {
				subSockets.splice(subSockets.indexOf(ws), 1);
				console.log('subscriber disconnected');
			}
		},
		drain(ws) {}
	}
} as WebSocketServeOptions<WebSocketData> as any);

const sendInterval = process.env.SEND_INTERVAL ? parseInt(process.env.SEND_INTERVAL) : 100;

// Throttle updates to RGB screen
setInterval(() => {
	// Echo data back to sub sockets
	if (latestFrame == null) return;
	for (const sub of subSockets) {
		if (sub.data.ready) sub.send(latestFrame);
	}
}, sendInterval);

const RTTAuth = Buffer.from(`${process.env.RTT_USER}:${process.env.RTT_PASS}`).toString('base64');
const FirstBusAuth = process.env.FIRST_BUS_API_KEY;

const pubSockets: ServerWebSocket<WebSocketData>[] = [];
const subSockets: ServerWebSocket<WebSocketData>[] = [];

app.use(express.static('dist'));

app.get('/api/train/:station', async (req, res) => {
	const response = await fetch(`https://api.rtt.io/api/v1/json/search/${req.params.station}`, {
		headers: {
			Authorization: `Basic ${RTTAuth}`
		}
	});

	let data = (await response.json()) as any;

	const formatDate = (dateString: string) => {
		if (!dateString) return null;

		const split = dateString.split('');
		const hours = split[0] + split[1];
		const mins = split[2] + split[3];

		const d = new Date();
		d.setHours(parseInt(hours));
		d.setMinutes(parseInt(mins));
		d.setSeconds(0);

		return {
			time: `${hours}:${mins}`,
			date: d
		};
	};

	if (!data?.services) {
		res.json([]);
		return;
	}

	// https://www.realtimetrains.co.uk/about/developer/pull/docs/locationlist/
	let formatted = data.services.map((train: any) => ({
		scheduled: formatDate(train.locationDetail.gbttBookedArrival),
		arrives: formatDate(train.locationDetail.realtimeArrival) ?? formatDate(train.locationDetail.gbttBookedArrival),
		origin: train.locationDetail.origin[0].description,
		destination: train.locationDetail.destination[0].description,
		platform: train.locationDetail.platform ?? train.locationDetail.destination[0].description == 'Leeds' ? '1' : '2',
		displayAs: train.locationDetail.displayAs // CALL, PASS, ORIGIN, DESTINATION, STARTS, TERMINATES, CANCELLED_CALL, CANCELLED_PASS
	}));

	res.json(formatted.filter(t => t.displayAs == 'CALL'));
});

const getBusStopIds = (stopName: string) => {
	if (stopName == 'kirkstall_lights') return ['450010925'];
	if (stopName == 'kirkstall_lane') return ['450011444', '450011458'];

	throw new Error('stop not found: ' + stopName);
};

const getBusesByStopId = async (stop: string) => {
	const response = await fetch(`https://prod.mobileapi.firstbus.co.uk/api/v2/bus/stop/${stop}/departure`, {
		headers: {
			'x-app-key': `${FirstBusAuth}`
		}
	});

	let data = (await response.json()) as any;

	return data.data.attributes['live-departures'].concat(data.data.attributes['timetable-departures']).map(departure => ({
		line: departure.line,
		scheduled: {
			time: new Date(departure['scheduled-time'] || departure['departure-time']).toLocaleTimeString('en-GB', {
				hour: '2-digit',
				minute: '2-digit'
			}),
			date: new Date(departure['scheduled-time'] || departure['departure-time'])
		},
		expectedArrivalMins: departure['is-live'] ? Math.floor(departure['expected-time-in-seconds'] / 60) : null,
		occupancy: departure['occupancy'] ? departure['occupancy']['types'][0] : null
	}));
};

app.get('/api/bus/:stop', async (req, res) => {
	const stops = getBusStopIds(req.params.stop);

	const busses = (await Promise.all(stops?.map(sid => getBusesByStopId(sid)))).flat();

	const getArrivalOrScheduledTime = bus => {
		if (bus.expectedArrivalMins != null) {
			return new Date(Date.now() + 1000 * 60 * bus.expectedArrivalMins);
		}

		return bus.scheduled.date;
	};

	res.json(busses.sort((a, b) => getArrivalOrScheduledTime(a) - getArrivalOrScheduledTime(b)));
});

app.get('/api/flights/arrivals', async (req, res) => {
	const response = await fetch(`https://lba-flights.production.parallax.dev/arrivals`);

	const data = (await response.json()) as any;

	const flights = data
		.map((fl: any) => ({
			id: fl.flight_ident,
			scheduled: {
				time: new Date(fl.scheduled_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
				date: new Date(fl.scheduled_time)
			},
			origin: fl.airport_name,
			message: fl.message ? fl.message.replace('Expected', 'exp').replace('Landed', 'lnd').replace('Now ', '') : null,
			status: fl.status
		}))
		.filter((fl: any) => {
			if (fl.status != 'LND') return true;

			const timeString = fl.message.split(' ')[1];
			const date = new Date();
			date.setHours(timeString.split(':')[0]);
			date.setMinutes(timeString.split(':')[1]);

			return new Date().getTime() - date.getTime() <= 1000 * 60 * 5;
		});

	res.json(flights);
});

function mapWeatherToEmoji(wmoCode: number): string {
	switch (wmoCode) {
		case 0: // Clear sky
			return '☀️';
		case 1: // Partly cloudy
		case 2:
			return '⛅';
		case 3: // Cloudy
			return '☁️';
		case 10: // Mist
		case 20: // Fog
			return '🌫️';
		case 30: // Drizzle
		case 40: // Rain
			return '🌧️';
		case 60: // Thunderstorm
			return '⛈️';
		case 80: // Snow
			return '❄️';
		default:
			return '❓'; // Unknown or unsupported weather condition
	}
}

app.get('/api/weather', async (req, res) => {
	const lat = '53.8193';
	const long = '-1.5990';
	const response = await fetch(
		`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,weather_code`
	);

	const data = await response.json();

	const temp = Math.round(data.current.temperature_2m);
	const weatherCode = data.current.weather_code;
	const emoji = mapWeatherToEmoji(weatherCode);

	res.json({ temp, emoji });
});

app.listen(3000, () => {
	console.log('server started on', 3000);
});
