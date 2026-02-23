/**
 * @example
 * Je texplique tu pourras choisir si tu veux que le bot quitte les groupes silencieusement ou pas
 * tu pourras aussi choisir si tu veux que le sb kick des gens si il sont en trop
 * aussi tu pourras choisir si tu veux wl des gens ou pas comme ci desous avec whitelist:["ID"]
 */


const config = {
    enabled: true,

    hidden: true,

    whitelist: [
        '123456789012345678',
        '987654321098765432',
    ],

    message: null,

    lockLimit: 0,

    locks: {},
};

const activeHandlers = new Map();

/**
 * Configure les écouteurs pour l'AntiGroup
 * @param {Object} client
 */
function setupAntiGroup(client) {
    const userId = client.user.id;

    if (activeHandlers.has(userId)) {
        const handlers = activeHandlers.get(userId);
        if (typeof handlers === 'function') {
            client.off('channelCreate', handlers);
        } else {
            if (handlers.create) client.off('channelCreate', handlers.create);
            if (handlers.message) client.off('messageCreate', handlers.message);
        }
        activeHandlers.delete(userId);
    }

    if (!config.enabled && !config.lockLimit && Object.keys(config.locks).length === 0) return;

    const createHandler = async channel => {
        if (channel.type === 'GROUP_DM') {
            try {
                if (channel.ownerId === client.user.id) return;

                if (config.enabled) {
                    if (config.whitelist.includes(channel.ownerId)) return;
                    if (channel.recipients && channel.recipients.some(u => config.whitelist.includes(u.id))) return;

                    if (config.message) {
                        try {
                            await channel.send(config.message);
                            // eslint-disable-next-line no-empty
                        } catch (e) { }
                    }

                    await client.api
                        .channels(channel.id)
                        .delete({ query: { silent: config.hidden } })
                        // eslint-disable-next-line no-empty
                        .catch(() => { });
                    console.log(`[AntiGroup] Quitté le groupe ${channel.id} (Hidden: ${config.hidden})`);
                }
            } catch (error) {
                console.error(`[AntiGroup] Erreur leave: ${error.message}`);
            }
        }
    };

    const messageHandler = async message => {
        if (message.channel.type === 'GROUP_DM' && message.type === 'RECIPIENT_ADD') {
            try {
                if (message.channel.ownerId !== client.user.id) return;

                const limit = config.locks[message.channel.id] || config.lockLimit;

                if (!limit || limit <= 0) return;

                if (message.channel.recipients.size >= limit) {
                    const addedUser = message.mentions.users.first();

                    if (addedUser) {
                        if (addedUser.id === client.user.id) return;
                        if (config.whitelist.includes(addedUser.id)) return;

                        try {
                            await client.api.channels(message.channel.id).recipients(addedUser.id).delete();
                            console.log(`[AntiGroup] Kick ${addedUser.tag} du groupe ${message.channel.id} (Limite ${limit})`);
                        } catch (e) {
                            console.error(`[AntiGroup] Erreur kick: ${e.message}`);
                        }
                    }
                }
                // eslint-disable-next-line no-empty
            } catch (error) { }
        }
    };

    client.on('channelCreate', createHandler);
    client.on('messageCreate', messageHandler);
    activeHandlers.set(userId, { create: createHandler, message: messageHandler });
    console.log(`[AntiGroup] Protection active pour ${client.user.tag} (Mode Hidden: ${config.hidden})`);
}

module.exports = {
    name: 'antigroup',
    description: 'AntiGroup simple (Configuration dans le fichier)',
    setupAntiGroup,
    run: async (client, message, args) => {
        const deleteMsg = async msg => {
            if (!msg) return;
            setTimeout(async () => {
                try {
                    if (msg.deletable) await msg.delete();
                    // eslint-disable-next-line no-empty
                } catch (e) { }
            }, 5000);
        };

        try {
            if (message.deletable) await message.delete();
        } catch (err) {
            // ignore
        }

        if (!args[0]) {
            const status = config.enabled ? 'Activé' : 'Désactivé';
            const hiddenStatus = config.hidden ? 'Activé (Silencieux)' : 'Désactivé (Visible)';

            const msg = await message.channel.send(
                '**Protection AntiGroup**\n' +
                `> État: \`${status}\`\n` +
                `> Mode Caché: \`${hiddenStatus}\`\n` +
                `> Whitelist: ${config.whitelist.length} utilisateurs\n` +
                '\n*Pour changer la configuration, modifiez directement le fichier `antigroup.js`*',
            );
            deleteMsg(msg);
            return;
        }

        const sub = args[0].toLowerCase();

        if (sub === 'on') {
            config.enabled = true;
            setupAntiGroup(client);
            deleteMsg(await message.channel.send('> ✅ **AntiGroup activé.**'));
        } else if (sub === 'off') {
            config.enabled = false;
            const userId = client.user.id;
            if (activeHandlers.has(userId)) {
                const handlers = activeHandlers.get(userId);
                client.off('channelCreate', handlers.create);
                client.off('messageCreate', handlers.message);
                activeHandlers.delete(userId);
            }
            deleteMsg(await message.channel.send('> ❌ **AntiGroup désactivé.**'));
        } else if (sub === 'hidden') {
            if (args[1] === 'true' || args[1] === 'on') {
                config.hidden = true;
                deleteMsg(await message.channel.send('> 🕵️ **Mode Caché activé.**'));
            } else if (args[1] === 'false' || args[1] === 'off') {
                config.hidden = false;
                deleteMsg(await message.channel.send('> 📢 **Mode Caché désactivé.**'));
            } else {
                deleteMsg(await message.channel.send('> Usage: `antigroup hidden true/false`'));
            }
        }
    },
};
