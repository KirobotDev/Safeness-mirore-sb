'use strict';

const EventEmitter = require('node:events');
const WebSocket = require('ws');


const MAIN_GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

const OP = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    VOICE_STATE_UPDATE: 4,
    HELLO: 10,
    HEARTBEAT_ACK: 11,
    STREAM_CREATE: 18,
};

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
const VOICE_DATA_TIMEOUT_MS = 20_000;
const VOICE_DATA_POLL_MS = 200;


/**
 * Emitted events:
 *  - 'voiceStateUpdate'  (payload)
 *  - 'voiceServerUpdate' (payload)
 *  - 'disconnect'        ()
 *  - 'error'             (Error)
 *  - 'debug'             (string)
 */
class VoiceModule extends EventEmitter {
    /**
     * @param {import('../Client')} client
     */
    constructor(client) {
        super();

        /** @type {import('../Client')} */
        this.client = client;

        /** @type {WebSocket|null} */
        this.ws = null;

        /** @type {{ guildId?: string, channelId?: string, options?: VoiceJoinOptions }} */
        this.voiceState = {};

        /** @type {Object|null} Raw VOICE_SERVER_UPDATE payload */
        this.serverData = null;

        /** @type {string|null} Current voice session ID */
        this.sessionId = null;

        /** @type {boolean} */
        this.isReady = false;

        /** @private @type {NodeJS.Timeout|null} */
        this._heartbeatTimer = null;

        /** @private @type {boolean} Was the last heartbeat acknowledged */
        this._heartbeatAcked = true;

        /** @private @type {number} */
        this._reconnectAttempts = 0;

        /** @private @type {number} Maximum reconnect attempts before giving up */
        this._maxReconnectAttempts = 7;

        /** @private  Prevent multiple simultaneous reconnect loops */
        this._reconnecting = false;

        /** @private Don't reconnect after an intentional disconnect */
        this._intentionalDisconnect = false;
    }


    /**
     * @returns {Promise<void>}
     */
    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();

