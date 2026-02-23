'use strict';

// Proxy trap names that should return the route string (inspection / debugging)
const REFLECTORS = [
  'toString',
  'valueOf',
  'inspect',
  'constructor',
  Symbol.toPrimitive,
  Symbol.for('nodejs.util.inspect.custom'),
];

// Supported HTTP methods
const METHODS = ['get', 'post', 'delete', 'patch', 'put'];

/**
 * Build a Proxy-based REST route builder.
 *
 * Allows chaining like `client.api.channels('123').messages.post({ data })`.
 * The route is assembled lazily and the final method call triggers the request.
 *
 * Route bucket computation follows Discord's major-parameter rules:
 * - Snowflake IDs after `channels` or `guilds` are kept as-is (major params)
 * - All other snowflakes are normalised to `:id`
 * - Reactions sub-routes all share the same bucket
 *
 * @param {RESTManager} manager
 * @returns {Proxy}
 */
function buildRoute(manager) {
  const route = [''];

  /** @type {ProxyHandler} */
  const handler = {
    get(target, name) {
      if (REFLECTORS.includes(name)) return () => route.join('/');

      if (METHODS.includes(name)) {
        return options => {
          const bucket = [];
          for (let i = 0; i < route.length; i++) {
            const seg = route[i];
            const prev = route[i - 1];

            // Reactions and sub-routes all share the same bucket
            if (prev === 'reactions') break;

            // Snowflake after channels/guilds = major parameter, keep as-is
            if (/^\d{16,19}$/.test(seg) && !/^(?:channels|guilds)$/.test(prev)) {
              bucket.push(':id');
            } else {
              bucket.push(seg);
            }
          }

          return manager.request(
            name,
            route.join('/'),
            {
              versioned: manager.versioned,
              route: bucket.join('/'),
              ...options,
            },
          );
        };
      }

      // Any other property access — push segment and return a new Proxy
      route.push(name);
      return new Proxy(() => { }, handler);
    },

    apply(target, _, args) {
      route.push(...args.filter(x => x != null)); // eslint-disable-line eqeqeq
      return new Proxy(() => { }, handler);
    },
  };

  return new Proxy(() => { }, handler);
}

module.exports = buildRoute;
