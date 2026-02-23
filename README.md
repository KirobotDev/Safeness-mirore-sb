# safeness-mirore-sb

> A Discord selfbot library — **Mirore Edition** — based on discord.js v13.

[![Node.js](https://img.shields.io/badge/node-%3E=16.6.0-brightgreen)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](./package.json)
[![License](https://img.shields.io/badge/license-UNLICENSED-red)](./package.json)

---

> [!WARNING]
> Using a selfbot (user account bot) is against Discord's [Terms of Service](https://support.discord.com/hc/en-us/articles/115002192352).
> Use this library **at your own risk**.

---

## Installation

```bash
npm install
```

## Usage

```js
const { Client } = require('safeness-mirore-sb');

const client = new Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login('YOUR_TOKEN_HERE');
```

## Features

- Full discord.js v13 selfbot support
- WebSocket gateway connection
- REST API manager with rate limiting
- Slash Commands & Interactions support
- AntiGroup protection system (Hidden mode)
- All Discord structures (Guild, Channel, Message, User, etc.)
- All Discord managers (GuildManager, MessageManager, etc.)
- Presence & Activity support (RichPresence, SpotifyRPC, CustomStatus)
- RemoteAuth / QR Login support
- Relationship & Friend management
- Billing manager
- User settings manager
- Sharding support

## Structure

```
src/
├── client/
│   ├── BaseClient.js
│   ├── Client.js
│   ├── WebhookClient.js
│   ├── actions/
│   ├── voice/
│   └── websocket/
├── errors/
├── managers/
├── rest/
├── sharding/
├── structures/
│   └── interfaces/
└── util/
```

## Credits

Modified and maintained as **safeness-mirore-sb** by kirobotdev.
