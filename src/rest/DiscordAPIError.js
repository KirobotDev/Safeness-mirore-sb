'use strict';

/**
 * Represents a structured error response from the Discord API (JSON body).
 *
 * Discord wraps errors in a structured format with optional nested `.errors`
 * objects. This class flattens them into a readable message.
 *
 * @extends Error
 * @see {@link https://discord.com/developers/docs/reference#error-messages}
 */
class DiscordAPIError extends Error {
  /**
   * @param {Object}     error   Parsed JSON error body from Discord
   * @param {number}     status  HTTP status code
   * @param {APIRequest} request The request that caused this error
   */
  constructor(error, status, request) {
    // Flatten nested field errors into readable lines
    const flattened = DiscordAPIError.flattenErrors(error.errors ?? {}).join('\n');
    const base = error.message ?? flattened;
    super(base && flattened && base !== flattened ? `${base}\n${flattened}` : base || flattened || 'Unknown API Error');

    /** @type {string} */
    this.name = 'DiscordAPIError';

    /**
     * The HTTP method used for the request.
     * @type {string}
     */
    this.method = request.method;

    /**
     * The request path relative to the API base URL.
     * @type {string}
     */
    this.path = request.path;

    /**
     * The Discord-internal API error code (not the HTTP status).
     * @type {number|null}
     */
    this.code = error.code ?? null;

    /**
     * The HTTP status code returned by Discord.
     * @type {number}
     */
    this.httpStatus = status;

    /**
     * The number of times this request was retried before this error.
     * @type {number}
     */
    this.retries = request.retries ?? 0;

    /**
     * @typedef {Object} DiscordAPIErrorRequestData
     * @property {*}            json    The JSON body of the request
     * @property {Object[]}     files   File attachments (if any)
     * @property {Object}       headers The request headers
     */

    /**
     * The data associated with the request that caused this error.
     * @type {DiscordAPIErrorRequestData}
     */
    this.requestData = {
      json: request.options?.data ?? null,
      files: request.options?.files ?? [],
      headers: request.options?.headers ?? {},
    };

    /**
     * @typedef {Object} CaptchaData
     * @property {string[]}   captcha_key     Error key array (e.g. `['incorrect-captcha']`)
     * @property {string}     captcha_sitekey HCaptcha site key
     * @property {string}     captcha_service `'hcaptcha'`
     * @property {string}     [captcha_rqdata]
     * @property {string}     [captcha_rqtoken]
     */

    /**
     * Captcha challenge data if Discord returned a captcha requirement.
     * @type {CaptchaData|null}
     */
    this.captcha = error.captcha_service ? error : null;

    if (Error.captureStackTrace) Error.captureStackTrace(this, DiscordAPIError);
  }

  /**
   * Recursively flatten a Discord `.errors` object into an array of strings.
   *
   * Discord nests errors like:
   * ```json
   * { "content": { "_errors": [{ "message": "Too long" }] } }
   * ```
   * This turns them into `["content: Too long"]`.
   *
   * @param {Object} obj   The errors (sub-)object to flatten
   * @param {string} [key] Internal prefix for nested keys
   * @returns {string[]}
   */
  static flattenErrors(obj, key = '') {
    if (!obj || typeof obj !== 'object') return [];

    const messages = [];

    for (const [k, v] of Object.entries(obj)) {
      if (k === 'message' || k === 'code') continue;

      const prefix = key
        ? (isNaN(k) ? `${key}.${k}` : `${key}[${k}]`)
        : k;

      if (Array.isArray(v?._errors)) {
        // Leaf node with _errors array
        messages.push(`${prefix}: ${v._errors.map(e => e.message).join(' ')}`);
      } else if (v?.code != null || v?.message != null) {
        // Single error object
        messages.push(`${v.code ? `${v.code}: ` : ''}${v.message ?? ''}`.trim());
      } else if (typeof v === 'string') {
        messages.push(v);
      } else if (v && typeof v === 'object') {
        messages.push(...DiscordAPIError.flattenErrors(v, prefix));
      }
    }

    return messages;
  }
}

module.exports = DiscordAPIError;
