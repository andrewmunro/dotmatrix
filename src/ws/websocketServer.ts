import { Server } from 'http';
import { parse } from 'url';
import { WebSocketServer } from "ws";

type App = {
	use: (callback: (req: Request, res: Response, next: () => void) => void) => void
}

export const webSocketServer = (app: App, path = '/ws') => {
	const wss = new WebSocketServer({ noServer: true, path });
	app.use((req, res, next) => {
		const server = req.connection.server as Server;
	
		if (!server[`hooked${path}`]) {
			server[`hooked${path}`] = true;
	
			server.on('upgrade', (request, socket, head) => {
				const { pathname } = parse(request.url || '');
				if (pathname === path) {
					wss.handleUpgrade(request, socket, head, function done(ws) {
						wss.emit('connection', ws, request);
					});
				}
			});
		}
		next();
	});

	return wss;
}