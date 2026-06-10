/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui'

export default {
	darkMode: 'class',
	important: true,
	// darkMode: ['selector', '[class="p-dark"]'],
	// content: [],
	content: [
		'./pages/**/*.vue',
		'./layouts/**/*.vue',
		'./components/**/*.{js,vue,ts}',
		'./doc/**/*.{js,vue,ts}',
		'./error.vue',
	],
	theme: {
		fontFamily: {
			sans: ['Inter', 'sans-serif'],
			lato: ['Lato', 'sans-serif'],
			relaway: ['Raleway', 'sans-serif'],
			crimson: ['Crimson Text', 'serif'],
			roboto: ['Roboto', 'sans-serif'],
			josefin: ['Josefin Sans', 'sans-serif'],
			montserrat: ['Montserrat', 'sans-serif'],
		},
		extend: {
			animation: {
				'spin-slow': ' spin 5s linear infinite',
				'bounce-slow': 'bounce 5s infinite',
			},
		},
		screens: {
			sm: '576px',
			md: '768px',
			lg: '992px',
			xl: '1200px',
			'2xl': '1920px',
		},
	},
	plugins: [PrimeUI],
}
