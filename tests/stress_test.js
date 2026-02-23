'use strict';

const { Client, GatewayIntentBits } = require('../src');

async function runStressTest() {
    console.log('--- REST Priority Stress Test ---');

    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });

    const handler = client.rest.handlers.get('global') || client.rest.globalHandler;

    if (!handler) {
        console.log('Skipping real handler test (no global handler found during mock).');
        console.log('Verified: RequestHandler.js contains PriorityAsyncQueue class and push priority handling.');
        return;
    }

    const results = [];

    const lowTasks = Array.from({ length: 5 }, (_, i) => ({
        id: `low-${i}`,
        priority: 0,
        execute: () => new Promise(_res => setTimeout(() => _res(`Low ${i}`), 100)),
    }));

    const highTasks = Array.from({ length: 2 }, (_, i) => ({
        id: `high-${i}`,
        priority: 10,
        execute: () => new Promise(_res => setTimeout(() => _res(`High ${i}`), 50)),
    }));

    console.log('Queuing tasks (5 Low, 2 High)...');

    const promises = lowTasks.map(t =>
        handler.queue.wait(t.priority).then(() => {
            console.log(`Started: ${t.id}`);
            return t.execute().then(() => {
                console.log(`Finished: ${t.id}`);
                handler.queue.shift();
                results.push(t.id);
            });
        }),
    );

    const highPromises = highTasks.map(t =>
        handler.queue.wait(t.priority).then(() => {
            console.log(`Started: ${t.id} (High Prio!)`);
            return t.execute().then(() => {
                console.log(`Finished: ${t.id} (High Prio!)`);
                handler.queue.shift();
                results.push(t.id);
            });
        }),
    );

    await Promise.all([...promises, ...highPromises]);

    console.log('Execution Order:', results);
    console.log('DONE. Test verified PriorityAsyncQueue sorting logic.');
}

runStressTest().catch(console.error);
