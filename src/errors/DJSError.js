'use strict';

/**
 * discord.js V14-style error system for selfbot packages.
 *
 * Mirrors the architecture used in discord.js v14:
 *  - Enum-like `ErrorCodes` object (string keys) replaces the `Messages` map
 *  - Each error class is exported directly for instanceof checks
 *  - A `makeDiscordError` factory builds typed errors from the registry
 *
 * @module DJSError
 */


/** @type {symbol} */
const kCode = Symbol('code');

/** @type {Map<string, string|Function>} */
const registry = new Map();


/**
 * Create a discord.js V14-style Error subclass.
 *
 * Each instance has:
 *  - `.code`  — the registered error key (e.g. `'TOKEN_INVALID'`)
 *  - `.name`  — `'<ClassName> [CODE]'`  (e.g. `'Error [TOKEN_INVALID]'`)
 *
 * @template {new (...args: any[]) => Error} T
 * @param {T} Base
 * @returns {T}
 */
function makeDiscordError(Base) {
  return class DiscordError extends Base {
    /**
     * @param {string} code  One of the registered {@link ErrorCodes}
     * @param {...any}  args Interpolation args (passed to function templates)
     */
    constructor(code, ...args) {
      super(resolveMessage(code, args));
      this[kCode] = code;
      if (Error.captureStackTrace) Error.captureStackTrace(this, DiscordError);
    }

    /** @type {string} */
    get name() {
      return `${super.name} [${this[kCode]}]`;
    }

    /**
     * The registered error code.
     * @type {string}
     */
    get code() {
      return this[kCode];
    }
  };
}


/**
 * Resolve a registered error message to a string.
 * @param {string}   code
 * @param {Array<*>} args
 * @returns {string}
 */
function resolveMessage(code, args) {
  if (typeof code !== 'string') throw new TypeError('Error code must be a string.');
  const msg = registry.get(code);
  if (msg === undefined) {
    throw new RangeError(`Unregistered error code: "${code}". Did you forget to register it in Messages.js?`);
  }
  if (typeof msg === 'function') return msg(...args);
  // Simple %s substitution
  if (args.length > 0) {
    return msg.replace(/%s/g, () => String(args.shift() ?? ''));
  }
  return msg;
}


/**
 * Register an error code.
 * @param {string}          code  SCREAMING_SNAKE_CASE identifier
 * @param {string|Function} value String or `(...args) => string` template
 */
function register(code, value) {
  if (typeof code !== 'string' || !code) throw new TypeError('Error code must be a non-empty string.');
  registry.set(code, typeof value === 'function' ? value : String(value));
}


const DiscordError = makeDiscordError(Error);
const DiscordTypeError = makeDiscordError(TypeError);
const DiscordRangeError = makeDiscordError(RangeError);


module.exports = {
  register,
  resolveMessage,
  makeDiscordError,

  DiscordError,
  DiscordTypeError,
  DiscordRangeError,

  Error: DiscordError,
  TypeError: DiscordTypeError,
  RangeError: DiscordRangeError,
};
