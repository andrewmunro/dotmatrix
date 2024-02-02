import { rgb565ToRGBA } from './utils';

const canvas = document.createElement('canvas');
canvas.width = 1280;
canvas.height = 320;
canvas.style = 'zoom: 10';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

let hasDisconnected = false;

const connect = () => {
	const ws = new WebSocket(`ws://rgb.mun.sh/sub`);
	ws.onopen = evt => {
		console.log('connected!', evt);

		if (hasDisconnected) {
			// Force refresh to get new client
			window.location.reload();
		}
	};

	ws.onmessage = async evt => {
		const data = (await evt.data.arrayBuffer()) as ArrayBuffer;
		const rgba = rgb565ToRGBA(new Uint16Array(data));
		const imageData = new ImageData(new Uint8ClampedArray(rgba), 128, 32);

		ctx.putImageData(imageData, 0, 0);
	};

	ws.onerror = ws.onclose = () => {
		console.log('websocket closed! refreshing!');

		hasDisconnected = true;

		setTimeout(() => {
			connect();
		}, 1000);
	};
};

// Draw to RGB
setTimeout(() => {
	connect();
}, 1000);
