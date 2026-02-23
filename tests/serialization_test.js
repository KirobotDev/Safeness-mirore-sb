'use strict';

const Util = require('../src/util/Util');

const mockData = {
    id: 12345678901234567890n,
    name: 'Test',
    flags: 1n,
    roles: [123n, 456n],
    metadata: {
        bits: 789n
    }
};

console.log('Testing BigInt Serialization...');

try {
    const flat = Util.flatten(mockData);
    console.log('Flattend Object:', flat);

    const json = JSON.stringify(flat);
    console.log('JSON String:', json);

    if (json.includes('"id":"12345678901234567890"')) {
        console.log('SUCCESS: BigInt serialized to string correctly.');
    } else {
        console.log('FAILURE: BigInt not serialized correctly.');
        process.exit(1);
    }
} catch (error) {
    console.error('CRASH: Serialization failed:', error.message);
    process.exit(1);
}
