'use strict';

const EventEmitter = require('node:events');
const process = require('node:process');
const RESTManager = require('../rest/RESTManager');
const Options = require('../util/Options');
const Util = require('../util/Util');

/**
 * The base class for all clients.
 * @extends {EventEmitter}
 */
class BaseClient extends EventEmitter {
  /**
   * @param {ClientOptions} [options={}]
   */
  constructor(options = {}) {
    super({ captureRejections: true });

    if (typeof options !== 'object' || options === null) {
      throw new TypeError('Client options must be an object.');
    }

    if (options.intents !== undefined) {
      process.emitWarning(
        'The `intents` option is not supported by selfbot clients and will be ignored.',
        'DeprecationWarning',
      );
    }

    /**
     * The merged options this client was instantiated with.
     * @type {ClientOptions}
     */
    this.options = Util.mergeDefault(Options.createDefault(), options);

    /**
     * The REST manager that handles API requests.
     * @type {RESTManager}
     * @private
     */
    this.rest = new RESTManager(this);
  }


  /**
   * Shortcut to the API route builder.
   * @type {Object}
   * @readonly
   * @private
   */
  get api() {
    return this.rest.api;
  }

  /**
   * Destroy all resources used by this client:
   * clears the REST sweep interval and destroys all rate-limit handlers.
   * @returns {void}
   */
  destroy() {
    // Delegate to RESTManager.destroy() which clears handlers + sweep timer
    this.rest.destroy();
  }

  /**
   * Increments max listeners by one (used internally for collectors).
   * Skips when set to unlimited (0).
   * @private
   */
  incrementMaxListeners() {
    const max = this.getMaxListeners();
    if (max !== 0) this.setMaxListeners(max + 1);
  }

  /**
   * Decrements max listeners by one (used internally for collectors).
   * Skips when set to unlimited (0) and guards against going below 0.
   * @private
   */
  decrementMaxListeners() {
    const max = this.getMaxListeners();
    if (max !== 0 && max > 1) this.setMaxListeners(max - 1);
  }


  toJSON(...props) {
    return Util.flatten(this, { domain: false }, ...props);
  }
}

module.exports = BaseClient;

/**
 * Emitted for general debugging information.
 * @event BaseClient#debug
 * @param {string} info The debug information
 */

/**
 * Emitted when a client error occurs.
 * @event BaseClient#error
 * @param {Error} error The error
 */
