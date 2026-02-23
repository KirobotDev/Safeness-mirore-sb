'use strict';

const BaseManager = require('./BaseManager');

/**
 * Manages API methods for Discord Experiments (feature flags).
 * @extends {BaseManager}
 */
class ExperimentManager extends BaseManager {
    constructor(client) {
        super(client);
        /**
         * Cached experiments.
         * @type {Object}
         * @private
         */
        this._experiments = {};
    }

    /**
     * Fetch all experiments from Discord.
     * @returns {Promise<Object>}
     */
    async fetch() {
        const data = await this.client.api.experiments.get();
        this._experiments = data;
        return data;
    }

    /**
     * Get all cached experiments.
     * @type {Object}
     * @readonly
     */
    get cache() {
        return this._experiments;
    }

    /**
     * Check if a specific experiment is enabled.
     * @param {string} experimentName The name or ID of the experiment
     * @returns {boolean}
     */
    isEnabled(experimentName) {
        // This is a simplified check as Discord experiments are complex (assignments, buckets, etc.)
        // But for a self-bot lib, just having the raw data is a good start.
        return !!(this._experiments.assignments?.find(a => a[0] === experimentName) ||
            this._experiments.guild_experiments?.find(e => e[0] === experimentName));
    }
}

module.exports = ExperimentManager;
