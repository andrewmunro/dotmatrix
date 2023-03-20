import express from 'express';
import { OPEN, WebSocketServer } from 'ws';
import { connect } from './ws/rgbWebsocketClient';
import { webSocketServer } from './ws/websocketServer';
import * as dotenv from 'dotenv';
import { Client as DiscordClient, Events, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

dotenv.config();

const app = express();
const rgb = connect();
const wss = webSocketServer(app);

wss.on('connection', (socket, req) => {
	socket.send('hello');

	socket.on('message', (data, isBinary) => {
		if (isBinary && rgb.readyState == OPEN) {
			rgb.send(data as ArrayBufferView);
		}
	});
});

app.get('/api/hello', (req, res) => {
	res.json({ hello: 'world' });
});

const client = new DiscordClient({ intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds] });
client.on('message', msg => {
	if (msg.content === 'ping') {
		msg.reply('Pong!');
	}
});

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.CLIENT_TOKEN);
export const handler = app;
