'use strict';

const VoiceModule = require('./VoiceModule');

/**
 * Manages voice connections for a Discord selfbot client.
 *
 * Wraps {@link VoiceModule} and exposes a clean, high-level API including
 * webcam, Go Live stream, mute, deafen, and live state updates.
 *
 * Accessible via `client.voice`.
 *
 * @example
 * // Join a voice channel with camera on
 * await client.voice.joinChannel('CHANNEL_ID', { selfVideo: true });
 *
 * // Toggle stream while connected
 * client.voice.setStream(true);
 *
 * // Leave
 * client.voice.disconnect();
 */
class ClientVoiceManager {
  /**
   * @param {import('../Client')} client
   */
  constructor(client) {
    /**
     * The client that instantiated this voice manager.
     * @type {import('../Client')}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: client });

    /**
     * The underlying low-level voice module (WebSocket + gateway logic).
     * @type {VoiceModule}
     */
    this.module = new VoiceModule(client);

    /**
     * Adapter map for optional @discordjs/voice interop.
     * @type {Map<string, Object>}
     */
    this.adapters = new Map();

    // Bubble VoiceModule events to the client
    this.module.on('debug', msg => client.emit('debug', msg));
    this.module.on('error', err => client.emit('error', err));
    this.module.on('voiceStateUpdate', p => this._onVoiceStateUpdate(p));
    this.module.on('voiceServerUpdate', p => this._onVoiceServerUpdate(p));
    this.module.on('disconnect', () => client.emit('voiceDisconnect'));
  }

  // ─── Join / Leave ──────────────────────────────────────────────────────────

  /**
   * @typedef {Object} JoinChannelConfig
   * @property {boolean} [selfMute=false]   Join muted
   * @property {boolean} [selfDeaf=false]   Join deafened
   * @property {boolean} [selfVideo=false]  Enable webcam / camera
   * @property {boolean} [selfStream=false] Enable Go Live screen share
   */

  /**
   * Join a voice channel.
   * @param {string|import('../../structures/VoiceChannel')} channel Channel object or ID
   * @param {JoinChannelConfig} [config={}]
   * @returns {Promise<{ channel: import('../../structures/VoiceChannel'), guildId: string } | null>}
   */
  joinChannel(channel, config = {}) {
    const channelId = typeof channel === 'string' ? channel : channel?.id;
    if (!channelId) throw new TypeError('[ClientVoiceManager] Invalid channel — expected a channel ID or VoiceChannel object.');

    return this.module.joinVoiceChannel(channelId, {
      selfMute: Boolean(config.selfMute),
      selfDeaf: Boolean(config.selfDeaf),
      selfVideo: Boolean(config.selfVideo),
      selfStream: Boolean(config.selfStream),
    });
  }

  /**
   * Leave the current voice channel.
   */
  disconnect() {
    this.module.disconnect();
  }

  // ─── Live controls ─────────────────────────────────────────────────────────

  /**
   * Toggle webcam / camera.
   * @param {boolean} enabled
   */
  setCamera(enabled) {
    this.module.updateVoiceState({ selfVideo: Boolean(enabled) });
  }

  /**
   * Toggle Go Live screen share.
   * @param {boolean} enabled
   */
  setStream(enabled) {
    this.module.updateVoiceState({ selfStream: Boolean(enabled) });
  }

  /**
   * Toggle self-mute.
   * @param {boolean} muted
   */
  setMute(muted) {
    this.module.updateVoiceState({ selfMute: Boolean(muted) });
  }

  /**
   * Toggle self-deafen.
   * @param {boolean} deafened
   */
  setDeaf(deafened) {
    this.module.updateVoiceState({ selfDeaf: Boolean(deafened) });
  }

  /**
   * @param {JoinChannelConfig} opts
   */
  updateState(opts = {}) {
    this.module.updateVoiceState(opts);
  }

  onVoiceServer(payload) {
    this.module.serverData = payload;
    const key = payload.guild_id ?? payload.channel_id;
    if (key) this.adapters.get(key)?.onVoiceServerUpdate(payload);
  }

  onVoiceStateUpdate(payload) {
    this._onVoiceStateUpdate(payload);
  }


  /** @private */
  _onVoiceServerUpdate(payload) {
    this.module.serverData = payload;
    const key = payload.guild_id ?? payload.channel_id;
    if (key) this.adapters.get(key)?.onVoiceServerUpdate(payload);
  }

  /** @private */
  _onVoiceStateUpdate(payload) {
    if (payload.user_id !== this.client.user?.id) return;

    if (payload.session_id) this.module.sessionId = payload.session_id;

    if (!payload.channel_id && this.module.voiceState.channelId) {
      this.module.disconnect();
    }

    if (payload.guild_id && payload.session_id) {
      this.adapters.get(payload.guild_id)?.onVoiceStateUpdate(payload);
    } else if (payload.channel_id && payload.session_id) {
      this.adapters.get(payload.channel_id)?.onVoiceStateUpdate(payload);
    }
  }


  /**
   * Whether currently connected to a voice channel.
   * @type {boolean}
   */
  get connected() {
    return this.module.connected;
  }

  /**
   * The current voice channel ID, or null.
   * @type {string|null}
   */
  get channelId() {
    return this.module.voiceState.channelId ?? null;
  }

  /**
   * The current guild ID, or null.
   * @type {string|null}
   */
  get guildId() {
    return this.module.voiceState.guildId ?? null;
  }

  /**
   * The current voice options (mute, deaf, video, stream).
   * @type {JoinChannelConfig}
   */
  get currentOptions() {
    return { ...this.module.voiceState.options } ?? {};
  }
}

module.exports = ClientVoiceManager;
