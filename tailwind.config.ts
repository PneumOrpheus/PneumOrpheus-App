import type { Config } from "tailwindcss";

const config = {
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				brand: "#4D97FF",
				second: "#4DCFFF",
				third: "#4D5FFF",
				fourth: "#4DFFF6",
				fifth: "#734DFF",
				sixth: "#8BBCFF",
			},
		},
	},
	plugins: [],
} satisfies Config;

export default config;