        return new Promise((resolve, reject) => {
            this._debug('Connecting to Discord gateway…');
            const ws = new WebSocket(MAIN_GATEWAY, {
                agent: this.client.options.ws.agent ?? undefined,
            });

            ws.once('open', () => {
                this._intentionalDisconnect = false;
                this._reconnectAttempts = 0;
                this._heartbeatAcked = true;
                this._debug('WebSocket open — identifying');
                this._sendIdentify(ws);
                resolve();
            });

            ws.on('message', data => this._handleMessage(data));
            ws.once('error', err => {
                this.emit('error', err);
                reject(err);
            });
            ws.on('close', (code, reason) => {
                this._debug(`WebSocket closed [${code}] ${reason}`);
                this._cleanup();
                if (!this._intentionalDisconnect) this._scheduleReconnect();
            });

            this.ws = ws;
        });
    }

    /**
     * @typedef {Object} VoiceJoinOptions
     * @property {boolean} [selfMute=false]   Mute microphone
     * @property {boolean} [selfDeaf=false]   Deafen speakers
     * @property {boolean} [selfVideo=false]  Enable webcam
     * @property {boolean} [selfStream=false] Enable Go Live screen share
     */

    /**
     * Join a voice channel.
     * @param {string} channelId
     * @param {VoiceJoinOptions} [options={}]
     * @returns {Promise<{ channel: import('../../structures/VoiceChannel'), guildId: string } | null>}
     */
    async joinVoiceChannel(channelId, options = {}) {
        const selfMute = Boolean(options.selfMute);
        const selfDeaf = Boolean(options.selfDeaf);
        const selfVideo = Boolean(options.selfVideo);
        const selfStream = Boolean(options.selfStream);

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.connect();
        }

        const channel = this.client.channels.cache.get(channelId);
        if (!channel || !['GUILD_VOICE', 'GUILD_STAGE_VOICE'].includes(channel.type)) {
            this._debug(`joinVoiceChannel: invalid channel ${channelId}`);
            return null;
        }

        const guildId = channel.guild?.id;
        if (!guildId) return null;

        // Permission check
        const perms = channel.permissionsFor?.(this.client.user);
        if (perms && (!perms.has('CONNECT') || !perms.has('SPEAK'))) {
            this._debug('joinVoiceChannel: missing CONNECT or SPEAK permissions');
            return null;
        }

        this.serverData = null;
        this.sessionId = null;

        this._sendRaw({
            op: OP.VOICE_STATE_UPDATE,
            d: {
                guild_id: guildId,
                channel_id: channelId,
                self_mute: selfMute,
                self_deaf: selfDeaf,
                self_video: selfVideo,
                flags: selfStream ? 2 : 0,
            },
        });

        this.voiceState = {
            guildId,
            channelId,
            options: { selfMute, selfDeaf, selfVideo, selfStream },
        };

        const timedOut = await this._waitForVoiceData(VOICE_DATA_TIMEOUT_MS);
        if (timedOut) {
            this._debug('joinVoiceChannel: timeout waiting for voice data');
            return null;
        }

        if (selfStream) {
            this._sendRaw({
                op: OP.STREAM_CREATE,
                d: {
                    type: 'guild',
                    guild_id: guildId,
                    channel_id: channelId,
                    preferred_region: null,
                },
            });
        }

        this._debug(`Joined ${channel.name} (${channelId}) in guild ${guildId}`);
        return { channel, guildId };
    }

    /**
     * @param {Partial<VoiceJoinOptions>} opts
     */
    updateVoiceState(opts = {}) {
        if (!this.voiceState.guildId) {
            this._debug('updateVoiceState: not in a voice channel');
            return;
        }

        const cur = this.voiceState.options ?? {};
        const selfMute = opts.selfMute ?? cur.selfMute ?? false;
        const selfDeaf = opts.selfDeaf ?? cur.selfDeaf ?? false;
        const selfVideo = opts.selfVideo ?? cur.selfVideo ?? false;
        const selfStream = opts.selfStream ?? cur.selfStream ?? false;

        this._sendRaw({
            op: OP.VOICE_STATE_UPDATE,
            d: {
                guild_id: this.voiceState.guildId,
                channel_id: this.voiceState.channelId,
                self_mute: selfMute,
                self_deaf: selfDeaf,
                self_video: selfVideo,
                flags: selfStream ? 2 : 0,
            },
        });

        this.voiceState.options = { selfMute, selfDeaf, selfVideo, selfStream };

        if (selfStream) {
            this._sendRaw({
                op: OP.STREAM_CREATE,
                d: {
                    type: 'guild',
                    guild_id: this.voiceState.guildId,
                    channel_id: this.voiceState.channelId,
                    preferred_region: null,
                },
            });
        }
    }

    disconnect() {
        this._intentionalDisconnect = true;

        if (this.voiceState.guildId) {
            this._sendRaw({
                op: OP.VOICE_STATE_UPDATE,
                d: {
                    guild_id: this.voiceState.guildId,
                    channel_id: null,
                    self_mute: false,
                    self_deaf: false,
                    self_video: false,
                    flags: 0,
                },
            });
        }

        this._cleanup();
        this.emit('disconnect');
        this._debug('Disconnected from voice');
    }

    /**
     * @type {boolean}
     */
    get connected() {
        return Boolean(this.voiceState.channelId) && this.ws?.readyState === WebSocket.OPEN;
    }



    /** @private */
    _sendIdentify(ws) {
        const token = this.client.token?.replace(/^Bot\s*/i, '');
        const props = this.client.options.ws.properties ?? {};

        this._sendRawOn(ws, {
            op: OP.IDENTIFY,
            d: {
                token,
                properties: {
                    os: props.os ?? 'Windows',
                    browser: props.browser ?? 'Chrome',
                    device: props.device ?? '',
                },
                compress: false,
                intents: (1 << 7) | (1 << 9),
            },
        });
    }

    /** @private */
    _handleMessage(rawData) {
        let payload;
        try {
            payload = JSON.parse(rawData);
        } catch (err) {
            this._debug(`Failed to parse gateway message: ${err.message}`);
            return;
        }

        this._debug(`← OP ${payload.op}${payload.t ? ` [${payload.t}]` : ''}`);

        switch (payload.op) {
            case OP.DISPATCH:
                this._handleDispatch(payload);
                break;

            case OP.HELLO: {
                const interval = payload.d?.heartbeat_interval ?? 41250;
                this._startHeartbeat(interval);
                this.isReady = true;
                break;
            }

            case OP.HEARTBEAT_ACK:
                this._heartbeatAcked = true;
                break;

            case OP.HEARTBEAT:
                this._sendRaw({ op: OP.HEARTBEAT, d: null });
                break;

            default:
                break;
        }
    }

    /** @private */
    _handleDispatch(payload) {
        switch (payload.t) {
            case 'VOICE_SERVER_UPDATE':
                this.serverData = payload.d;
                this.emit('voiceServerUpdate', payload.d);
                break;

            case 'VOICE_STATE_UPDATE':
                if (payload.d.user_id === this.client.user?.id) {
                    this.sessionId = payload.d.session_id ?? this.sessionId;

                    if (!payload.d.channel_id && this.voiceState.channelId) {
                        this._debug('Force-disconnected from voice');
                        this.voiceState = {};
                        this.emit('voiceStateUpdate', payload.d);
                    } else {
                        this.emit('voiceStateUpdate', payload.d);
                    }
                }
                break;

            default:
                break;
        }
    }

    /** @private */
    _startHeartbeat(intervalMs) {
        if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
        const jitter = Math.random() * 0.1 * intervalMs;
        const effective = intervalMs * 0.75 + jitter;

        this._heartbeatTimer = setInterval(() => {
            if (!this._heartbeatAcked) {
                this._debug('Heartbeat not acknowledged — reconnecting');
                this.ws?.terminate();
                return;
            }
            this._heartbeatAcked = false;
            this._sendRaw({ op: OP.HEARTBEAT, d: null });
        }, effective).unref();
    }

    /**
     * @private
     * @param {number} timeoutMs
     * @returns {Promise<boolean>}
     */
    _waitForVoiceData(timeoutMs) {
        return new Promise(resolve => {
            const deadline = Date.now() + timeoutMs;
            const poll = setInterval(() => {
                if (this.serverData && this.sessionId) {
                    clearInterval(poll);
                    resolve(false);
                } else if (Date.now() >= deadline) {
                    clearInterval(poll);
                    resolve(true);
                }
            }, VOICE_DATA_POLL_MS);
        });
    }

    /** @private */
    _cleanup() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState < WebSocket.CLOSING) this.ws.close();
            this.ws = null;
        }
        this.isReady = false;
        this.serverData = null;
        this.sessionId = null;
        this.voiceState = {};
    }

    /** @private Exponential back-off reconnect */
    async _scheduleReconnect() {
        if (this._reconnecting) return;
        if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            this._debug('Max reconnect attempts reached — giving up');
            this.emit('error', new Error('[VoiceModule] Could not reconnect to Discord gateway after max attempts'));
            return;
        }

        this._reconnecting = true;
        this._reconnectAttempts++;

        const backoff = Math.min(RECONNECT_BASE_MS * 2 ** (this._reconnectAttempts - 1), RECONNECT_MAX_MS);
        const jitter = Math.random() * 1_000;
        const delay = backoff + jitter;

        this._debug(`Reconnecting in ${Math.round(delay)}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);
        await new Promise(r => setTimeout(r, delay));

        try {
            await this.connect();
            if (this.voiceState.channelId) {
                await this.joinVoiceChannel(this.voiceState.channelId, this.voiceState.options);
            }
            this._reconnectAttempts = 0;
        } catch (err) {
            this._debug(`Reconnect failed: ${err.message}`);
            this.emit('error', err);
        } finally {
            this._reconnecting = false;
        }
    }


    /** @private */
    _sendRaw(payload) {
        this._sendRawOn(this.ws, payload);
    }

    /** @private */
    _sendRawOn(ws, payload) {
        if (ws?.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(payload));
                this._debug(`→ OP ${payload.op}`);
            } catch (err) {
                this.emit('error', err);
            }
        } else {
            this._debug(`_sendRaw skipped — WS not open (state=${ws?.readyState})`);
        }
    }

    /** @private */
    _debug(msg) {
        this.emit('debug', `[VoiceModule] ${msg}`);
    }
}

module.exports = VoiceModule;
