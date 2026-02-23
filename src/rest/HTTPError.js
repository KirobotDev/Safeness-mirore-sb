'use strict';

/**
 * Represents a non-2xx HTTP response from the Discord API that is NOT
 * a Discord structured API error (those use {@link DiscordAPIError}).
 *
 * Thrown for network-level errors such as 5xx server faults or timeouts
 * that return a non-JSON body.
 *
 * @extends Error
 */
class HTTPError extends Error {
  /**
   * @param {string}  message  Human-readable description
   * @param {string}  name     The error class name (e.g. 'AbortError', 'FetchError')
   * @param {number}  code     The HTTP status code (e.g. 500, 503)
   * @param {APIRequest} request The request that triggered this error
   */
  constructor(message, name, code, request) {
    super(message);

    /**
     * The descriptive name for this error.
     * @type {string}
     */
    this.name = `HTTPError [${name ?? 'UnknownError'}]`;

    /**
     * The HTTP status code.
     * @type {number}
     */
    this.code = typeof code === 'number' ? code : 500;

    /**
     * The HTTP method of the request (GET, POST, PATCH…).
     * @type {string}
     */
    this.method = request.method;

    /**
     * The path of the request relative to the API base.
     * @type {string}
     */
    this.path = request.path;

    /**
     * The number of times this request was retried before failing.
     * @type {number}
     */
    this.retries = request.retries ?? 0;

    /**
     * @typedef {Object} HTTPErrorData
     * @property {*}                 json    The JSON body that was sent, if any
     * @property {Object[]}          files   File attachments that were sent, if any
     * @property {Record<string,*>}  headers The request headers (may contain token — handle with care)
     */

    /**
     * The data that was associated with the request.
     * @type {HTTPErrorData}
     */
    this.requestData = {
      json: request.options?.data ?? null,
      files: request.options?.files ?? [],
      headers: request.options?.headers ?? {},
    };

    // Clean up the stack trace — remove internal frames
    if (Error.captureStackTrace) Error.captureStackTrace(this, HTTPError);
  }
}

module.exports = HTTPError;
