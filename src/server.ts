import express from 'express';
import { OPEN, WebSocketServer } from 'ws';
import { connect } from './ws/rgbWebsocketClient';
import { webSocketServer } from './ws/websocketServer';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
// import { Client as DiscordClient, Events, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

dotenv.config();

const app = express();
const rgb = connect();
const wss = webSocketServer(app);
const RTTAuth = Buffer.from(`${process.env.RTT_USER}:${process.env.RTT_PASS}`).toString('base64');

wss.on('connection', (socket, req) => {
	socket.on('message', (data, isBinary) => {
		if (isBinary && rgb.readyState == OPEN) {
			rgb.send(data as ArrayBufferView);
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
			time: `${hours} :${mins}`,
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
