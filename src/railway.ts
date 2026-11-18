import { randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { GameServerHandler } from './handlers/game-server-handler';
import { ProtocolHelper } from './handlers/protocol-handler';
import { LoggerHelper } from './helpers/logger-helper';
import { ClientSocket } from './models/clientSocket';
import { Message } from './models/message';

const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
	throw new Error('PORT must be an integer between 0 and 65535');
}

const secretKey = process.env.SECRET_KEY || '9317e4d6-83b3-4188-94c4-353a2798d3c1';
const turnKey = process.env.TURN_KEY || '';
const gameServer = new GameServerHandler();
const server = createServer((request, response) => {
	if (request.url === '/health') {
		response.writeHead(200, { 'Content-Type': 'text/plain' });
		response.end('OK');
		return;
	}
	response.writeHead(426, { 'Content-Type': 'text/plain', Upgrade: 'websocket' });
	response.end('Expected a WebSocket upgrade');
});
const sockets = new WebSocketServer({ server });

sockets.on('connection', (socket) => {
	const connection = {
		send: (data: string) => socket.send(data),
		close: () => socket.close(),
	};
	const client = new ClientSocket(connection, randomInt(1, 2147483648).toString());
	Object.defineProperty(client, 'logoutTimeout', { enumerable: false });
	gameServer.addClient(client);

	socket.on('message', (data) => {
		const message = Message.fromString(data.toString());
		if (message) {
			ProtocolHelper.parseReceivingMessage(gameServer, client, message, secretKey, turnKey);
		}
	});
	socket.on('close', () => {
		clearTimeout(client.logoutTimeout);
		gameServer.removeClient(client.id);
		LoggerHelper.logInfo(`Connection closed for ${client.id}`);
	});
	socket.on('error', (error) => {
		LoggerHelper.logWarn(`WS Error for ${client.id}: ${error.message}`);
	});
});

server.listen(port, '0.0.0.0', () => {
	const address = server.address();
	if (address && typeof address !== 'string') {
		LoggerHelper.logInfo(`Lobby server listening on port ${address.port}`);
	}
});
