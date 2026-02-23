'use strict';

const { Buffer } = require('node:buffer');


let erlpack = null;
try {
  erlpack = require('erlpack');
  if (typeof erlpack.pack !== 'function') erlpack = null;
} catch {
  // eslint-disable-next-line no-empty
}


exports.WebSocket = require('ws');

/**
 * The encoding used for gateway payloads.
 * @type {'etf'|'json'}
 */
exports.encoding = erlpack ? 'etf' : 'json';


/**
 * Serialize a payload for sending over the gateway.
 * Uses erlpack when available, otherwise JSON.
 * @type {(data: any) => Buffer|string}
 */
exports.pack = erlpack ? erlpack.pack : JSON.stringify;

const _decoder = new TextDecoder();

/**
 * Deserialize a payload received from the gateway.
 * @param {Buffer|ArrayBuffer|Uint8Array|string} data
 * @param {'json'|'etf'} [type]
 * @returns {Object}
 */
exports.unpack = (data, type) => {
  // Force JSON for specific cases (e.g. HTTP events use JSON even in ETF mode)
  if (exports.encoding === 'json' || type === 'json') {
    if (typeof data !== 'string') data = _decoder.decode(data);
    return JSON.parse(data);
  }
  // ETF path — erlpack expects a Buffer
  if (!Buffer.isBuffer(data)) data = Buffer.from(new Uint8Array(data));
  return erlpack.unpack(data);
};


/**
 * Create and connect a WebSocket to the Discord gateway.
 * Merges query params, appends the encoding, and forwards any extra ws args.
 *
 * @param {string}  gateway  Base gateway URL (e.g. `wss://gateway.discord.gg/?v=10`)
 * @param {Object}  [query={}] Extra query params to merge in
 * @param {...any}  args     Additional arguments forwarded to the `ws` constructor
 * @returns {import('ws')}
 */
exports.create = (gateway, query = {}, ...args) => {
  const [base, existing] = gateway.split('?');

  const params = new URLSearchParams(existing);
  params.set('encoding', exports.encoding);
  for (const [k, v] of Object.entries(query)) {
    if (k === 'encoding') continue;
    params.set(k, v);
  }

  return new exports.WebSocket(`${base}?${params}`, ...args);
};

for (const state of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
  exports[state] = exports.WebSocket[state];
}
