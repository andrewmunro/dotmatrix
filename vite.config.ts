import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		target: 'esnext',
		minify: false
	},
	server: {
		proxy: {
			'/pub': {
				target: 'ws://localhost:3000',
				ws: true
			},
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false
			}
		}
	}
});
