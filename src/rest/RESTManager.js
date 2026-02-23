'use strict';

const { setInterval } = require('node:timers');
const { Collection } = require('@discordjs/collection');
const APIRequest = require('./APIRequest');
const routeBuilder = require('./APIRouter');
const RequestHandler = require('./RequestHandler');
const { Error } = require('../errors');
const { Endpoints } = require('../util/Constants');

class RESTManager {
  constructor(client) {
    this.client = client;

    /**
     * @type {Collection<string, RequestHandler>}
     */
    this.handlers = new Collection();

    this.versioned = true;

    this.globalLimit = client.options.restGlobalRateLimit > 0
      ? client.options.restGlobalRateLimit
      : Infinity;

    this.globalRemaining = this.globalLimit;
    this.globalReset = null;
    this.globalDelay = null;

    if (client.options.restSweepInterval > 0) {
      this.sweepInterval = setInterval(() => {
        const before = this.handlers.size;
        this.handlers.sweep(handler => handler._inactive);
        const removed = before - this.handlers.size;
        if (removed > 0) {
          client.emit('debug', `[REST] Swept ${removed} inactive rate-limit handler(s).`);
        }
      }, client.options.restSweepInterval * 1_000).unref();
    }
  }

  get api() {
    return routeBuilder(this);
  }

  getAuth() {
    const token = this.client.token ?? this.client.accessToken;
    if (token) return token.replace(/^Bot\s*/i, '');
    throw new Error('TOKEN_MISSING');
  }

  get cdn() {
    return Endpoints.CDN(this.client.options.http.cdn);
  }

  async request(method, url, options = {}) {
    if (this.client.options.restStealthJitter) {
      const delay = Math.floor(Math.random() * 150) + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const apiRequest = new APIRequest(this, method, url, options);
    let handler = this.handlers.get(apiRequest.route);

    if (!handler) {
      handler = new RequestHandler(this);
      this.handlers.set(apiRequest.route, handler);
    }

    this.client.emit('debug', `[REST] Queuing request to ${apiRequest.route}`);
    return handler.push(apiRequest);
  }

  get endpoint() {
    return this.client.options.http.api;
  }

  set endpoint(endpoint) {
    this.client.options.http.api = endpoint;
  }

  destroy() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.handlers.clear();
  }
}

module.exports = RESTManager;
