'use strict';

const BitField = require('./BitField');

/**
 * Data structure that makes it easy to interact with a permission bitfield. All {@link GuildMember}s have a set of
 * permissions in their guild, and each channel in the guild may also have {@link PermissionOverwrites} for the member
 * that override their default permissions.
 * @extends {BitField}
 */
class Permissions extends BitField {
  /**
   * Bitfield of the packed bits
   * @type {bigint}
   * @name Permissions#bitfield
   */

  /**
   * Data that can be resolved to give a permission number. This can be:
   * * A string (see {@link Permissions.FLAGS})
   * * A permission number
   * * An instance of Permissions
   * * An Array of PermissionResolvable
   * @typedef {string|bigint|Permissions|PermissionResolvable[]} PermissionResolvable
   */

  /**
   * Gets all given bits that are missing from the bitfield.
   * @param {BitFieldResolvable} bits Bit(s) to check for
   * @param {boolean} [checkAdmin=true] Whether to allow the administrator permission to override
   * @returns {string[]}
   */
  missing(bits, checkAdmin = true) {
    return checkAdmin && this.has(this.constructor.FLAGS.ADMINISTRATOR) ? [] : super.missing(bits);
  }

  /**
   * Checks whether the bitfield has a permission, or any of multiple permissions.
   * @param {PermissionResolvable} permission Permission(s) to check for
   * @param {boolean} [checkAdmin=true] Whether to allow the administrator permission to override
   * @returns {boolean}
   */
  any(permission, checkAdmin = true) {
    return (checkAdmin && super.has(this.constructor.FLAGS.ADMINISTRATOR)) || super.any(permission);
  }

  /**
   * Checks whether the bitfield has a permission, or multiple permissions.
   * @param {PermissionResolvable} permission Permission(s) to check for
   * @param {boolean} [checkAdmin=true] Whether to allow the administrator permission to override
   * @returns {boolean}
   */
  has(permission, checkAdmin = true) {
    return (checkAdmin && super.has(this.constructor.FLAGS.ADMINISTRATOR)) || super.has(permission);
  }

  /**
   * Gets an {@link Array} of bitfield names based on the permissions available.
   * @returns {string[]}
   */
  toArray() {
    return super.toArray(false);
  }
}

/**
 * Numeric permission flags. All available properties:
 * * `CREATE_INSTANT_INVITE` (create invitations to the guild)
 * * `KICK_MEMBERS`
 * * `BAN_MEMBERS`
 * * `ADMINISTRATOR` (implicitly has *all* permissions, and bypasses all channel overwrites)
 * * `MANAGE_CHANNELS` (edit and reorder channels)
 * * `MANAGE_GUILD` (edit the guild information, region, etc.)
 * * `ADD_REACTIONS` (add new reactions to messages)
 * * `VIEW_AUDIT_LOG`
 * * `PRIORITY_SPEAKER`
 * * `STREAM`
 * * `VIEW_CHANNEL`
 * * `SEND_MESSAGES`
 * * `SEND_TTS_MESSAGES`
 * * `MANAGE_MESSAGES` (delete messages and reactions)
 * * `EMBED_LINKS` (links posted will have a preview embedded)
 * * `ATTACH_FILES`
 * * `READ_MESSAGE_HISTORY` (view messages that were posted prior to opening Discord)
 * * `MENTION_EVERYONE`
 * * `USE_EXTERNAL_EMOJIS` (use emojis from different guilds)
 * * `VIEW_GUILD_INSIGHTS`
 * * `CONNECT` (connect to a voice channel)
 * * `SPEAK` (speak in a voice channel)
 * * `MUTE_MEMBERS` (mute members across all voice channels)
 * * `DEAFEN_MEMBERS` (deafen members across all voice channels)
 * * `MOVE_MEMBERS` (move members between voice channels)
 * * `USE_VAD` (use voice activity detection)
 * * `CHANGE_NICKNAME`
 * * `MANAGE_NICKNAMES` (change other members' nicknames)
 * * `MANAGE_ROLES`
 * * `MANAGE_WEBHOOKS`
 * * `MANAGE_EMOJIS_AND_STICKERS`
 * * `USE_APPLICATION_COMMANDS`
 * * `REQUEST_TO_SPEAK`
 * * `MANAGE_EVENTS`
 * * `MANAGE_THREADS`
 * * `USE_PUBLIC_THREADS` (deprecated)
 * * `CREATE_PUBLIC_THREADS`
 * * `USE_PRIVATE_THREADS` (deprecated)
 * * `CREATE_PRIVATE_THREADS`
 * * `USE_EXTERNAL_STICKERS` (use stickers from different guilds)
 * * `SEND_MESSAGES_IN_THREADS`
 * * `START_EMBEDDED_ACTIVITIES`
 * * `MODERATE_MEMBERS`
 * * `VIEW_CREATOR_MONETIZATION_ANALYTICS`
 * * `USE_SOUNDBOARD`
 * * `CREATE_GUILD_EXPRESSIONS`
 * * `CREATE_EVENTS`
 * * `USE_EXTERNAL_SOUNDS`
 * * `SEND_VOICE_MESSAGES`
 * * `USE_CLYDE_AI`
 * * `SET_VOICE_CHANNEL_STATUS`
 * * `SEND_POLLS`
 * * `USE_EXTERNAL_APPS`
 * @type {Object<string, bigint>}
 * @see {@link https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags}
 */
