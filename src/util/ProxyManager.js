'use strict';

/**
 * Manages a rotating pool of HTTP / HTTPS / SOCKS4 / SOCKS5 proxy agents
 * for use with the Discord selfbot REST and WebSocket layers.
 *
 * @example
 * const { ProxyManager } = require('safeness-mirore-sb');
 *
 * const proxies = new ProxyManager([
 *   'http://user:pass@1.2.3.4:8080',
 *   'https://5.6.7.8:443',
 *   'socks5://user:pass@9.10.11.12:1080',
 * ], { mode: 'round-robin' });
 *
 * // Apply a proxy to the client before login
 * proxies.applyToClient(client);
 * await client.login(token);
 *
 * // Rotate to the next proxy (e.g. after a ban)
 * proxies.rotateProxy(client);
 */
class ProxyManager {
    /**
     * @param {string[]} proxyList  List of proxy URLs
     * @param {Object}   [opts={}]
     * @param {'round-robin'|'random'} [opts.mode='round-robin']  Selection strategy
     */
    constructor(proxyList = [], { mode = 'round-robin' } = {}) {
        if (!Array.isArray(proxyList)) {
            throw new TypeError('[ProxyManager] proxyList must be an Array of proxy URL strings.');
        }

        /**
         * The proxy URL pool.
         * @type {string[]}
         */
        this.proxies = proxyList.map(p => p.trim()).filter(Boolean);

        /**
         * Selection mode: 'round-robin' (default) or 'random'.
         * @type {'round-robin'|'random'}
         */
        this.mode = mode;

        /** @private Round-robin cursor */
        this._cursor = 0;

        /**
         * Agent cache — prevents re-creating agents for the same URL.
         * @private
         * @type {Map<string, import('https').Agent>}
         */
        this._cache = new Map();
    }


    /**
     * Build (or return cached) an HTTPS-compatible agent for the given proxy URL.
     * @param {string} proxyUrl
     * @returns {import('https').Agent}
     */
    buildAgent(proxyUrl) {
        if (this._cache.has(proxyUrl)) return this._cache.get(proxyUrl);

        let agent;
        const parsed = new URL(proxyUrl);

        if (parsed.protocol === 'socks4:' || parsed.protocol === 'socks5:') {
            let SocksProxyAgent;
            try {
                ({ SocksProxyAgent } = require('socks-proxy-agent'));
            } catch {
                throw new Error('[ProxyManager] socks-proxy-agent is not installed. Run: npm install socks-proxy-agent');
            }
            agent = new SocksProxyAgent(proxyUrl);
        } else {
            // http:// or https://
            let HttpsProxyAgent;
            try {
                ({ HttpsProxyAgent } = require('https-proxy-agent'));
            } catch {
                throw new Error('[ProxyManager] https-proxy-agent is not installed. Run: npm install https-proxy-agent');
            }
            agent = new HttpsProxyAgent(proxyUrl);
        }

        this._cache.set(proxyUrl, agent);
        return agent;
    }


    /**
     * Pick the next proxy URL from the pool.
     * @returns {string|null} The proxy URL, or null if the pool is empty.
     */
    nextProxyUrl() {
        if (this.proxies.length === 0) return null;

        if (this.mode === 'random') {
            return this.proxies[Math.floor(Math.random() * this.proxies.length)];
        }

        // round-robin
        const url = this.proxies[this._cursor % this.proxies.length];
        this._cursor++;
        return url;
    }

    /**
     * Get a built HTTPS agent for the next proxy in rotation.
     * @returns {import('https').Agent|null}
     */
    getAgent() {
        const url = this.nextProxyUrl();
        return url ? this.buildAgent(url) : null;
    }


    /**
     * Apply a proxy agent to a selfbot Client's HTTP and WS options.
     * Must be called **before** `client.login()`.
     *
     * @param {import('../client/Client')} client
     * @returns {string|null} The proxy URL that was applied, or null if pool is empty.
     */
    applyToClient(client) {
        if (this.proxies.length === 0) return null;

        const url = this.nextProxyUrl();
        const agent = this.buildAgent(url);

        // REST requests
        client.options.http.agent = agent;
        // WebSocket connections
        client.options.ws.agent = agent;

        client.emit?.('debug', `[ProxyManager] Applied proxy: ${this._redact(url)} (pool=${this.proxies.length}, mode=${this.mode})`);
        return url;
    }

    /**
     * Discard the current proxy's cached agent and apply the next one.
     * Call this when a proxy gets 429'd or blocked.
     *
     * @param {import('../client/Client')} client
     * @returns {string|null} The new proxy URL, or null if pool is empty.
     */
    rotateProxy(client) {
        const current = this.proxies[(this._cursor - 1) % this.proxies.length];
        if (current) this._cache.delete(current);

        return this.applyToClient(client);
    }


    /**
     * Add one or more proxy URLs to the pool.
     * @param {...string} urls
     * @returns {this}
     */
    add(...urls) {
        for (const url of urls) {
            const trimmed = url?.trim();
            if (trimmed && !this.proxies.includes(trimmed)) {
                this.proxies.push(trimmed);
            }
        }
        return this;
    }

    /**
     * Remove a proxy URL from the pool and clear its cached agent.
     * @param {string} url
     * @returns {this}
     */
    remove(url) {
        const trimmed = url?.trim();
        this.proxies = this.proxies.filter(p => p !== trimmed);
        this._cache.delete(trimmed);
        return this;
    }

    /**
     * Clear all proxies and cached agents.
     * @returns {this}
     */
    clear() {
        this.proxies = [];
        this._cache.clear();
        this._cursor = 0;
        return this;
    }

    /**
     * The number of proxies in the pool.
     * @type {number}
     */
    get size() {
        return this.proxies.length;
    }


    /** Redact password from a proxy URL for debug logging. @private */
    _redact(url) {
        try {
            const u = new URL(url);
            if (u.password) u.password = '***';
            return u.toString();
        } catch {
            return url;
        }
    }
}

module.exports = ProxyManager;
