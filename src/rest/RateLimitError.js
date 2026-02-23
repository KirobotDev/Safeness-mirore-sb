'use strict';

/**
 * Represents a Discord API rate limit that was exceeded.
 * Thrown when `throwOnRateLimit` is enabled in client options
 * instead of automatically waiting.
 *
 * @extends Error
 */
class RateLimitError extends Error {
  /**
   * @param {Object}  data
   * @param {number}  data.timeout  Milliseconds until this rate limit resets
   * @param {number}  data.limit    Max requests allowed in this window
   * @param {string}  data.method   HTTP method (GET, POST…)
   * @param {string}  data.path     Full request path
   * @param {string}  data.route    Bucket route key (may differ from path for major param routes)
   * @param {boolean} data.global   Whether this is a global rate limit
   * @param {string}  [data.bucket] The x-ratelimit-bucket header value, if known
   */
  constructor({ timeout, limit, method, path, route, global: isGlobal, bucket = null }) {
    super(
      `A ${isGlobal ? 'global ' : ''}rate limit was hit on route ${route} ` +
      `(${method} ${path}) — retry in ${timeout}ms`,
    );

    /**
     * @type {string}
     */
    this.name = 'RateLimitError';

    /**
     * Milliseconds until the rate limit window resets.
     * @type {number}
     */
    this.timeout = timeout;

    /**
     * The maximum number of requests allowed in this window.
     * @type {number}
     */
    this.limit = limit;

    /**
     * The HTTP method used for the rate-limited request.
     * @type {string}
     */
    this.method = method;

    /**
     * The request path (e.g. `/channels/123/messages`).
     * @type {string}
     */
    this.path = path;

    /**
     * The bucket route key used for rate-limit tracking.
     * @type {string}
     */
    this.route = route;

    /**
     * Whether this rate limit is a global rate limit.
     * @type {boolean}
     */
    this.global = isGlobal;

    /**
     * The `x-ratelimit-bucket` header value, if available.
     * Useful for debugging which bucket triggered the error.
     * @type {string|null}
     */
    this.bucket = bucket;

    if (Error.captureStackTrace) Error.captureStackTrace(this, RateLimitError);
  }
}

module.exports = RateLimitError;
