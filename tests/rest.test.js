const { ShardingManager, Permissions, Util } = require('../src/index');

console.log('--- Verifying REST & Utils ---');

let passed = true;

try {
    const manager = new ShardingManager('./src/index.js');
    if (manager.totalShards === 1 || manager.totalShards === 'auto') {
        console.log(`ShardingManager defaults to ${manager.totalShards} (correct for self-bot, resolves to 1 in spawn)`);
    } else {
        console.error('ShardingManager default shard count is incorrect:', manager.totalShards);
        passed = false;
    }
} catch (e) {
    if (e.code === 'CLIENT_INVALID_OPTION' && e.message.includes('File')) {
        console.log('ShardingManager file check passed or failed as expected for dummy path');
    } else {
        console.error('ShardingManager instantiation failed:', e);
        passed = false;
    }
}

try {
    const perms = new Permissions(Permissions.FLAGS.MANAGE_THREADS);
    if (perms.has('MANAGE_THREADS')) {
        console.log('Permissions flags (v10) are working');
    } else {
        console.error('Permissions flags failed');
        passed = false;
    }
} catch (e) {
    console.error('Permissions check failed:', e);
    passed = false;
}

if (typeof Util.uploadFile === 'function') {
    console.log('Util.uploadFile exists');
} else {
    console.error('Util.uploadFile missing');
    passed = false;
}

if (!passed) {
    console.error('\n REST Verification Failed');
    process.exit(1);
} else {
    console.log('\n REST Verification Passed');
}
