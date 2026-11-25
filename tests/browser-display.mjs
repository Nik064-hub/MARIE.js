import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const runtimeRequire = createRequire(
	process.env.PLAYWRIGHT_PACKAGE_JSON ??
		'C:/Users/sfrei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json',
);
const { chromium } = runtimeRequire('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
	const page = await browser.newPage({
		viewport: { width: 1440, height: 1000 },
	});
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const project = {
		code: 'Load White\nStore 0F00\nHalt\nWhite, HEX 7FFF',
		inputs: [{ format: 'dec', consumed: '', queued: '' }],
		breakpoints: {},
		pointers: {},
		outputMode: 'dec',
	};
	await page.goto(
		'http://127.0.0.1:5173/#project=' +
			encodeURIComponent(JSON.stringify(project)),
	);
	const toggle = page.getByRole('button', { name: 'Display', exact: true });
	assert.equal(await toggle.count(), 1, 'top toolbar must offer Display');
	await toggle.click();
	const window = page.getByRole('dialog', { name: 'Display', exact: true });
	await window.waitFor();
	assert.equal(await window.locator('.pixel').count(), 256);
	const initial = await window.boundingBox();
	const header = await page
		.getByRole('button', { name: 'Mover Display', exact: true })
		.boundingBox();
	await page.mouse.move(header.x + 45, header.y + 16);
	await page.mouse.down();
	await page.mouse.move(header.x - 135, header.y + 96, { steps: 8 });
	await page.mouse.up();
	const moved = await window.boundingBox();
	assert.ok(Math.abs(moved.x - (initial.x - 180)) < 2);
	assert.ok(Math.abs(moved.y - (initial.y + 80)) < 2);
	const corner = page.getByRole('button', {
		name: 'Redimensionar Display se',
		exact: true,
	});
	let handle = await corner.boundingBox();
	await page.mouse.move(
		handle.x + handle.width / 2,
		handle.y + handle.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(handle.x + 105, handle.y + 85, { steps: 8 });
	await page.mouse.up();
	const enlarged = await window.boundingBox();
	assert.ok(enlarged.width > moved.width + 80);
	assert.ok(enlarged.height > moved.height + 60);
	handle = await corner.boundingBox();
	await page.mouse.move(handle.x + 4, handle.y + 4);
	await page.mouse.down();
	await page.mouse.move(handle.x - 76, handle.y - 56, { steps: 8 });
	await page.mouse.up();
	const reduced = await window.boundingBox();
	assert.ok(reduced.width < enlarged.width - 60);
	assert.ok(reduced.height < enlarged.height - 40);
	const pixel = await window.locator('.pixel').first().boundingBox();
	assert.ok(
		Math.abs(pixel.width - pixel.height) < 1,
		'pixels must remain square',
	);
	await toggle.click();
	assert.equal(await window.count(), 0);
	await toggle.click();
	assert.deepEqual(
		await window.boundingBox(),
		reduced,
		'toggle must preserve position and size',
	);
	await page.getByText('Inputs', { exact: true }).click();
	await page
		.locator('textarea')
		.fill(Array.from({ length: 100 }, (_, i) => String(i)).join('\n'));
	assert.deepEqual(
		await window.boundingBox(),
		reduced,
		'growing Inputs must not move or shrink the display',
	);
	await page.getByRole('button', { name: 'Assemble', exact: true }).click();
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page.getByRole('button', { name: 'Halted', exact: true }).waitFor();
	assert.equal(
		await window
			.locator('.pixel')
			.first()
			.evaluate((el) => getComputedStyle(el).backgroundColor),
		'rgb(255, 255, 255)',
		'display must continue reflecting CPU memory',
	);
	await page.screenshot({ path: 'tests/display-window.png', fullPage: true });
	await page.setViewportSize({ width: 360, height: 640 });
	const fitted = await window.boundingBox();
	assert.ok(fitted.x >= 0 && fitted.x + fitted.width <= 361);
	assert.ok(fitted.y >= 0 && fitted.y + fitted.height <= 641);
	await page
		.getByRole('button', { name: 'Cerrar Display', exact: true })
		.click();
	assert.equal(await window.count(), 0);
	assert.deepEqual(errors, []);
	console.log('Floating display: PASS');
} finally {
	await browser.close();
}
