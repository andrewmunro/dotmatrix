import { defineConfig } from 'vite';
import mix from 'vite-plugin-mix';

export default defineConfig({
	server: {
		hmr: !process.env.DISABLE_HMR,
	},
	plugins: [
		mix.default({
			handler: './src/server.ts'
		})
	]
});
