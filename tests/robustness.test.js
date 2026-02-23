const { WebSocketShard, Options } = require('../src/index');

console.log('--- Verifying Robustness & Optimization ---');

try {
    const defaults = Options.defaultMakeCacheSettings;
    if (defaults.MessageManager === 50 && defaults.ReactionManager === 0 && defaults.PresenceManager === 0) {
        console.log('Default cache options optimized (Messages: 50, Reactions: 0, Presences: 0)');
    } else {
        console.error('Default cache options mismatch:', defaults);
    }
} catch (e) {
    console.error('Options verification failed:', e);
}

try {
    const manager = { client: { options: { ws: { properties: {} }, http: { agent: {} } } }, debug: () => { } };
    const shard = new WebSocketShard(manager, 0);

    if (shard.resumeURL === null) {
        console.log('WebSocketShard initializes with null resumeURL');
    }

    shard.resumeURL = 'wss://resume.discord.gg';
    shard.sessionId = 'session123';

    console.log('WebSocketShard structure ok');

} catch (e) {
    console.error('WebSocketShard verification failed:', e);
}

console.log('--- Robustness Verification Complete ---');
