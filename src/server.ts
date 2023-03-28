import express from 'express';
import { OPEN, WebSocketServer } from 'ws';
import { connect } from './ws/rgbWebsocketClient';
import { webSocketServer } from './ws/websocketServer';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
// import { Client as DiscordClient, Events, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

dotenv.config();
process.env.TZ = 'Europe/London';

const app = express();
const rgb = connect();
const wss = webSocketServer(app);
const RTTAuth = Buffer.from(`${process.env.RTT_USER}:${process.env.RTT_PASS}`).toString('base64');
const FirstBusAuth = process.env.FIRST_BUS_API_KEY;

wss.on('connection', (socket, req) => {
	socket.on('message', (data, isBinary) => {
		if (isBinary && rgb.getWs().readyState == OPEN) {
			rgb.getWs().send(data as ArrayBufferView);
		}
	});
});

app.get('/api/train/:station', async (req, res) => {
	const response = await fetch(`https://api.rtt.io/api/v1/json/search/${req.params.station}`, {
		headers: {
			'Authorization': `Basic ${RTTAuth}`,
		}
	});

	let data = await response.json() as any;

	// console.log(data);

	const formatDate = (dateString:string) => {
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
	}
	
	// https://www.realtimetrains.co.uk/about/developer/pull/docs/locationlist/
	let formatted = data.services.map((train:any) => ({
		scheduled: formatDate(train.locationDetail.gbttBookedArrival),
		arrives: formatDate(train.locationDetail.realtimeArrival),
		origin: train.locationDetail.origin[0].description,
		destination: train.locationDetail.destination[0].description,
		platform: train.locationDetail.platform ?? train.locationDetail.destination[0].description == 'Leeds' ? "1" : "2",
		displayAs: train.locationDetail.displayAs // CALL, PASS, ORIGIN, DESTINATION, STARTS, TERMINATES, CANCELLED_CALL, CANCELLED_PASS
	}));

	res.json(formatted.filter(t => t.displayAs == 'CALL'));
});

const getBusStopIds = (stopName: string) => {
	if (stopName == 'kirkstall_lights') return ['450010925'];
	if (stopName == 'kirkstall_lane') return ['450011444', '450011458'];

	throw new Error('stop not found: ' + stopName);
}

const getBusesByStopId = async (stop: string) => {
	const response = await fetch(`https://prod.mobileapi.firstbus.co.uk/api/v2/bus/stop/${stop}/departure`, {
		headers: {
			'x-app-key': `${FirstBusAuth}`,
		}
	});

	let data = await response.json() as any;

	return data.data.attributes['live-departures'].concat(data.data.attributes['timetable-departures']).map(departure => ({
		line: departure.line,
		scheduled: {
			time: new Date(departure['scheduled-time'] || departure['departure-time']).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
			date: new Date(departure['scheduled-time'] || departure['departure-time']),
		},
		expectedArrivalMins: departure['is-live'] ? Math.floor(departure['expected-time-in-seconds'] / 60) : null,
		occupancy: departure['occupancy'] ? departure['occupancy']['types'][0] : null
	}));
}

app.get('/api/bus/:stop', async (req, res) => {
	const stops = getBusStopIds(req.params.stop);

	const busses = (await Promise.all(stops?.map(sid => getBusesByStopId(sid)))).flat();

	const getArrivalOrScheduledTime = (bus) => {
		if (bus.expectedArrivalMins != null) {
			return new Date(Date.now() + 1000 * 60 * bus.expectedArrivalMins)
		}

		return bus.scheduled.date;
	}
	
	res.json(busses.sort((a, b) => getArrivalOrScheduledTime(a) - getArrivalOrScheduledTime(b)));
});

app.get('/api/flights/arrivals', async (req, res) => {
	const response = await fetch(`https://lba-flights.production.parallax.dev/arrivals`);

	const data = await response.json() as any;

	const flights = data.map(fl => ({
		id: fl.flight_ident,
		scheduled: {
			time: new Date(fl.scheduled_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
			date: new Date(fl.scheduled_time),
		},
		origin: fl.airport_name,
		message: fl.message ? fl.message.replace('Expected', 'exp').replace('Landed', 'lnd').replace('Now ', '') : null,
		status: fl.status,
	})).filter(fl => {
		if (fl.status != 'LND') return true;

		const timeString = fl.message.split(" ")[1];
		const date = new Date();
		date.setHours(timeString.split(":")[0]);
		date.setMinutes(timeString.split(":")[1]);

		return new Date().getTime() - date.getTime() <= 1000 * 60 * 5;
	});

	res.json(flights);
});

// const client = new DiscordClient({ intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds] });
// client.on('message', msg => {
// 	if (msg.content === 'ping') {
// 		msg.reply('Pong!');
// 	}
// });

// client.once(Events.ClientReady, c => {
// 	console.log(`Ready! Logged in as ${c.user.tag}`);
// });

// client.login(process.env.DISCORD_CLIENT_TOKEN);
export const handler = app;
