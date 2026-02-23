'use strict';

const Buffer = require('node:buffer').Buffer;
const https = require('node:https');
const { setTimeout } = require('node:timers');
const makeFetchCookie = require('fetch-cookie');
const FormData = require('form-data');
const fetchOriginal = require('node-fetch');
const { CookieJar } = require('tough-cookie');
const { ciphers } = require('../util/Constants');
const Util = require('../util/Util');


const cookieJar = new CookieJar();
const fetch = makeFetchCookie(fetchOriginal, cookieJar);

function randomiseChromeUA(ua) {
  const match = ua.match(/(Chrome\/\d+\.\d+\.)(\d+\.\d+)/);
  if (!match) return ua;
  const patch = Math.floor(Math.random() * 9000) + 1000;
  return ua.replace(match[0], `${match[1]}0.${patch}`);
}

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-US,en;q=0.8',
  'en-GB,en;q=0.9',
  'fr-FR,fr;q=0.9,en;q=0.8',
];

const CONTEXT_MAP = [
  { pattern: /^\/users\/@me\/relationships/, location: 'Friends' },
  { pattern: /^\/users\/\d+\/profile/, location: 'User Profile' },
  { pattern: /^\/guilds\/\d+\/search/, location: 'Search' },
  { pattern: /^\/channels\/\d+\/messages$/, location: 'Notifications' },
  { pattern: /^\/users\/@me\/settings/, location: 'Settings' },
  { pattern: /^\/roles\/member-verification\/plus/, location: 'Member Verification' },
];

class APIRequest {
  constructor(rest, method, path, options) {
    this.rest = rest;
    this.client = rest.client;
    this.method = method;
    this.route = options.route;
    this.options = options;
    this.retries = 0;

    this.fullUserAgent = randomiseChromeUA(
      this.client.options.http.headers['User-Agent'] ?? 'Mozilla/5.0',
    );

    // Don't pollute client.options — keep the UA local to this request only
    let queryString = '';
    if (options.query) {
      const query = Object.entries(options.query)
        .filter(([, value]) => value !== null && typeof value !== 'undefined')
        .flatMap(([key, value]) => (Array.isArray(value) ? value.map(v => [key, v]) : [[key, value]]));
      queryString = new URLSearchParams(query).toString();
    }
    this.path = `${path}${queryString && `?${queryString}`}`;
  }

  make(captchaKey, captchaRqToken) {
    if (!this._agent) {
      if (Util.verifyProxyAgent(this.client.options.http.agent)) {
        const pa = this.client.options.http.agent;
        // Harden the inner HTTPS sub-agent if accessible
        const httpsAgent = pa.httpsAgent ?? pa;
        Object.assign(httpsAgent, {
          keepAlive: true,
          honorCipherOrder: true,
          secureProtocol: 'TLSv1_2_method',
          ciphers: ciphers.join(':'),
        });
        this._agent = pa;
      } else {
        this._agent = new https.Agent({
          ...this.client.options.http.agent,
          keepAlive: true,
          honorCipherOrder: true,
          secureProtocol: 'TLSv1_2_method',
          ciphers: ciphers.join(':'),
        });
      }
    }

    const API =
      this.options.versioned === false
        ? this.client.options.http.api
        : `${this.client.options.http.api}/v${this.client.options.http.version}`;
    const url = API + this.path;

    const acceptLanguage = ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];

    let headers = {
      authority: 'discord.com',
      accept: '*/*',
      'accept-language': acceptLanguage,
      'sec-ch-ua': `"Not?A_Brand";v="8", "Chromium";v="${this._chromeMajor()}", "Google Chrome";v="${this._chromeMajor()}"`,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-debug-options': 'bugReporterEnabled',
      'x-discord-locale': this._discordLocale(acceptLanguage),
      'x-discord-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      'x-super-properties': Buffer.from(
        JSON.stringify(this.client.options.ws.properties),
        'ascii',
      ).toString('base64'),
      Referer: 'https://discord.com/channels/@me',
      origin: 'https://discord.com',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...this.client.options.http.headers,
      'User-Agent': this.fullUserAgent,
    };

    if (this.options.auth !== false) headers.Authorization = this.rest.getAuth();
    if (this.options.reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(this.options.reason);
    if (this.options.headers) headers = Object.assign(headers, this.options.headers);

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) delete headers[key];
    }

    if (this.options.webhook === true) {
      headers = { 'User-Agent': this.fullUserAgent };
    }

    const autoContext = this._getAutoContext();
    const discordContext = this.options.DiscordContext || autoContext;

    if (discordContext) {
      headers['X-Context-Properties'] = Buffer.from(
        JSON.stringify(discordContext),
        'utf8',
      ).toString('base64');
    }
    if (this.options.mfaToken) {
      headers['X-Discord-Mfa-Authorization'] = this.options.mfaToken;
    }

    let body;
    if (this.options.files?.length) {
      body = new FormData();
      for (const [index, file] of this.options.files.entries()) {
        if (file?.file) body.append(file.key ?? `files[${index}]`, file.file, file.name);
      }
      if (typeof this.options.data !== 'undefined') {
        if (this.options.dontUsePayloadJSON) {
          for (const [key, value] of Object.entries(this.options.data)) body.append(key, value);
        } else {
          body.append('payload_json', JSON.stringify(this.options.data));
        }
      }
      headers = Object.assign(headers, body.getHeaders());
    } else if (this.options.data != null) {
      if (this.options.usePayloadJSON) {
        body = new FormData();
        body.append('payload_json', JSON.stringify(this.options.data));
      } else {
        body = JSON.stringify(this.options.data);
        headers['Content-Type'] = 'application/json';
      }
    }

    if (captchaKey && typeof captchaKey === 'string') headers['X-Captcha-Key'] = captchaKey;
    if (captchaRqToken && typeof captchaRqToken === 'string') headers['X-Captcha-Rqtoken'] = captchaRqToken;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.client.options.restRequestTimeout,
    ).unref();

    return fetch(url, {
      method: this.method,
      headers,
      agent: this._agent,
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  }


  _chromeMajor() {
    if (!this._cachedMajor) {
      // Base is current stable major. Add small random delta for fingerprint variance.
      this._cachedMajor = String(138 + Math.floor(Math.random() * 5));
    }
    return this._cachedMajor;
  }

  _discordLocale(acceptLanguage) {
    if (acceptLanguage.startsWith('fr')) return 'fr';
    if (acceptLanguage.startsWith('en-GB')) return 'en-GB';
    return 'en-US';
  }

  _getAutoContext() {
    for (const { pattern, location } of CONTEXT_MAP) {
      if (pattern.test(this.path)) return { location };
    }
    return null;
  }
}

module.exports = APIRequest;
