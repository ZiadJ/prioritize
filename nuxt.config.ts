import Aura from "@primevue/themes/aura";
import { definePreset } from "@primevue/themes";

const MyPreset = definePreset(Aura, {
	semantic: {
		primary: {
			50: '{zinc.50}',
			100: '{zinc.100}',
			200: '{zinc.200}',
			300: '{zinc.300}',
			400: '{zinc.400}',
			500: '{zinc.500}',
			600: '{zinc.600}',
			700: '{zinc.700}',
			800: '{zinc.800}',
			900: '{zinc.900}',
			950: '{zinc.950}'
		},
		colorScheme: {
			light: {
				primary: {
					color: '{zinc.950}',
					contrastColor: '#ffffff',
					hoverColor: '{zinc.900}',
					activeColor: '{zinc.800}'
				}
			},
			dark: {
				primary: {
					color: '{zinc.50}',
					contrastColor: '{zinc.950}',
					hoverColor: '{zinc.100}',
					activeColor: '{zinc.200}'
				}
			}
		}
	}
});

export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',
	devtools: { enabled: true },
	devServer: {
		port: 3000,
	},
	serverDir: 'server',
	build: {
		transpile: ['jsonwebtoken'],
	},
	modules: [
		'@nuxtjs/google-fonts',
		'@sidebase/nuxt-auth',
		'@nuxtjs/tailwindcss',
		'@nuxtjs/color-mode',
		'@nuxt/icon', 
		'@primevue/nuxt-module',
	],
	css: [
		'primeicons/primeicons.css',
		'~/assets/tailwind.css',
		'~/assets/styles.css',
	],
	future: {
		compatibilityVersion: 4,
	},
	experimental: {
		scanPageMeta: 'after-resolve',
		sharedPrerenderData: false,
		compileTemplate: true,
		resetAsyncDataToUndefined: true,
		templateUtils: true,
		relativeWatchPaths: true,
		normalizeComponentNames: false,
		spaLoadingTemplateLocation: 'within',
		defaults: {
			useAsyncData: {
				deep: true,
			},
		},
	},
	features: {
		inlineStyles: true,
	},
	unhead: {
		renderSSRHeadOptions: {
			omitLineBreaks: false,
		},
	},
	primevue: {
		options: {
			theme: {
				preset: MyPreset,
				options: {
					darkModeSelector: '.dark',
				},
			},
		},
	},
	colorMode: {
		preference: 'system',
		globalName: '__NUXT_COLOR_MODE__',
		fallback: 'light',
		classSuffix: '',
		storageKey: 'nuxt-color-mode',
		storage: 'localStorage',
	},
	googleFonts: {
		families: {
			Montserrat: true,
			Roboto: true,
			Inter: [200, 400, 700],
			'Josefin+Sans': true,
			Lato: [100, 300],
			Raleway: {
				wght: [100, 400],
				ital: [100],
			},
			// Inter: "200..700",
			'Crimson Pro': {
				wght: '200..900',
				ital: '200..700',
			},
		},
	},

	auth: {
		provider: {
			type: 'local',
			endpoints: {
				getSession: { path: '/user' },
				signIn: { path: '/signin', method: 'post' },
				signOut: { path: '/signout', method: 'post' },
				signUp: { path: '/signup', method: 'post' },
			},
			pages: {
				login: '/login',
			},
			token: {
				type: 'Bearer',
				cookieName: 'auth.token',
				headerName: 'Authorization',
				//15 minutes
				maxAgeInSeconds: 60 * 10,
				sameSiteAttribute: 'lax',
				cookieDomain: '', //add env variable
				secureCookieAttribute: false,
				httpOnlyCookieAttribute: false,
				signInResponseTokenPointer: '/accessToken',
			},
			refresh: {
				isEnabled: process.env.NUXT_AUTH_REFRESH_ENABLED === 'true',
				endpoint: { path: '/refresh', method: 'post' },
				refreshOnlyToken: true,
				token: {
					signInResponseRefreshTokenPointer: '/refreshToken',
					refreshRequestTokenPointer: '/refreshToken',
					cookieName: 'auth.refresh-token',
					maxAgeInSeconds: 60 * 60 * 24, // 24 hours
					sameSiteAttribute: 'lax',
					secureCookieAttribute: false,
					cookieDomain: '',
				},
			},
		},
		sessionRefresh: {
			enableOnWindowFocus: false,
			// cada 8 minutos
			enablePeriodically: 480000,
		},
		globalAppMiddleware: {
			isEnabled: true,
		},
	},
	app: {
		pageTransition: { name: 'page', mode: 'out-in' },
		head: {
			title: 'JetNuxt Prime',
			meta: [
				{ charset: 'utf-8' },
				{
					name: 'viewport',
					content: 'width=device-width, initial-scale=1',
				},
				{
					hid: 'description',
					name: 'description',
					content: 'JetNuxt Prime - A Nuxt.js starter template with PrimeVue',
				},
			],
			link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
		},
	},
});
