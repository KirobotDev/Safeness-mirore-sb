'use strict';

const { Client } = require('../src');
const client = new Client();

console.log('--- Checking RelationshipManager ---');
if (typeof client.relationships.fetchMutualFriends === 'function') {
    console.log('[OK] fetchMutualFriends exists');
} else {
    console.log('[FAIL] fetchMutualFriends missing');
}
if (typeof client.relationships.clearPendingRequests === 'function') {
    console.log('[OK] clearPendingRequests exists');
} else {
    console.log('[FAIL] clearPendingRequests missing');
}

console.log('--- Checking ClientUserSettingManager ---');
const setters = [
    'setExplicitContentFilter',
    'setDeveloperMode',
    'setAfkTimeout',
    'setFriendSourceFlags',
    'setPrivacySettings'
];
setters.forEach(s => {
    if (typeof client.settings[s] === 'function') {
        console.log(`[OK] ${s} exists`);
    } else {
        console.log(`[FAIL] ${s} missing`);
    }
});

console.log('--- Checking ClientUser ---');
// Create a fake ClientUser to check getters
const ClientUser = require('../src/structures/ClientUser');
const user = new ClientUser(client, { id: '123', username: 'test' });
user._patch({ premium_type: 1 });

if (user.isNitro === true) {
    console.log('[OK] isNitro getter works');
} else {
    console.log('[FAIL] isNitro getter failed');
}

if (user.canUseExternalEmojis === true) {
    console.log('[OK] canUseExternalEmojis getter works');
} else {
    console.log('[FAIL] canUseExternalEmojis getter failed');
}

if (user.maxUploadSize === 52428800) {
    console.log('[OK] maxUploadSize getter works');
} else {
    console.log(`[FAIL] maxUploadSize getter failed: ${user.maxUploadSize}`);
}

if (typeof user.fetchProfile === 'function') {
    console.log('[OK] fetchProfile exists');
} else {
    console.log('[FAIL] fetchProfile missing');
}

console.log('--- Checking ExperimentManager ---');
if (client.experiments && typeof client.experiments.fetch === 'function') {
    console.log('[OK] ExperimentManager integrated');
} else {
    console.log('[FAIL] ExperimentManager missing');
}

console.log('--- Checking User-Agent Sync ---');
const { UserAgent } = require('../src/util/Constants');
if (UserAgent.includes('1.0.9223')) {
    console.log('[OK] UserAgent updated in Constants');
} else {
    console.log(`[FAIL] UserAgent version mismatch in Constants: ${UserAgent}`);
}

if (client.options.ws.properties.browser_user_agent === UserAgent) {
    console.log('[OK] UserAgent synced in Options');
} else {
    console.log('[FAIL] UserAgent sync failed in Options');
}

process.exit(0);
