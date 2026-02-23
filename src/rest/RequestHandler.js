'use strict';

const { setTimeout } = require('node:timers');
const { setTimeout: sleep } = require('node:timers/promises');
const DiscordAPIError = require('./DiscordAPIError');
const HTTPError = require('./HTTPError');
const RateLimitError = require('./RateLimitError');
const {
  Events: { DEBUG, RATE_LIMIT, INVALID_REQUEST_WARNING, API_RESPONSE, API_REQUEST },
} = require('../util/Constants');


const MAX_JITTER_MS = 400;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;
const REACTION_RESET_EXTRA = 250;
// Hard cap to prevent infinite recursion on persistent server errors
const MAX_SERVER_ERROR_RETRIES = 10;

const captchaMessages = [
  'incorrect-captcha',
  'response-already-used',
  'captcha-required',
  'invalid-input-response',
  'invalid-response',
  'You need to update your app',
  'response-already-used-error',
  'rqkey-mismatch',
  'sitekey-secret-mismatch',
];


function parseResponse(res) {
  if (res.headers.get('content-type')?.startsWith('application/json')) return res.json();
  return res.arrayBuffer();
}

function getAPIOffset(serverDate) {
  return new Date(serverDate).getTime() - Date.now();
}

function calculateReset(reset, resetAfter, serverDate) {
  if (resetAfter) return Date.now() + Number(resetAfter) * 1_000;
  return new Date(Number(reset) * 1_000).getTime() - getAPIOffset(serverDate);
}

function jitter() {
  return Math.floor(Math.random() * MAX_JITTER_MS);
}

function exponentialBackoff(attempt) {
  const base = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  return base + jitter();
}


let invalidCount = 0;
let invalidCountResetTime = null;


class PriorityAsyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  get remaining() {
    return this.queue.length;
  }

  wait(priority = 0) {
    return new Promise(resolve => {
      this.queue.push({ resolve, priority });
      this.queue.sort((a, b) => b.priority - a.priority); // High priority first
      this._process();
    });
  }

  shift() {
    this.processing = false;
    this._process();
  }

  _process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const { resolve } = this.queue.shift();
    resolve();
  }
}

class RequestHandler {
  constructor(manager) {
    this.manager = manager;
    this.queue = new PriorityAsyncQueue();

    this.reset = -1;
    this.remaining = -1;
    this.limit = -1;

    this._serverErrorRetries = 0;
  }


  /**
   * Pushes a request to the queue.
   * @param {APIRequest} request The request to push
   * @returns {Promise<any>}
   */
  async push(request) {
    const priority = request.options.priority || 0;
    await this.queue.wait(priority);

    
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      const minDelay = this.manager.client.options.antiSpamDelay;
      const now = Date.now();
      const elapsed = now - (this.manager.lastRequestTime || 0);
      if (elapsed < minDelay) {
        const wait = minDelay - elapsed + Math.floor(Math.random() * 500);
        this.manager.client.emit(DEBUG, `[REST] Anti-Spam Guard: Waiting ${wait}ms before ${request.method} ${request.path}`);
        await sleep(wait);
      }
    }

