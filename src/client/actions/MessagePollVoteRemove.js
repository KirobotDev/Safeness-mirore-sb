'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class MessagePollVoteRemoveAction extends Action {
    handle(data) {
        const client = this.client;
        const channel = client.channels.cache.get(data.channel_id);
        const message = channel?.messages.cache.get(data.message_id);

        if (message?.poll?.results?.answerCounts) {
            const countObj = message.poll.results.answerCounts.get(data.answer_id);
            if (countObj) {
                countObj.count = Math.max(0, countObj.count - 1);
                if (client.user.id === data.user_id) countObj.selfVoted = false;
            }
        }

        client.emit(Events.MESSAGE_POLL_VOTE_REMOVE, data);
        return { data };
    }
}

module.exports = MessagePollVoteRemoveAction;
