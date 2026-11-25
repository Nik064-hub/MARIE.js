// Shared by the browser tests (`npm run test:browser`; start `npm run dev` first).
// Playwright is intentionally not a project dependency.
//
// Playwright is looked up in this order:
//   1. PLAYWRIGHT_PACKAGE_JSON: path to a package.json next to a node_modules
//      that contains `playwright` (any folder you choose).
//   2. A `playwright` package installed in this project (e.g. `npm i -D playwright`).
// Browser: MARIE_BROWSER_CHANNEL (default "msedge"; use "chrome" or "chromium").
import { createRequire } from 'node:module';

function loadPlaywright() {
	const from = process.env.PLAYWRIGHT_PACKAGE_JSON ?? import.meta.url;
	try {
		return createRequire(from)('playwright');
	} catch {
		console.error(
			'Playwright was not found. Install it (npm i -D playwright) or set ' +
				'PLAYWRIGHT_PACKAGE_JSON to a package.json beside a node_modules that has it.',
		);
		process.exit(1);
	}
}

export function launchBrowser() {
	return loadPlaywright().chromium.launch({
		channel: process.env.MARIE_BROWSER_CHANNEL ?? 'msedge',
		headless: true,
	});
}
