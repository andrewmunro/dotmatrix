import { Server } from 'http';
import { parse } from 'url';
import { WebSocketServer } from "ws";

type App = {
	use: (callback: (req: Request, res: Response, next: () => void) => void) => void
}

export const webSocketServer = (app: App, path = '/ws') => {
	const wss = new WebSocketServer({ noServer: true, path: '/ws' });
	app.use((req, res, next) => {
		const server = req.connection.server as Server;
	
		if (!server.hooked) {
			server.hooked = true;
	
			server.on('upgrade', (request, socket, head) => {
				const { pathname } = parse(request.url || '');
				if (pathname === '/ws') {
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