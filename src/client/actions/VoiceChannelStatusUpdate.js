'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class VoiceChannelStatusUpdateAction extends Action {
    handle(data) {
        const client = this.client;
        const channel = client.channels.cache.get(data.id);

        if (channel) {
            const old = channel._clone();
            channel.status = data.status;

            client.emit(Events.VOICE_CHANNEL_STATUS_UPDATE, old, channel);

            client.emit(Events.CHANNEL_UPDATE, old, channel);

            return {
                old,
                updated: channel,
            };
        }

        return {};
    }
}

module.exports = VoiceChannelStatusUpdateAction;
