import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

// Use the already installed runtime's Playwright; no dependency added to MARIE.
const runtimeRequire = createRequire(
	process.env.PLAYWRIGHT_PACKAGE_JSON ??
		'C:/Users/sfrei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json',
);
const { chromium } = runtimeRequire('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
	const page = await browser.newPage({
		viewport: { width: 1440, height: 1050 },
	});
	const pageErrors = [];
	page.on('pageerror', (error) => {
		pageErrors.push(error.message);
		console.error('PAGE:', error.message);
	});
	page.on('console', (message) => {
		if (message.type() === 'error') console.error('CONSOLE:', message.text());
	});
	await page.goto('http://127.0.0.1:5173');
	await page.waitForTimeout(1000);
	if (await page.locator('vite-error-overlay').count())
		throw new Error(await page.locator('vite-error-overlay').innerText());
	await page.getByText('Inputs', { exact: true }).click();
	assert.equal(
		await page.locator('option[value="async"]').count(),
		1,
		'async mode must be offered',
	);
	await page.evaluate(() =>
		localStorage.setItem(
			'marie.settings',
			JSON.stringify({
				speed: 0,
				inputsOpen: true,
				outputLogOpen: true,
				displayOpen: true,
			}),
		),
	);
	const fixture = {
		code: 'Loop, Jump Loop',
		breakpoints: { 1: true },
		pointers: {},
		inputs: [{ format: 'async', consumed: '', queued: '' }],
		outputMode: 'dec',
		extendedHardware: true,
		timerPeriod: 30,
	};
	await page.goto('about:blank');
	await page.goto(
		'http://127.0.0.1:5173/#project=' +
			encodeURIComponent(JSON.stringify(fixture)),
	);
	await page.getByRole('button', { name: 'Assemble', exact: true }).click();
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page
		.getByText('Paused at breakpoint on line 1.', { exact: true })
		.waitFor();
	await page.waitForTimeout(80);
	assert.match(
		await page.locator('.timer').innerText(),
		/Congelado/,
		'a breakpoint must stop the hardware clock',
	);
	const stoppedTicks = await page.getByTestId('timer-count').innerText();
	await page.waitForTimeout(250);
	assert.equal(
		await page.getByTestId('timer-count').innerText(),
		stoppedTicks,
		'breakpoint must freeze the timer immediately',
	);

	async function load(code, options = {}) {
		await page.evaluate(() =>
			localStorage.setItem(
				'marie.settings',
				JSON.stringify({
					speed: 9,
					inputsOpen: true,
					outputLogOpen: true,
					displayOpen: true,
				}),
			),
		);
		await page.goto('about:blank');
		await page.goto(
			'http://127.0.0.1:5173/#project=' +
				encodeURIComponent(
					JSON.stringify({ ...fixture, breakpoints: {}, code, ...options }),
				),
		);
		await page.getByRole('button', { name: 'Assemble', exact: true }).click();
	}
	await load('Halt');
	const editablePeriod = page.getByLabel('Periodo del temporizador', {
		exact: true,
	});
	await editablePeriod.fill('47');
	await editablePeriod.press('Tab');
	assert.equal(
		await page
			.getByRole('button', {
				name: 'Rewind to the previous instruction',
				exact: true,
			})
			.isEnabled(),
		true,
		'period edit must be exposed as a reversible action',
	);
	const echo =
		'Loop, Input\nSkipcond 000\nJump Got\nJump Loop\nGot, Output\nJump Loop';
	await load(
		'Load Seven\nStore 0EFA\nLoop, Load 0EFB\nStore 0F00\nJump Loop\nSeven, DEC 7',
	);
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page
		.getByRole('button', { name: 'Capturar teclado', exact: true })
		.click();
	await page.keyboard.down('d');
	await page.waitForTimeout(150);
	assert.equal(
		await page
			.locator('.pixel')
			.first()
			.evaluate((el) => getComputedStyle(el).backgroundColor),
		'rgb(0, 0, 8)',
		'capture must preserve the CPU-selected key',
	);
	await page.keyboard.up('d');
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	await load(echo);
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	const capture = page.getByRole('button', {
		name: 'Capturar teclado',
		exact: true,
	});
	await capture.click();
	await page.keyboard.down('d');
	await page.keyboard.down('Space');
	await page.waitForFunction(() =>
		document
			.querySelector('[data-testid="pressed-keys"]')
			?.textContent.includes('D, Space'),
	);
	await page.keyboard.up('d');
	await page.keyboard.up('Space');
	await page.keyboard.press('ArrowUp');
	await page.waitForFunction(
		() => document.querySelectorAll('.output').length >= 3,
	);
	assert.deepEqual(
		await page
			.locator('.output')
			.allTextContents()
			.then((v) => v.map((s) => s.trim())),
		['100', '32', '256'],
	);
	assert.equal(
		await page.getByRole('button', { name: 'Pause', exact: true }).count(),
		1,
		'async loop must remain running',
	);
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	await page.waitForTimeout(100);
	const pausedTicks = await page.getByTestId('timer-count').innerText();
	await page.waitForTimeout(120);
	assert.equal(
		await page.getByTestId('timer-count').innerText(),
		pausedTicks,
		'pause excludes elapsed wall time',
	);
	assert.equal(
		await page.getByTestId('event-count').innerText(),
		'0',
		'leaving capture clears events',
	);

	// Paused capture proves FIFO, repeat filtering, modifiers and virtual holds.
	await page
		.getByRole('button', { name: 'Capturar teclado', exact: true })
		.click();
	await page.keyboard.down('a');
	await page.keyboard.down('a');
	await page.keyboard.up('a');
	assert.equal(
		await page.getByTestId('input-count').innerText(),
		'1',
		'OS repeat must not create another INPUT',
	);
	await page.keyboard.press('b');
	assert.equal(await page.getByTestId('input-count').innerText(), '2');
	assert.equal(await page.getByTestId('event-count').innerText(), '4');
	await page.keyboard.down('d');
	await page.getByLabel('Periodo del temporizador', { exact: true }).click();
	assert.match(
		await page.getByTestId('pressed-keys').innerText(),
		/ninguna/,
		'moving from capture to an input field must release keys',
	);
	await page.keyboard.up('d');
	// The floating display may cover the editor's centre; click exposed text.
	await page.locator('.cm-content').click({ position: { x: 16, y: 16 } });
	await page.keyboard.press('x');
	assert.equal(
		await page.getByTestId('input-count').innerText(),
		'0',
		'editor focus must not capture keys',
	);
	assert.equal(await page.getByTestId('event-count').innerText(), '0');

	await page.getByText('Teclado virtual', { exact: true }).click();
	await page.getByLabel('Enclavar teclas', { exact: false }).check();
	await page.getByRole('button', { name: 'Tecla D', exact: true }).click();
	await page.getByRole('button', { name: 'Tecla Space', exact: true }).click();
	assert.match(await page.getByTestId('pressed-keys').innerText(), /D, Space/);
	assert.equal(await page.getByTestId('input-count').innerText(), '2');
	await page.getByRole('button', { name: 'Tecla D', exact: true }).click();
	assert.doesNotMatch(await page.getByTestId('pressed-keys').innerText(), /D,/);
	await page
		.getByRole('button', { name: 'Limpiar teclado y colas', exact: true })
		.click();
	assert.match(await page.getByTestId('pressed-keys').innerText(), /ninguna/);
	await page.getByLabel('Enclavar teclas', { exact: false }).uncheck();
	await page.getByRole('button', { name: 'Tecla B', exact: true }).hover();
	await page.mouse.down();
	assert.match(await page.getByTestId('pressed-keys').innerText(), /B/);
	await page.mouse.up();
	assert.match(await page.getByTestId('pressed-keys').innerText(), /ninguna/);
	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	assert.equal(await page.getByTestId('event-count').innerText(), '0');

	// Fast execution must keep processing real keyboard events and rendering frames.
	await load(echo);
	await page.getByRole('button', { name: 'Step', exact: true }).click();
	await page
		.getByRole('button', {
			name: 'Click to enable running as fast as possible, disregarding breakpoints and the RTL log.',
			exact: true,
		})
		.click();
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page
		.getByRole('button', { name: 'Capturar teclado', exact: true })
		.click();
	await page.keyboard.press('ArrowRight');
	await page.waitForFunction(
		() => document.querySelector('.output')?.textContent.trim() === '259',
	);
	const frameGaps = await page.evaluate(
		() =>
			new Promise((resolve) => {
				const gaps = [];
				let previous = performance.now();
				const start = previous;
				function frame() {
					const now = performance.now();
					gaps.push(now - previous);
					previous = now;
					if (now - start < 500) requestAnimationFrame(frame);
					else resolve(gaps);
				}
				requestAnimationFrame(frame);
			}),
	);
	assert.ok(
		Math.max(...frameGaps) < 150,
		`fast mode blocked rendering: ${Math.max(...frameGaps)}ms`,
	);
	console.log(
		`Fast-mode frame gap max: ${Math.max(...frameGaps).toFixed(1)}ms`,
	);
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	assert.equal(
		await page
			.getByRole('button', {
				name: 'Rewind to the previous instruction',
				exact: true,
			})
			.isEnabled(),
		false,
		'fast mode must discard pre-fast history',
	);

	// CPU writes and reverse must update the visible live period.
	await load('Load Value\nStore 0EF7\nHalt\nValue, DEC 47');
	await page.getByRole('button', { name: 'Step', exact: true }).click();
	await page.getByRole('button', { name: 'Step', exact: true }).click();
	await page.waitForFunction(
		() =>
			document.querySelector('[aria-label="Periodo del temporizador"]')
				?.value === '47',
	);
	await page
		.getByRole('button', {
			name: 'Rewind to the previous instruction',
			exact: true,
		})
		.click();
	await page.waitForFunction(
		() =>
			document.querySelector('[aria-label="Periodo del temporizador"]')
				?.value === '30',
	);

	await load('Input\nOutput\nHalt', {
		extendedHardware: false,
		inputs: [{ format: 'dec', consumed: '', queued: '' }],
	});
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page
		.getByText('Input required. Please enter input and press continue.', {
			exact: true,
		})
		.waitFor();
	await page.locator('textarea').fill('42');
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await page.getByRole('button', { name: 'Halted', exact: true }).waitFor();
	assert.deepEqual(
		await page
			.locator('.output')
			.allTextContents()
			.then((v) => v.map((s) => s.trim())),
		['42'],
	);

	await load('Load White\nStore 0F00\nHalt\nWhite, HEX 7FFF', {
		extendedHardware: false,
		inputs: [{ format: 'dec', consumed: '', queued: '' }],
	});
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page.getByRole('button', { name: 'Halted', exact: true }).waitFor();
	assert.equal(await page.locator('.pixel').count(), 256);
	assert.equal(
		await page
			.locator('.pixel')
			.first()
			.evaluate((el) => getComputedStyle(el).backgroundColor),
		'rgb(255, 255, 255)',
	);
	await load('Loop, Load 0EFE\nStore 0F00\nJump Loop');
	await page.getByText('Output log', { exact: true }).click();
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page.getByText('Teclado virtual', { exact: true }).click();
	await page.getByLabel('Enclavar teclas', { exact: false }).check();
	await page.getByRole('button', { name: 'Tecla D', exact: true }).click();
	await page.getByRole('button', { name: 'Tecla Space', exact: true }).click();
	await page.waitForTimeout(100);
	await page.screenshot({ path: 'tests/hardware-browser.png', fullPage: true });
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	assert.deepEqual(
		pageErrors,
		[],
		'browser must not report application errors',
	);
	console.log('Browser hardware: PASS');
} finally {
	await browser.close();
}
