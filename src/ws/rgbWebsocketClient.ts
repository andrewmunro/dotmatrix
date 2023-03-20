import { OPEN, WebSocket } from "ws";

let url = 'ws://192.168.0.114'
let ws: WebSocket;

const connect = () => {
	ws = new WebSocket(url);

	ws.onclose = (e) => {
		console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
		setTimeout(function () {
			connect();
		}, 1000);
	};

	ws.onerror = (err) => {
		console.error('Socket encountered error: ', err.message, 'Closing socket');
		ws.close();
	};

    return ws;
}

const updateURL = (newUrl: string) => {
    url = newUrl;
    if (ws.readyState == OPEN) ws.close();
}

export {connect, updateURL}