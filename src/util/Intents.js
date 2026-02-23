'use strict';
const BitField = require('./BitField');
const { GatewayIntentBits } = require('./Constants');

/**
 * Data structure that makes it easy to calculate intents.
 * @extends {BitField}
 */
class Intents extends BitField { }

/**
 * @name Intents
 * @kind constructor
 * @memberof Intents
 * @param {IntentsResolvable} [bits=0] Bit(s) to read from
 */

/**
 * Data that can be resolved to give a permission number. This can be:
 * * A string (see {@link Intents.FLAGS})
 * * An intents flag
 * * An instance of Intents
 * * An array of IntentsResolvable
 * @typedef {string|number|bigint|Intents|IntentsResolvable[]} IntentsResolvable
 */

/**
 * Numeric WebSocket intents. All available properties:
 * * `Guilds`
 * * `GuildMembers`
 * * `GuildBans`
 * * `GuildEmojisAndStickers`
 * * `GuildIntegrations`
 * * `GuildWebhooks`
 * * `GuildInvites`
 * * `GuildVoiceStates`
 * * `GuildPresences`
 * * `GuildMessages`
 * * `GuildMessageReactions`
 * * `GuildMessageTyping`
 * * `DirectMessages`
 * * `DirectMessageReactions`
 * * `DirectMessageTyping`
 * * `MessageContent`
 * * `GuildScheduledEvents`
 * * `AutoModerationConfiguration`
 * * `AutoModerationExecution`
 * @type {GatewayIntentBits}
 * @see {@link https://discord.com/developers/docs/topics/gateway#list-of-intents}
 */
Intents.FLAGS = GatewayIntentBits;

/**
 * @type {bigint}
 * @private
 */
Intents.defaultBit = 0n;

Intents.ALL = Object.values(Intents.FLAGS).reduce((all, p) => all | p, 0n);

module.exports = Intents;