Permissions.FLAGS = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  USE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  USE_PRIVATE_THREADS: 1n << 36n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  START_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n,
  VIEW_CREATOR_MONETIZATION_ANALYTICS: 1n << 41n,
  USE_SOUNDBOARD: 1n << 42n,
  CREATE_GUILD_EXPRESSIONS: 1n << 43n,
  CREATE_EVENTS: 1n << 44n,
  USE_EXTERNAL_SOUNDS: 1n << 45n,
  SEND_VOICE_MESSAGES: 1n << 46n,
  USE_CLYDE_AI: 1n << 47n,
  SET_VOICE_CHANNEL_STATUS: 1n << 48n,
  SEND_POLLS: 1n << 49n,
  USE_EXTERNAL_APPS: 1n << 50n,
};

/**
 * Aliases for {@link Permissions.FLAGS} in PascalCase (v14 style)
 * @type {Object<string, bigint>}
 */
Permissions.PermissionFlagsBits = {
  CreateInstantInvite: Permissions.FLAGS.CREATE_INSTANT_INVITE,
  KickMembers: Permissions.FLAGS.KICK_MEMBERS,
  BanMembers: Permissions.FLAGS.BAN_MEMBERS,
  Administrator: Permissions.FLAGS.ADMINISTRATOR,
  ManageChannels: Permissions.FLAGS.MANAGE_CHANNELS,
  ManageGuild: Permissions.FLAGS.MANAGE_GUILD,
  AddReactions: Permissions.FLAGS.ADD_REACTIONS,
  ViewAuditLog: Permissions.FLAGS.VIEW_AUDIT_LOG,
  PrioritySpeaker: Permissions.FLAGS.PRIORITY_SPEAKER,
  Stream: Permissions.FLAGS.STREAM,
  ViewChannel: Permissions.FLAGS.VIEW_CHANNEL,
  SendMessages: Permissions.FLAGS.SEND_MESSAGES,
  SendTTSMessages: Permissions.FLAGS.SEND_TTS_MESSAGES,
  ManageMessages: Permissions.FLAGS.MANAGE_MESSAGES,
  EmbedLinks: Permissions.FLAGS.EMBED_LINKS,
  AttachFiles: Permissions.FLAGS.ATTACH_FILES,
  ReadMessageHistory: Permissions.FLAGS.READ_MESSAGE_HISTORY,
  MentionEveryone: Permissions.FLAGS.MENTION_EVERYONE,
  UseExternalEmojis: Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
  ViewGuildInsights: Permissions.FLAGS.VIEW_GUILD_INSIGHTS,
  Connect: Permissions.FLAGS.CONNECT,
  Speak: Permissions.FLAGS.SPEAK,
  MuteMembers: Permissions.FLAGS.MUTE_MEMBERS,
  DeafenMembers: Permissions.FLAGS.DEAFEN_MEMBERS,
  MoveMembers: Permissions.FLAGS.MOVE_MEMBERS,
  UseVAD: Permissions.FLAGS.USE_VAD,
  ChangeNickname: Permissions.FLAGS.CHANGE_NICKNAME,
  ManageNicknames: Permissions.FLAGS.MANAGE_NICKNAMES,
  ManageRoles: Permissions.FLAGS.MANAGE_ROLES,
  ManageWebhooks: Permissions.FLAGS.MANAGE_WEBHOOKS,
  ManageEmojisAndStickers: Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
  UseApplicationCommands: Permissions.FLAGS.USE_APPLICATION_COMMANDS,
  RequestToSpeak: Permissions.FLAGS.REQUEST_TO_SPEAK,
  ManageEvents: Permissions.FLAGS.MANAGE_EVENTS,
  ManageThreads: Permissions.FLAGS.MANAGE_THREADS,
  CreatePublicThreads: Permissions.FLAGS.CREATE_PUBLIC_THREADS,
  CreatePrivateThreads: Permissions.FLAGS.CREATE_PRIVATE_THREADS,
  UseExternalStickers: Permissions.FLAGS.USE_EXTERNAL_STICKERS,
  SendMessagesInThreads: Permissions.FLAGS.SEND_MESSAGES_IN_THREADS,
  StartEmbeddedActivities: Permissions.FLAGS.START_EMBEDDED_ACTIVITIES,
  ModerateMembers: Permissions.FLAGS.MODERATE_MEMBERS,
  ViewCreatorMonetizationAnalytics: Permissions.FLAGS.VIEW_CREATOR_MONETIZATION_ANALYTICS,
  UseSoundboard: Permissions.FLAGS.USE_SOUNDBOARD,
  CreateGuildExpressions: Permissions.FLAGS.CREATE_GUILD_EXPRESSIONS,
  CreateEvents: Permissions.FLAGS.CREATE_EVENTS,
  UseExternalSounds: Permissions.FLAGS.USE_EXTERNAL_SOUNDS,
  SendVoiceMessages: Permissions.FLAGS.SEND_VOICE_MESSAGES,
  UseClydeAI: Permissions.FLAGS.USE_CLYDE_AI,
  SetVoiceChannelStatus: Permissions.FLAGS.SET_VOICE_CHANNEL_STATUS,
  SendPolls: Permissions.FLAGS.SEND_POLLS,
  UseExternalApps: Permissions.FLAGS.USE_EXTERNAL_APPS,
};

