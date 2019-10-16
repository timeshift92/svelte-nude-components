import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
// import commonjs from 'rollup-plugin-commonjs';
import commonjs from 'rollup-plugin-commonjs-alternate';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import svelteHmr from "rollup-plugin-svelte-hmr";
import staticFiles from 'rollup-plugin-static-files'
// const production = !process.env.ROLLUP_WATCH;
const production = process.env.NODE_ENV === 'production'
const hot = !production
export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		dir: 'dist',
		entryFileNames: '[name].[hash].js',
		assetFileNames: '[name].[hash][extname]',
	
	},
	plugins: [
		svelte({
			// enable run-time checks when not in production
			dev: !production,
			// we'll extract any component CSS out into
			// a separate file — better for performance
			...(!hot && {
				css: css => css.write('dist/bundle.css'),
			  })
		}),
		production &&
		staticFiles({
		  include: ['./public'],
		}),
		svelteHmr({
			hot
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration —
		// consult the documentation for details:
		// https://github.com/rollup/rollup-plugin-commonjs
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),
		commonjs(),
		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		// !production && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
