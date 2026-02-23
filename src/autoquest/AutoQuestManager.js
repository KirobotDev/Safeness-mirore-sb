'use strict';

const { randomUUID } = require('crypto');
const axios = require('axios');

const API_BASE = 'https://discord.com/api/v10';

/** Max jitter added to video-progress timestamps (seconds) */
const VIDEO_TIMESTAMP_JITTER = 0.9;

/** Seconds per video-progress "tick" — randomised in [MIN, MAX] */
const VIDEO_SPEED_MIN = 4;
const VIDEO_SPEED_MAX = 9;

/** ms to wait between tick loops (randomised) */
const VIDEO_LOOP_MIN_MS = 1_000;
const VIDEO_LOOP_MAX_MS = 2_500;

/** Max seconds ahead of real time we can report in video-progress */
const VIDEO_MAX_FUTURE_S = 10;

/** How often (ms) we update the progress message during video quest */
const PROGRESS_UPDATE_INTERVAL_MS = 5_000;

/** Heartbeat quest polling interval ms */
const PLAY_POLL_INTERVAL_MS = 60_000;

/** Extra jitter on top of poll interval */
const PLAY_POLL_JITTER_MS = 5_000;

/** Retry delay on a 429 from the quest API */
const RATE_LIMIT_RETRY_MS = 10_000;

/** Maximum times to retry a rate-limited request before giving up */
const RATE_LIMIT_MAX_RETRIES = 3;

/** Quest IDs we always skip (e.g. buggy / undesirable) */
const EXCLUDED_QUEST_IDS = new Set(['1412491570820812933']);

const SUPPORTED_TASK_TYPES = [
    'WATCH_VIDEO',
    'WATCH_VIDEO_ON_MOBILE',
    'PLAY_ON_DESKTOP',
    'STREAM_ON_DESKTOP',
    'PLAY_ACTIVITY',
];


function buildHeaders(token) {
    const uid = randomUUID();
    const isWin11 = Math.random() > 0.5;
    const props = {
        os: 'Windows',
        browser: 'Discord Client',
        release_channel: 'stable',
        client_version: '1.0.9223',
        os_version: isWin11 ? '11.0.22631' : '10.0.19045',
        os_arch: 'x64',
        app_arch: 'x64',
        system_locale: 'en-US',
        has_client_mods: false,
        client_launch_id: uid,
        browser_user_agent: `Mozilla/5.0 (Windows NT ${isWin11 ? '10.0; Win64; x64' : '10.0; Win64; x64'}) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9223 Chrome/138.0.7204.251 Electron/37.10.0 Safari/537.36`,
        browser_version: '37.10.0',
        os_sdk_version: isWin11 ? '22631' : '19045',
        client_build_number: 552041,
        native_build_number: 82186 + Math.floor(Math.random() * 100),
        client_event_source: null,
        launch_signature: randomUUID(),
        client_heartbeat_session_id: randomUUID(),
        client_app_state: 'focused',
    };

    return {
        Authorization: token.replace(/^Bot\s*/i, ''),
        'Content-Type': 'application/json',
        'User-Agent': props.browser_user_agent,
        'accept-language': 'en-US',
        origin: 'https://discord.com',
        pragma: 'no-cache',
        priority: 'u=1, i',
        referer: 'https://discord.com/channels/@me',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-debug-options': 'bugReporterEnabled',
        'x-discord-locale': 'en-US',
        'x-discord-timezone': 'Europe/Paris',
        'x-super-properties': Buffer.from(JSON.stringify(props)).toString('base64'),
    };
}

/**
 * Build an axios config, fresh headers every call (new UUIDs per request).
 * @param {string} token
 * @param {import('https').Agent|null} [agent]
 */
function axiosCfg(token, agent) {
    const cfg = { headers: buildHeaders(token) };
    if (agent) {
        cfg.httpsAgent = agent;
        cfg.httpAgent = agent;
    }
    return cfg;
}


function rand(min, max) {
    return min + Math.random() * (max - min);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * POST/GET with retry on 429.
 * @param {'get'|'post'} method
 * @param {string} url
 * @param {Object|null} data
 * @param {Object} cfg
 * @param {number} [retries=RATE_LIMIT_MAX_RETRIES]
 */
async function apiCall(method, url, data, cfg, retries = RATE_LIMIT_MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (method === 'post') return await axios.post(url, data ?? {}, cfg);
            return await axios.get(url, cfg);
        } catch (err) {
            const status = err.response?.status;
            if (status === 429 && attempt < retries) {
                const retryAfter = (err.response?.data?.retry_after ?? (RATE_LIMIT_RETRY_MS / 1000)) * 1000;
                await sleep(retryAfter + rand(500, 1500));
                continue;
            }
            throw err;
        }
    }
}