/**
 * Aliases for {@link Permissions.FLAGS} in PascalCase (v14 style)
 * @type {Object<string, bigint>}
 */
Permissions.PermissionFlagsBits = {
  CreateInstantInvite: Permissions.FLAGS.CREATE_INSTANT_INVITE,
  KickMembers: Permissions.FLAGS.KICK_MEMBERS,
  BanMembers: Permissions.FLAGS.BAN_MEMBERS,
  Administrator: Permissions.FLAGS.ADMINISTRATOR,
  ManageChannels: Permissions.FLAGS.MANAGE_CHANNELS,
  ManageGuild: Permissions.FLAGS.MANAGE_GUILD,
  AddReactions: Permissions.FLAGS.ADD_REACTIONS,
  ViewAuditLog: Permissions.FLAGS.VIEW_AUDIT_LOG,
  PrioritySpeaker: Permissions.FLAGS.PRIORITY_SPEAKER,
  Stream: Permissions.FLAGS.STREAM,
  ViewChannel: Permissions.FLAGS.VIEW_CHANNEL,
  SendMessages: Permissions.FLAGS.SEND_MESSAGES,
  SendTTSMessages: Permissions.FLAGS.SEND_TTS_MESSAGES,
  ManageMessages: Permissions.FLAGS.MANAGE_MESSAGES,
  EmbedLinks: Permissions.FLAGS.EMBED_LINKS,
  AttachFiles: Permissions.FLAGS.ATTACH_FILES,
  ReadMessageHistory: Permissions.FLAGS.READ_MESSAGE_HISTORY,
  MentionEveryone: Permissions.FLAGS.MENTION_EVERYONE,
  UseExternalEmojis: Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
  ViewGuildInsights: Permissions.FLAGS.VIEW_GUILD_INSIGHTS,
  Connect: Permissions.FLAGS.CONNECT,
  Speak: Permissions.FLAGS.SPEAK,
  MuteMembers: Permissions.FLAGS.MUTE_MEMBERS,
  DeafenMembers: Permissions.FLAGS.DEAFEN_MEMBERS,
  MoveMembers: Permissions.FLAGS.MOVE_MEMBERS,
  UseVAD: Permissions.FLAGS.USE_VAD,
  ChangeNickname: Permissions.FLAGS.CHANGE_NICKNAME,
  ManageNicknames: Permissions.FLAGS.MANAGE_NICKNAMES,
  ManageRoles: Permissions.FLAGS.MANAGE_ROLES,
  ManageWebhooks: Permissions.FLAGS.MANAGE_WEBHOOKS,
  ManageEmojisAndStickers: Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
  UseApplicationCommands: Permissions.FLAGS.USE_APPLICATION_COMMANDS,
  RequestToSpeak: Permissions.FLAGS.REQUEST_TO_SPEAK,
  ManageEvents: Permissions.FLAGS.MANAGE_EVENTS,
  ManageThreads: Permissions.FLAGS.MANAGE_THREADS,
  CreatePublicThreads: Permissions.FLAGS.CREATE_PUBLIC_THREADS,
  CreatePrivateThreads: Permissions.FLAGS.CREATE_PRIVATE_THREADS,
  UseExternalStickers: Permissions.FLAGS.USE_EXTERNAL_STICKERS,
  SendMessagesInThreads: Permissions.FLAGS.SEND_MESSAGES_IN_THREADS,
  StartEmbeddedActivities: Permissions.FLAGS.START_EMBEDDED_ACTIVITIES,
  ModerateMembers: Permissions.FLAGS.MODERATE_MEMBERS,
  ViewCreatorMonetizationAnalytics: Permissions.FLAGS.VIEW_CREATOR_MONETIZATION_ANALYTICS,
  UseSoundboard: Permissions.FLAGS.USE_SOUNDBOARD,
  CreateGuildExpressions: Permissions.FLAGS.CREATE_GUILD_EXPRESSIONS,
  CreateEvents: Permissions.FLAGS.CREATE_EVENTS,
  UseExternalSounds: Permissions.FLAGS.USE_EXTERNAL_SOUNDS,
  SendVoiceMessages: Permissions.FLAGS.SEND_VOICE_MESSAGES,
  UseClydeAI: Permissions.FLAGS.USE_CLYDE_AI,
  SetVoiceChannelStatus: Permissions.FLAGS.SET_VOICE_CHANNEL_STATUS,
  SendPolls: Permissions.FLAGS.SEND_POLLS,
  UseExternalApps: Permissions.FLAGS.USE_EXTERNAL_APPS,
};

/**
 * Bitfield representing every permission combined
 * @type {bigint}
 */
Permissions.ALL = Object.values(Permissions.FLAGS).reduce((all, p) => all | p, 0n);

/**
 * Bitfield representing the default permissions for users
 * @type {bigint}
 */
Permissions.DEFAULT = BigInt(104324673);

/**
 * Bitfield representing the permissions required for moderators of stage channels
 * @type {bigint}
 */
Permissions.STAGE_MODERATOR =
  Permissions.FLAGS.MANAGE_CHANNELS | Permissions.FLAGS.MUTE_MEMBERS | Permissions.FLAGS.MOVE_MEMBERS;

Permissions.defaultBit = BigInt(0);

module.exports = Permissions;