    try {
      const res = await this.execute(request);
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
        this.manager.lastRequestTime = Date.now();
      }
      return res;
    } finally {
      this.queue.shift();
    }
  }


  get globalLimited() {
    return this.manager.globalRemaining <= 0 && Date.now() < this.manager.globalReset;
  }

  get localLimited() {
    return this.remaining <= 0 && Date.now() < this.reset;
  }

  get limited() {
    return this.globalLimited || this.localLimited;
  }

  get _inactive() {
    return this.queue.remaining === 0 && !this.limited;
  }


  globalDelayFor(ms) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.manager.globalDelay = null;
        resolve();
      }, ms).unref();
    });
  }

  /**
   * Waits for the rate limit to expire.
   * @param {APIRequest} request The request to wait for
   * @private
   */
  async _waitForRateLimit(request) {
    while (this.limited) {
      const isGlobal = this.globalLimited;
      let limit, timeout, delayPromise;

      if (isGlobal) {
        limit = this.manager.globalLimit;
        timeout = this.manager.globalReset + this.manager.client.options.restTimeOffset - Date.now();
      } else {
        limit = this.limit;
        timeout = this.reset + this.manager.client.options.restTimeOffset - Date.now();
      }

      const waitMs = Math.max(0, timeout) + jitter();

      if (this.manager.client.listenerCount(RATE_LIMIT)) {
        this.manager.client.emit(RATE_LIMIT, {
          timeout: waitMs,
          limit,
          method: request.method,
          path: request.path,
          route: request.route,
          global: isGlobal,
        });
      }

      if (isGlobal) {
        // Reuse existing global delay promise if active
        this.manager.globalDelay ??= this.globalDelayFor(waitMs);
        delayPromise = this.manager.globalDelay;
      } else {
        delayPromise = sleep(waitMs);
      }

      await this.onRateLimit(request, limit, waitMs, isGlobal);
      await delayPromise;
    }
  }

  /**
   * Emits a rate limit event and checks if the request should be rejected.
   * @param {APIRequest} request The request that triggered the rate limit
   * @param {number} limit The rate limit
   * @param {number} timeout The timeout in milliseconds
   * @param {boolean} isGlobal Whether the rate limit is global
   * @private
   */
  async onRateLimit(request, limit, timeout, isGlobal) {
    const { options } = this.manager.client;
    if (!options.rejectOnRateLimit) return;

    const rateLimitData = {
      timeout,
      limit,
      method: request.method,
      path: request.path,
      route: request.route,
      global: isGlobal,
    };
    const shouldThrow =
      typeof options.rejectOnRateLimit === 'function'
        ? await options.rejectOnRateLimit(rateLimitData)
        : options.rejectOnRateLimit.some(route => rateLimitData.route.startsWith(route.toLowerCase()));
    if (shouldThrow) {
      throw new RateLimitError(rateLimitData);
    }
  }


  /**
   * Executes a request.
   * @param {APIRequest} request The request to execute
   * @param {?string} [captchaKey] The captcha key
   * @param {?string} [captchaToken] The captcha token
   * @returns {Promise<any>}
   * @private
   */
  async execute(request, captchaKey, captchaToken) {
    await this._waitForRateLimit(request);

    if (!this.manager.globalReset || this.manager.globalReset < Date.now()) {
      this.manager.globalReset = Date.now() + 1_000;
      this.manager.globalRemaining = this.manager.globalLimit;
    }
    this.manager.globalRemaining--;

    if (this.manager.client.listenerCount(API_REQUEST)) {
      this.manager.client.emit(API_REQUEST, {
        method: request.method,
        path: request.path,
        route: request.route,
        options: request.options,
        retries: request.retries,
      });
    }

    let res;
    try {
      res = await request.make(captchaKey, captchaToken);
    } catch (error) {
      if (request.retries >= this.manager.client.options.retryLimit) {
        throw new HTTPError(error.message, error.constructor.name, error.status, request);
      }
      const backoff = exponentialBackoff(request.retries);
      this.manager.client.emit(
        DEBUG,
        `[REST] Network error on ${request.method} ${request.path} — retry ${request.retries + 1} in ${backoff}ms`,
      );
      await sleep(backoff);
      request.retries++;
      return this.execute(request);
    }

    if (this.manager.client.listenerCount(API_RESPONSE)) {
      this.manager.client.emit(
        API_RESPONSE,
        {
          method: request.method,
          path: request.path,
          route: request.route,
          options: request.options,
          retries: request.retries,
        },
        res.clone(),
      );
    }

    let sublimitTimeout;
    if (res.headers) {
      const serverDate = res.headers.get('date');
      const limit = res.headers.get('x-ratelimit-limit');
      const remaining = res.headers.get('x-ratelimit-remaining');
      const reset = res.headers.get('x-ratelimit-reset');
      const resetAfter = res.headers.get('x-ratelimit-reset-after');
      const bucket = res.headers.get('x-ratelimit-bucket');

      this.limit = limit ? Number(limit) : Infinity;
      this.remaining = remaining ? Number(remaining) : 1;
      this.reset = reset || resetAfter ? calculateReset(reset, resetAfter, serverDate) : Date.now();

      if (bucket) this._bucket = bucket;

      if (!resetAfter && request.route.includes('reactions')) {
        this.reset = new Date(serverDate).getTime() - getAPIOffset(serverDate) + REACTION_RESET_EXTRA;
      }

      let retryAfter = res.headers.get('retry-after');
      retryAfter = retryAfter ? Number(retryAfter) * 1_000 : -1;

      if (retryAfter > 0) {
        if (res.headers.get('x-ratelimit-global')) {
          this.manager.globalRemaining = 0;
          this.manager.globalReset = Date.now() + retryAfter;
          this.manager.client.emit(
            DEBUG,
            `[REST] Global rate limit hit — waiting ${retryAfter}ms`,
          );
        } else if (!this.localLimited) {
          sublimitTimeout = retryAfter + jitter();
        }
      }
    }

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (!invalidCountResetTime || invalidCountResetTime < Date.now()) {
        invalidCountResetTime = Date.now() + 1_000 * 60 * 10;
        invalidCount = 0;
      }
      invalidCount++;

      const warnInterval = this.manager.client.options.invalidRequestWarningInterval;
      if (
        this.manager.client.listenerCount(INVALID_REQUEST_WARNING) &&
        warnInterval > 0 &&
        invalidCount % warnInterval === 0
      ) {
        this.manager.client.emit(INVALID_REQUEST_WARNING, {
          count: invalidCount,
          remainingTime: invalidCountResetTime - Date.now(),
        });
      }
    }

    if (res.ok) {
      this._serverErrorRetries = 0; // reset on every success
      return parseResponse(res);
    }

    if (res.status >= 400 && res.status < 500) {

      if (res.status === 429) {
        const isGlobal = this.globalLimited;
        let limit, timeout;

        if (isGlobal) {
          limit = this.manager.globalLimit;
          timeout = this.manager.globalReset + this.manager.client.options.restTimeOffset - Date.now();
        } else {
          limit = this.limit;
          timeout = this.reset + this.manager.client.options.restTimeOffset - Date.now();
        }

        const waitMs = Math.max(0, timeout) + jitter();

        this.manager.client.emit(
          DEBUG,
          `[REST] 429 on ${request.method} ${request.path}` +
          ` | global=${isGlobal} | limit=${limit} | wait=${waitMs}ms` +
          (sublimitTimeout ? ` | sublimit=${sublimitTimeout}ms` : ''),
        );

        await this.onRateLimit(request, limit, waitMs, isGlobal);

        if (sublimitTimeout) {
          await sleep(sublimitTimeout);
        }
        return this.execute(request, captchaKey, captchaToken);
      }

      let data;
      try {
        data = await parseResponse(res);

        if (
          data?.captcha_service &&
          typeof this.manager.client.options.captchaSolver === 'function' &&
          request.retries < this.manager.client.options.captchaRetryLimit &&
          captchaMessages.some(s => data.captcha_key?.[0]?.includes(s))
        ) {
          this.manager.client.emit(
            DEBUG,
            `[REST] Captcha on ${request.method} ${request.path} (${data.captcha_key.join(', ')})`,
          );
          const captcha = await this.manager.client.options.captchaSolver(data, request.fullUserAgent);
          request.retries++;
          return this.execute(request, captcha, data.captcha_rqtoken);
        }

        if (data?.code === 60003 && request.options.mfaCode && request.retries < 1) {
          this.manager.client.emit(
            DEBUG,
            `[REST] MFA required on ${request.method} ${request.path}`,
          );
          const mfaData = data.mfa;
          const mfaPost = await this.manager.client.api.mfa.finish.post({
            data: { ticket: mfaData.ticket, data: request.options.mfaCode, mfa_type: 'totp' },
          });
          request.options.mfaToken = mfaPost.token;
          request.retries++;
          return this.execute(request);
        }
      } catch (err) {
        throw new HTTPError(err.message, err.constructor.name, err.status, request);
      }

      throw new DiscordAPIError(data, res.status, request);
    }

    if (res.status >= 500 && res.status < 600) {
      if (
        request.retries >= this.manager.client.options.retryLimit ||
        this._serverErrorRetries >= MAX_SERVER_ERROR_RETRIES
      ) {
        throw new HTTPError(res.statusText, res.constructor.name, res.status, request);
      }

      const backoff = exponentialBackoff(this._serverErrorRetries);
      this.manager.client.emit(
        DEBUG,
        `[REST] ${res.status} server error on ${request.method} ${request.path}` +
        ` — retry ${request.retries + 1}/${this.manager.client.options.retryLimit} in ${backoff}ms`,
      );

      await sleep(backoff);
      request.retries++;
      this._serverErrorRetries++;
      return this.execute(request, captchaKey, captchaToken);
    }

    return null;
  }
}

module.exports = RequestHandler;

/**
 * @external HTTPMethod
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
 */

/**
 * @external Response
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response}
 */