async function updateProgressMessage(active) {
    if (!active) return;

    const lines = [];
    active.questProgress.forEach(p => {
        const pct = p.total > 0 ? Math.round((p.progress / p.total) * 100) : 0;
        const filled = Math.floor(pct / 5);
        const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
        const done = p.status === 'Terminé ✅';
        const eta = done ? '' : ` (${Math.ceil((p.total - p.progress) / 60)} min restant)`;
        lines.push(`${done ? '✅' : '🔄'} **${p.name}**\n   ${bar} ${pct}%\n   ${p.progress}/${p.total}s${eta}`);
    });

    const elapsed = Math.floor((Date.now() - active.startTime) / 1000);
    const content =
        `✅ **Auto-quest en cours**\n\n${lines.join('\n\n')}\n\n` +
        `⏱️ Actif depuis: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

    try {
        if (active.message) {
            try {
                await active.message.channel.messages.fetch(active.message.id);
                await active.message.edit(content);
                return;
            } catch {
                // Ignore
            }
        }
        if (active.channel) {
            active.message = await active.channel.send(content);
            active.lastMessageRecreate = Date.now();
        }
    } catch (err) {
        const cooldown = 10_000;
        if (active.channel && (!active.lastMessageRecreate || Date.now() - active.lastMessageRecreate > cooldown)) {
            try {
                active.message = await active.channel.send(content);
                active.lastMessageRecreate = Date.now();
            } catch { /* silently swallow */ }
        }
    }
}


async function processQuest(client, quest, token, userId, agent) {
    const { quest_name } = quest.config.messages;
    const questId = quest.id;

    if (!quest.user_status?.enrolled_at) {
        try {
            await apiCall('post', `${API_BASE}/quests/${questId}/enroll`,
                { location: 11, is_targeted: false, metadata_raw: null },
                axiosCfg(token, agent));
        } catch (e) {
            if (e.response?.status !== 400) {
                console.warn(`[AutoQuest] Enroll warning for "${quest_name}": ${e.message}`);
            }
        }
    }

    const taskName = SUPPORTED_TASK_TYPES.find(t => quest.config.task_config.tasks[t] != null);
    if (!taskName) {
        console.log(`[AutoQuest] Unsupported task type for "${quest_name}" — skipping`);
        return;
    }

    const secondsNeeded = quest.config.task_config.tasks[taskName].target;
    console.log(`[AutoQuest] Processing "${quest_name}" [${taskName}] (${secondsNeeded}s)`);

    const activeMap = getActiveMap(client);
    const active = activeMap.get(userId);
    if (active?.questProgress.has(questId)) {
        active.questProgress.get(questId).total = secondsNeeded;
    }

    if (taskName === 'WATCH_VIDEO' || taskName === 'WATCH_VIDEO_ON_MOBILE') {
        await handleVideoQuest(client, quest, token, userId, agent, secondsNeeded);
    } else if (taskName === 'PLAY_ON_DESKTOP' || taskName === 'PLAY_ACTIVITY') {
        await handlePlayQuest(client, quest, token, userId, agent, secondsNeeded);
    } else {
        console.log(`[AutoQuest] Task "${taskName}" not yet automated for "${quest_name}"`);
    }
}

async function handleVideoQuest(client, quest, token, userId, agent, secondsNeeded) {
    const { quest_name } = quest.config.messages;
    const questId = quest.id;

    const enrolledAt = Date.now();
    let secondsDone = 0;
    let completed = false;
    let lastUpdate = Date.now();

    while (!completed && secondsDone < secondsNeeded) {
        const tickSpeed = Math.floor(rand(VIDEO_SPEED_MIN, VIDEO_SPEED_MAX + 1));
        const loopDelay = rand(VIDEO_LOOP_MIN_MS, VIDEO_LOOP_MAX_MS);
        const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1_000) + VIDEO_MAX_FUTURE_S;

        if (maxAllowed - secondsDone >= tickSpeed) {
            const rawTimestamp = secondsDone + tickSpeed + rand(0, VIDEO_TIMESTAMP_JITTER);
            const timestamp = parseFloat(Math.min(secondsNeeded, rawTimestamp).toFixed(3));

            try {
                const res = await apiCall('post',
                    `${API_BASE}/quests/${questId}/video-progress`,
                    { timestamp },
                    axiosCfg(token, agent),
                );
                if (res.data?.completed_at) completed = true;
                secondsDone = Math.min(secondsNeeded, Math.floor(timestamp));
            } catch (e) {
                console.error(`[AutoQuest] video-progress error for "${quest_name}": ${e.message}`);
                await sleep(5_000);
            }
        }

        const active = getActiveMap(client).get(userId);
        if (active?.questProgress.has(questId)) {
            active.questProgress.get(questId).progress = secondsDone;
            if (completed) active.questProgress.get(questId).status = 'Terminé ✅';
        }

        if (Date.now() - lastUpdate >= PROGRESS_UPDATE_INTERVAL_MS) {
            if (active) await updateProgressMessage(active);
            lastUpdate = Date.now();
        }

        if (!completed) await sleep(loopDelay);
    }

    if (!completed) {
        try {
            await apiCall('post',
                `${API_BASE}/quests/${questId}/video-progress`,
                { timestamp: secondsNeeded },
                axiosCfg(token, agent),
            );
        } catch (e) {
            console.error(`[AutoQuest] Final video-progress error: ${e.message}`);
        }
    }

    const active = getActiveMap(client).get(userId);
    if (active?.questProgress.has(questId)) {
        active.questProgress.get(questId).progress = secondsNeeded;
        active.questProgress.get(questId).status = 'Terminé ✅';
        await updateProgressMessage(active);
    }

    console.log(`[AutoQuest] ✅ "${quest_name}" (video) done!`);
}

async function handlePlayQuest(client, quest, token, userId, agent, secondsNeeded) {
    const { quest_name } = quest.config.messages;
    const questId = quest.id;
    const applicationId = quest.config.application?.id;
    let isCompleted = false;

    const checkStatus = async () => {
        try {
            const res = await apiCall('get', `${API_BASE}/quests/@me`, null, axiosCfg(token, agent));
            const q = res.data.quests?.find(x => x.id === questId);
            if (!q) return false;

            if (q.user_status?.completed_at) { isCompleted = true; return true; }

            const progress = q.user_status?.progress?.['PLAY_ON_DESKTOP']?.value ?? 0;
            const active = getActiveMap(client).get(userId);
            if (active?.questProgress.has(questId)) {
                active.questProgress.get(questId).progress = progress;
                await updateProgressMessage(active);
            }
            return false;
        } catch (e) {
            console.error(`[AutoQuest] Status check error: ${e.message}`);
            return false;
        }
    };

    while (!isCompleted) {
        try {
            await apiCall('post',
                `${API_BASE}/quests/${questId}/heartbeat`,
                { application_id: applicationId, terminal: false },
                axiosCfg(token, agent),
            );
            if (await checkStatus()) break;
        } catch (e) {
            console.error(`[AutoQuest] Heartbeat error: ${e.message}`);
            if (await checkStatus()) break;
        }
        await sleep(PLAY_POLL_INTERVAL_MS + rand(0, PLAY_POLL_JITTER_MS));
    }

    try {
        await apiCall('post',
            `${API_BASE}/quests/${questId}/heartbeat`,
            { application_id: applicationId, terminal: true },
            axiosCfg(token, agent),
        );
    } catch { /* ignore final terminal error */ }

    const active = getActiveMap(client).get(userId);
    if (active?.questProgress.has(questId)) {
        active.questProgress.get(questId).progress = secondsNeeded;
        active.questProgress.get(questId).status = 'Terminé ✅';
        await updateProgressMessage(active);
    }
    console.log(`[AutoQuest] ✅ "${quest_name}" (play) done!`);
}


function getActiveMap(client) {
    if (!client._autoquest) client._autoquest = { activeQuests: new Map() };
    return client._autoquest.activeQuests;
}


/**
 * Manages Discord quests automatically for a selfbot client.
 *
 * Supports video-progress quests and play/heartbeat quests.
 * All HTTP requests go through the client's configured proxy (if any).
 *
 * @example
 * const aq = new AutoQuestManager(client);
 *
 * // In your command handler
 * switch (args[0]) {
 *   case 'start':  await aq.start(message);  break;
 *   case 'stop':   await aq.stop(message);   break;
 *   case 'status': await aq.status(message); break;
 * }
 */
class AutoQuestManager {
    /**
     * @param {import('../client/Client')} client
     */
    constructor(client) {
        /**
         * The selfbot client.
         * @type {import('../client/Client')}
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: client });
    }


    get _token() { return this.client.token?.replace(/^Bot\s*/i, '') ?? ''; }
    get _agent() { return this.client.options.http?.agent ?? null; }
    get _userId() { return this.client.user?.id; }
    get _activeMap() { return getActiveMap(this.client); }


    /**
     * Fetch all eligible quests and begin auto-completion.
     * @param {import('../structures/Message')} message
     */
    async start(message) {
        const { _token, _agent, _userId, _activeMap } = this;

        if (!_token || !_userId) {
            await message.edit('❌ Client not ready — token or user ID missing.');
            return;
        }

        if (_activeMap.has(_userId)) {
            await message.edit('⚠️ Auto-quest déjà actif. Utilise `stop` pour l\'arrêter.');
            return;
        }

        await message.edit('🔄 Récupération des quêtes…');

        let quests;
        try {
            const res = await apiCall('get', `${API_BASE}/quests/@me`, null, axiosCfg(_token, _agent));
            quests = res.data.quests ?? [];
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.message ?? err.message;
            let msg = `❌ Erreur API ${status ?? ''}: ${detail}`;
            if (status === 404) msg += '\n⚠️ Les quêtes ne sont pas disponibles pour ce compte.';
            await message.edit(msg);
            return;
        }

        const now = Date.now();
        const valid = quests.filter(q =>
            !EXCLUDED_QUEST_IDS.has(q.id) &&
            !q.user_status?.completed_at &&
            new Date(q.config.expires_at).getTime() > now,
        );

        if (valid.length === 0) {
            await message.edit('✅ Aucune quête disponible en ce moment.');
            return;
        }

        await message.edit(`📋 ${valid.length} quête(s) trouvée(s). Démarrage…`);

        const questProgress = new Map();
        valid.forEach(q => {
            questProgress.set(q.id, {
                name: q.config.messages.quest_name,
                progress: 0,
                total: 0,
                status: 'En cours…',
            });
        });

        const progressMessage = await message.channel.send('🔄 Initialisation…');

        _activeMap.set(_userId, {
            quests: valid,
            message: progressMessage,
            channel: message.channel,
            questProgress,
            startTime: now,
            lastMessageRecreate: null,
        });

        Promise.allSettled(
            valid.map(q => processQuest(this.client, q, _token, _userId, _agent)),
        ).then(async results => {
            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    console.error(`[AutoQuest] Quest "${valid[i].config.messages.quest_name}" failed:`, r.reason);
                }
            });

            const active = _activeMap.get(_userId);
            if (active) {
                await updateProgressMessage(active);
                try {
                    await (active.message ?? active.channel).edit?.(
                        '✅ **Auto-quest terminé !** Toutes les quêtes ont été complétées.',
                    );
                } catch { /* ignore */ }
                _activeMap.delete(_userId);
            }
        });

        await updateProgressMessage(_activeMap.get(_userId));
    }

    /**
     * Stop the active quest run.
     * @param {import('../structures/Message')} message
     */
    async stop(message) {
        const { _userId, _activeMap } = this;

        if (!_activeMap.has(_userId)) {
            await message.edit('⚠️ Aucun auto-quest actif.');
            return;
        }

        const active = _activeMap.get(_userId);
        _activeMap.delete(_userId);

        try { await active.message?.edit('⛔ Auto-quest arrêté.'); } catch { /* ignore */ }
        await message.edit('✅ Auto-quest arrêté. Les tâches en cours vont finir naturellement.');
    }

    /**
     * Show a status update in the progress message.
     * @param {import('../structures/Message')} message
     */
    async status(message) {
        const active = this._activeMap.get(this._userId);
        if (!active) {
            await message.edit('ℹ️ Aucun auto-quest actif.');
            return;
        }
        await updateProgressMessage(active);
        await message.edit('📊 Statut mis à jour dans le message de progression ci-dessus.');
    }

    /**
     * Whether an auto-quest is currently running.
     * @type {boolean}
     */
    get running() {
        return this._activeMap.has(this._userId);
    }

    /**
     * Number of active quest tasks.
     * @type {number}
     */
    get taskCount() {
        return this._activeMap.get(this._userId)?.quests.length ?? 0;
    }
}

module.exports = AutoQuestManager;
