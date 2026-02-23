'use strict';

const { register } = require('./DJSError');

/**
 * Complete error code → message registry.
 *
 * Key naming convention (mirrors discord.js v14):
 *  - SCREAMING_SNAKE_CASE
 *  - Function values receive typed arguments
 *  - All strings end with a period for consistency
 *
 * @type {Record<string, string|Function>}
 */
const Messages = {

  CLIENT_INVALID_OPTION: (prop, must) => `The ${prop} option must be ${must}.`,
  CLIENT_INVALID_PROVIDED_SHARDS: 'None of the provided shards were valid.',
  CLIENT_MISSING_INTENTS: 'Valid intents must be provided for the Client.',
  CLIENT_NOT_READY: action => `The client needs to be logged in to ${action}.`,
  CLIENT_ALREADY_LOGGED_IN: 'This client is already logged in.',
  CLIENT_OAUTH2_SCOPE_REQUIRED: 'OAuth2 requires at least one scope.',

  TOKEN_INVALID: 'An invalid token was provided.',
  TOKEN_MISSING: 'Request to use token, but no token was available to the client.',

  WS_CLOSE_REQUESTED: 'WebSocket was closed due to a user request.',
  WS_CONNECTION_EXISTS: 'There is already an existing WebSocket connection.',
  WS_NOT_OPEN: (data = 'data') => `WebSocket is not open — cannot send ${data}.`,
  WS_CONNECTION_TIMEOUT: 'WebSocket connection timed out.',
  WS_UNHANDLED_IDENTIFIER: 'Unhandled identifier in WebSocket session.',

  MANAGER_DESTROYED: 'Manager was destroyed.',

  BITFIELD_INVALID: bit => `Invalid bitfield flag or number: ${bit}.`,

  SHARDING_INVALID: 'Invalid shard settings were provided.',
  SHARDING_REQUIRED: 'This session would have handled too many guilds — sharding is required.',
  SHARDING_NO_SHARDS: 'No shards have been spawned.',
  SHARDING_IN_PROCESS: 'Shards are still being spawned.',
  SHARDING_INVALID_EVAL_BROADCAST: 'Script to evaluate must be a function.',
  SHARDING_SHARD_NOT_FOUND: id => `Shard ${id} could not be found.`,
  SHARDING_ALREADY_SPAWNED: count => `Already spawned ${count} shards.`,
  SHARDING_PROCESS_EXISTS: id => `Shard ${id} already has an active process.`,
  SHARDING_WORKER_EXISTS: id => `Shard ${id} already has an active worker.`,
  SHARDING_READY_TIMEOUT: id => `Shard ${id}'s client took too long to become ready.`,
  SHARDING_READY_DISCONNECTED: id => `Shard ${id}'s client disconnected before becoming ready.`,
  SHARDING_READY_DIED: id => `Shard ${id}'s process exited before its client became ready.`,
  SHARDING_NO_CHILD_EXISTS: id => `Shard ${id} has no active process or worker.`,
  SHARDING_SHARD_MISCALCULATION: (shard, guild, count) =>
    `Calculated invalid shard ${shard} for guild ${guild} with ${count} shards.`,

  INVALID_INTENTS: 'Invalid intent provided for WebSocket intents.',
  DISALLOWED_INTENTS: 'Privileged intent provided is not enabled or whitelisted.',

  COLOR_RANGE: 'Color must be within the range 0–16777215 (0xFFFFFF).',
  COLOR_CONVERT: 'Unable to convert color to a number.',

  INVITE_OPTIONS_MISSING_CHANNEL: 'A valid guild channel must be provided when GuildScheduledEvent is EXTERNAL.',
  INVITE_RESOLVE_CODE: 'Could not resolve the code to fetch the invite.',
  INVITE_NOT_FOUND: 'Could not find the requested invite.',
  INVITE_MISSING_SCOPES: 'At least one valid scope must be provided for the invite.',

  EMBED_TITLE: 'MessageEmbed title must be a string.',
  EMBED_FIELD_NAME: 'MessageEmbed field names must be non-empty strings.',
  EMBED_FIELD_VALUE: 'MessageEmbed field values must be non-empty strings.',
  EMBED_FOOTER_TEXT: 'MessageEmbed footer text must be a string.',
  EMBED_DESCRIPTION: 'MessageEmbed description must be a string.',
  EMBED_AUTHOR_NAME: 'MessageEmbed author name must be a string.',

  BUTTON_LABEL: 'MessageButton label must be a string.',
  BUTTON_URL: 'MessageButton URL must be a string.',
  BUTTON_CUSTOM_ID: 'MessageButton customId must be a string.',

  SELECT_MENU_CUSTOM_ID: 'MessageSelectMenu customId must be a string.',
  SELECT_MENU_PLACEHOLDER: 'MessageSelectMenu placeholder must be a string.',
  SELECT_OPTION_LABEL: 'MessageSelectOption label must be a string.',
  SELECT_OPTION_VALUE: 'MessageSelectOption value must be a string.',
  SELECT_OPTION_DESCRIPTION: 'MessageSelectOption description must be a string.',

  TEXT_INPUT_CUSTOM_ID: 'TextInputComponent customId must be a string.',
  TEXT_INPUT_LABEL: 'TextInputComponent label must be a string.',
  TEXT_INPUT_PLACEHOLDER: 'TextInputComponent placeholder must be a string.',
  TEXT_INPUT_VALUE: 'TextInputComponent value must be a string.',
  TEXT_INPUT_MIN_LENGTH: 'TextInputComponent minLength must be a number between 0 and 4000.',
  TEXT_INPUT_MAX_LENGTH: 'TextInputComponent maxLength must be a number between 1 and 4000.',

  MODAL_CUSTOM_ID: 'Modal customId must be a string.',
  MODAL_TITLE: 'Modal title must be a string.',
  MODAL_SUBMIT_INTERACTION_FIELD_NOT_FOUND: customId =>
    `Required field with custom id "${customId}" not found.`,
  MODAL_SUBMIT_INTERACTION_FIELD_TYPE: (customId, type, expected) =>
    `Field with custom id "${customId}" is of type: ${type}; expected ${expected}.`,

  INTERACTION_COLLECTOR_ERROR: reason => `Collector received no interactions before ending with reason: ${reason}.`,
  INTERACTION_ALREADY_REPLIED: 'The reply to this interaction has already been sent or deferred.',
  INTERACTION_NOT_REPLIED: 'The reply to this interaction has not been sent or deferred.',
  INTERACTION_EPHEMERAL_REPLYED: 'Ephemeral responses cannot be fetched.',
  INTERACTION_FAILED: 'No response received from Application Command.',

  COMMAND_INTERACTION_OPTION_NOT_FOUND: name => `Required option "${name}" not found.`,
  COMMAND_INTERACTION_OPTION_TYPE: (name, type, expected) =>
    `Option "${name}" is of type: ${type}; expected ${expected}.`,
  COMMAND_INTERACTION_OPTION_EMPTY: (name, type) =>
    `Required option "${name}" is of type: ${type}; expected a non-empty value.`,
  COMMAND_INTERACTION_OPTION_NO_SUB_COMMAND: 'No subcommand specified for interaction.',
  COMMAND_INTERACTION_OPTION_NO_SUB_COMMAND_GROUP: 'No subcommand group specified for interaction.',
  AUTOCOMPLETE_INTERACTION_OPTION_NO_FOCUSED_OPTION: 'No focused option for autocomplete interaction.',
  GLOBAL_COMMAND_PERMISSIONS:
    'Permissions for global commands may only be fetched or modified by providing a GuildResolvable ' +
    "or from a guild's application command manager.",

  FILE_NOT_FOUND: file => `File could not be found: ${file}.`,
  REQ_RESOURCE_TYPE: 'The resource must be a string, Buffer, or a valid file stream.',

  IMAGE_FORMAT: format => `Invalid image format: ${format}.`,
  IMAGE_SIZE: size => `Invalid image size: ${size}.`,

  MESSAGE_BULK_DELETE_TYPE: 'Messages must be an Array, Collection, or number.',
  MESSAGE_NONCE_TYPE: 'Message nonce must be an integer or a string.',
  MESSAGE_CONTENT_TYPE: 'Message content must be a non-empty string.',
  MESSAGE_THREAD_PARENT: 'The message was not sent in a guild text or news channel.',
  MESSAGE_EXISTING_THREAD: 'The message already has a thread.',
  MESSAGE_REFERENCE_MISSING: 'The message does not reference another message.',

  SPLIT_MAX_LEN: 'Chunk exceeds the max length and contains no split characters.',

  BAN_RESOLVE_ID: (ban = false) => `Could not resolve the user ID to ${ban ? 'ban' : 'unban'}.`,
  FETCH_BAN_RESOLVE_ID: 'Could not resolve the user ID to fetch the ban.',
  PRUNE_DAYS_TYPE: 'Days must be a number.',

  GUILD_CHANNEL_RESOLVE: 'Could not resolve channel to a guild channel.',
  GUILD_VOICE_CHANNEL_RESOLVE: 'Could not resolve channel to a guild voice channel.',
  GUILD_CHANNEL_ORPHAN: 'Could not find a parent for this guild channel.',
  GUILD_CHANNEL_UNOWNED: "The fetched channel does not belong to this manager's guild.",
  GUILD_OWNED: 'Guild is owned by the client.',
  GUILD_MEMBERS_TIMEOUT: 'Members did not arrive in time.',
  GUILD_UNCACHED_ME: 'The client user as a member of this guild is uncached.',
  GUILD_UNCACHED_ROLE_RESOLVE: 'Cannot resolve roles from an arbitrary guild — provide an ID instead.',
  GUILD_SCHEDULED_EVENT_RESOLVE: 'Could not resolve the guild scheduled event.',
  GUILD_FORUM_MESSAGE_REQUIRED: 'You must provide a message to create a guild forum thread.',

  CHANNEL_NOT_CACHED: 'Could not find the channel where this message came from in the cache.',
  STAGE_CHANNEL_RESOLVE: 'Could not resolve channel to a stage channel.',

  THREAD_INVITABLE_TYPE: type => `Invitable cannot be edited on ${type}.`,

  USER_BANNER_NOT_FETCHED: "You must fetch this user's banner before generating its URL.",
  USER_NO_DM_CHANNEL: 'No DM channel exists for this user.',

  VOICE_NOT_STAGE_CHANNEL: 'You are only allowed to do this in stage channels.',
  VOICE_STATE_NOT_OWN: 'You cannot self-deafen/mute/request-to-speak on VoiceStates that do not belong to the ClientUser.',
  VOICE_STATE_INVALID_TYPE: name => `${name} must be a boolean.`,
  VOICE_STATE_UNCACHED_MEMBER: 'The member of this voice state is uncached.',
  VOICE_INVALID_HEARTBEAT: 'Tried to set voice heartbeat but no valid interval was specified.',
  VOICE_USER_MISSING: 'Could not resolve the user to create a stream.',
  VOICE_JOIN_CHANNEL: (full = false) =>
    `You do not have permission to join this voice channel${full ? ' — it is full.' : '.'}`,
  VOICE_CONNECTION_TIMEOUT: 'Voice connection not established within the timeout period.',
  VOICE_TOKEN_ABSENT: 'No token provided from voice server packet.',
  VOICE_SESSION_ABSENT: 'Session ID not supplied.',
  VOICE_INVALID_ENDPOINT: 'Invalid endpoint received from voice server.',
  VOICE_NO_BROWSER: 'Voice connections are not available in browser environments.',
  VOICE_CONNECTION_ATTEMPTS_EXCEEDED: attempts => `Too many connection attempts (${attempts}).`,
  VOICE_JOIN_SOCKET_CLOSED: 'Tried to send join packet but the WebSocket is not open.',
  VOICE_PLAY_INTERFACE_NO_BROADCAST: 'A broadcast cannot be played in this context.',
  VOICE_PLAY_INTERFACE_BAD_TYPE: 'Unknown stream type provided to the voice play interface.',
  VOICE_PRISM_DEMUXERS_NEED_STREAM: 'To play a webm/ogg stream, you need to pass a ReadableStream.',

  WEBHOOK_MESSAGE: 'The message was not sent by a webhook.',
  WEBHOOK_TOKEN_UNAVAILABLE: 'This action requires a webhook token, but none is available.',
  WEBHOOK_URL_INVALID: 'The provided webhook URL is not valid.',
  WEBHOOK_APPLICATION: 'This message webhook belongs to an application and cannot be fetched.',

  EMOJI_TYPE: 'Emoji must be a string or GuildEmoji/ReactionEmoji.',
  EMOJI_MANAGED: 'Emoji is managed and has no author.',
  MISSING_MANAGE_EMOJIS_AND_STICKERS_PERMISSION: guild =>
    `Client must have Manage Emojis and Stickers permission in guild ${guild} to see emoji authors.`,
  NOT_GUILD_STICKER: 'Sticker is a standard (non-guild) sticker and has no author.',

  REACTION_RESOLVE_USER: 'Could not resolve the user ID to remove from the reaction.',

  VANITY_URL: 'This guild does not have the VANITY_URL feature enabled.',

  DELETE_GROUP_DM_CHANNEL: "Bots don't have access to Group DM Channels and cannot delete them.",
  FETCH_GROUP_DM_CHANNEL: "Bots don't have access to Group DM Channels and cannot fetch them.",

  MEMBER_FETCH_NONCE_LENGTH: 'Nonce length must not exceed 32 characters.',

  INVALID_TYPE: (name, expected, an = false) =>
    `Supplied ${name} is not a${an ? 'n' : ''} ${expected}.`,
  INVALID_ELEMENT: (type, name, elem) =>
    `Supplied ${type} ${name} includes an invalid element: ${elem}.`,
  NOT_IMPLEMENTED: (what, name) => `Method ${what} is not implemented on ${name}.`,
  SWEEP_FILTER_RETURN: 'The return value of the sweepFilter function was not false or a Function.',

  UDP_SEND_FAIL: 'Tried to send a UDP packet but no socket is available.',
  UDP_ADDRESS_MALFORMED: 'Malformed UDP address or port.',
  UDP_CONNECTION_EXISTS: 'There is already an existing UDP connection.',
  UDP_WRONG_HANDSHAKE: 'Wrong handshake packet for UDP.',

  INVALID_VIDEO_CODEC: codecs => `Only these codecs are supported: ${codecs.join(', ')}.`,

  INVALID_USER_API: 'User accounts cannot use this endpoint.',
  INVALID_APPLICATION_COMMAND: id => `Could not find a valid application command with ID: ${id}.`,
  INVALID_COMMAND_NAME: allCMD =>
    `Could not parse sub-group command and sub-command (too long): ${allCMD.join(' ')}.`,
  INVALID_SLASH_COMMAND_CHOICES: (parentOptions, value) =>
    `"${value}" is not a valid choice for this option (valid: ${parentOptions}).`,
  SLASH_COMMAND_REQUIRED_OPTIONS_MISSING: (req, opt) =>
    `Required value "${req}" missing. Options: ${opt}.`,
  SLASH_COMMAND_SUB_COMMAND_GROUP_INVALID: n => `"${n}" is not a valid sub-command group.`,
  SLASH_COMMAND_SUB_COMMAND_INVALID: n => `"${n}" is not a valid sub-command.`,
  USER_NOT_STREAMING: 'The specified user is not currently streaming.',
  SELFBOT_UNEXPECTED_READY: 'Received READY before all guilds were loaded.',

  AUTOQUEST_ALREADY_RUNNING: 'An auto-quest is already running for this user.',
  AUTOQUEST_NOT_RUNNING: 'No auto-quest is currently running for this user.',
  AUTOQUEST_API_ERROR: (status, msg) => `Quest API returned ${status}: ${msg}.`,
  AUTOQUEST_UNSUPPORTED_TASK: type => `Quest task type "${type}" is not supported.`,
  AUTOQUEST_QUEST_NOT_FOUND: 'No eligible quests found for this account.',

  PROXY_EMPTY_POOL: 'ProxyManager pool is empty — add at least one proxy URL.',
  PROXY_INVALID_URL: url => `Invalid proxy URL: "${url}". Expected http/https/socks4/socks5.`,
  PROXY_AGENT_BUILD_FAILED: (url, reason) => `Failed to build agent for proxy "${url}": ${reason}.`,

  RATE_LIMIT_HIT: (route, ms) => `Rate limit hit on ${route} — retry in ${ms}ms.`,
  RATE_LIMIT_GLOBAL: ms => `Global rate limit hit — retry in ${ms}ms.`,

  REST_REQUEST_TIMEOUT: (method, path, ms) =>
    `REST request ${method} ${path} timed out after ${ms}ms.`,
  REST_NETWORK_ERROR: (method, path, msg) =>
    `REST network error on ${method} ${path}: ${msg}.`,
  REST_MAX_RETRIES: (method, path, n) =>
    `${method} ${path} failed after ${n} retries.`,

  // ─── V14 new codes (discord.js v14 parity) ───────────────────────────────────
  APPLICATION_COMMAND_OPTION_ALREADY_REGISTERED: name =>
    `Application command option "${name}" is already registered.`,
  APPLICATION_NOT_FOUND: id => `Application with ID ${id} could not be found.`,
  FORUM_MESSAGE: 'This action cannot be performed on forum channels.',
  MISSING_CHANNEL: 'Client is requesting data for a channel that is not in cache.',
  GUILD_WIDGET_FETCH_FAILED: 'Failed to fetch guild widget data.',
  COLLECTOR_DESTROYED: 'Collector has been destroyed.',
  AUTO_MODERATION_MISSING_RULE: 'Auto-moderation rule was not provided.',
  ONBOARDING_MISSING_PROMPT: 'Onboarding prompt is missing.',
  ONBOARDING_PROMPT_MISSING_OPTION: 'Onboarding prompt option is missing.',
};

// Register all codes
for (const [code, value] of Object.entries(Messages)) {
  register(code, value);
}
