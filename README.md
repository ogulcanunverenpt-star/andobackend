# typescript-websockets-lobby

This is a Typescript websockets server. It handles lobby creation and allows peers to exchange packets to create WebRTC P2P connections.

It can run on a Cloudflare worker or as a Node.js server on Railway.

#### TODO: completely re-write in Go, preserving the API.

### Running locally

Pre-requisite: [install yarn via corepack](https://yarnpkg.com/getting-started/install)

```
yarn set version 4.5
```

```
yarn
```

```
yarn start
```

### Secrets

Create a file called `.dev.vars` and paste the secret key. This file is not committed.

```
SECRET_KEY="____YOUR_RANDOM_SECRET_KEY____"
```

NOTE: The default secret key for this project is reproduced below. It's not a "true" secret currently, it's just designed to bounce random traffic or port explorers.

```
9317e4d6-83b3-4188-94c4-353a2798d3c1
```

### How to set up in Cloudflare

- Fork this project
- Log in to Cloudflare
- Go to Compute (Workers)
- Select: "Import a repository"
- Select the repository in GitHub (connect if needed)
- Name the project: `typescript-websockets-lobby`
- Open Advanced settings
- Update root directory path to: `typescript-websockets-lobby/`
- Note: no need to update watched files, the root is sufficient

- Once done build is complete, go to Settings:
  - Variables and Secrets
  - Select Secret
  - Name: `SECRET_KEY`
  - Value: Copy from `.dev.vars` above

TODO: Do we need a build command?
Note: Do not change the watch path, the root should be where the worker is located.

### Deploying to Railway

- Create a Railway service from this repository and set its root directory to `typescript-websockets-lobby`.
- The included Dockerfile and `railway.json` build the Node.js WebSocket server and check `/health`.
- Set `SECRET_KEY` in the service variables to the same value configured in the Godot client. If omitted, the existing development default above is used.
- Set `TURN_KEY` to the Cloudflare TURN API token if TURN credentials are needed.
- Generate a public domain in Railway networking and connect the client to `wss://<your-domain>`. Railway supplies `PORT` automatically.
- Run exactly one replica: clients and lobbies are held in process memory, not shared between instances. Restarting or redeploying disconnects clients and clears all lobbies.

To run the Railway server locally with Node.js 22 or newer, run `npm install --no-package-lock`, `npm run build:railway`, and `npm run start:railway`. Set `PORT`, `SECRET_KEY`, and `TURN_KEY` in the environment as needed. Run `npm run test:railway` after building to exercise the WebSocket server.

### Troubleshooting

If you get this when building:

```
Installing project dependencies: yarn
12:03:32.773	➤ YN0000: · Yarn 4.5.0

➤ YN0028: │ The lockfile would have been modified by this install, which is explicitly forbidden.
```

Solution: try: `yarn set version 4.5`

### Resources:

- Heavily adapted from: https://github.com/Hairic95/Godot-WebSocket-Multiplayer-Template

### Legacy Actions (may be incomplete)

```gdscript
enum ACTION {
	Confirm,
	GetUsers,
	PlayerJoin,
	PlayerLeft,
	GetLobbies,
	GetOwnLobby,
	CreateLobby,
	JoinLobby,
	LeaveLobby,
	LobbyChanged,
	GameStarted,
	MessageToLobby,
	PlayerInfoUpdate,
	# WebRTC Actions:
	NewPeerConnection,
	Offer,
	Answer,
	Candidate,
	KickPlayer,
	LobbyEvent,
}
```

### TODO: New Actions

```
enum ACTION {
  UserConnect,
  UserConfirm,
  UsersGet,
  UserDisconnect,
  UserDataUpdate,

  LobbiesGet,
  LobbyGetOwn,
  LobbyCreate,
  LobbyJoin,
  LobbyLeft,
  LobbyChanged,
  LobbyUserChanged,
  LobbyChat,
  LobbyKick,
  LobbyLock,
  LobbyUnlock,
  LobbyGameStart,

  PeerNewConnection
  PeerOffer
  PeerAnswer
  PeerCandidate

}

```

Note: Past-tense? i.e. LobbyJoined?
Note: Could be all present tense.
Note: maybe things that are just emitting are past-tense, where as sendable actions are present.
"# andobackend" 
