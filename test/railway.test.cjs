const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');

function connect(port) {
	const socket = new WebSocket(`ws://127.0.0.1:${port}`);
	const messages = [];
	const waiters = [];
	socket.on('message', (data) => {
		const message = JSON.parse(data.toString());
		const index = waiters.findIndex(({ predicate }) => predicate(message));
		if (index === -1) messages.push(message);
		else waiters.splice(index, 1)[0].resolve(message);
	});
	socket.next = (predicate) => {
		const index = messages.findIndex(predicate);
		if (index !== -1) return Promise.resolve(messages.splice(index, 1)[0]);
		return new Promise((resolve, reject) => {
			const waiter = { predicate, resolve: (message) => { clearTimeout(timer); resolve(message); } };
			const timer = setTimeout(() => {
				waiters.splice(waiters.indexOf(waiter), 1);
				reject(new Error('Timed out waiting for a WebSocket message'));
			}, 5000);
			waiters.push(waiter);
		});
	};
	socket.sendAction = (action, payload = {}) => socket.send(JSON.stringify({ action, payload }));
	return socket;
}

test('Railway server supports health checks and shared lobby sessions', { timeout: 15000 }, async (t) => {
	const server = spawn(process.execPath, ['dist/railway.js'], {
		env: { ...process.env, PORT: '0', SECRET_KEY: 'test-secret' },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	t.after(() => server.kill());
	let output = '';
	const port = await new Promise((resolve, reject) => {
		server.on('error', reject);
		server.on('exit', (code) => reject(new Error(`Server exited: ${code}\n${output}`)));
		server.stdout.on('data', (data) => {
			output += data.toString();
			const match = output.match(/listening on port (\d+)/);
			if (match) resolve(Number(match[1]));
		});
		server.stderr.on('data', (data) => { output += data.toString(); });
	});
	const health = await fetch(`http://127.0.0.1:${port}/health`);
	assert.equal(health.status, 200);
	assert.equal(await health.text(), 'OK');
	assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 426);

	const first = connect(port);
	t.after(() => first.terminate());
	await once(first, 'open');
	first.sendAction('Confirm', { secretKey: 'test-secret', username: 'first' });
	await first.next((message) => message.action === 'Confirm');

	const second = connect(port);
	t.after(() => second.terminate());
	await once(second, 'open');
	first.sendAction('GetUsers');
	const users = await first.next((message) => message.action === 'GetUsers' && message.payload.users.length === 2);
	assert.equal(users.payload.users.length, 2);

	second.sendAction('Confirm', { secretKey: 'test-secret', username: 'second' });
	await second.next((message) => message.action === 'Confirm');
	first.sendAction('CreateLobby', { customId: 'test-lobby', isPublic: true });
	await first.next((message) => message.action === 'CreateLobby' && message.payload.lobby.id === 'test-lobby');
	second.sendAction('JoinLobby', { id: 'test-lobby' });
	const joined = await second.next((message) => message.action === 'JoinLobby');
	assert.equal(joined.payload.lobby.players.length, 2);

	first.close();
	await once(first, 'close');
	second.sendAction('GetOwnLobby');
	const remaining = await second.next((message) => message.action === 'GetOwnLobby');
	assert.equal(remaining.payload.lobby.players.length, 1);

	const rejected = connect(port);
	t.after(() => rejected.terminate());
	await once(rejected, 'open');
	rejected.sendAction('Confirm', { secretKey: 'wrong', username: 'rejected' });
	await once(rejected, 'close');
});
