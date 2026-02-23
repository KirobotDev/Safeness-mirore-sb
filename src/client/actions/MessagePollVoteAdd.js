'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class MessagePollVoteAddAction extends Action {
    handle(data) {
        const client = this.client;
        const channel = client.channels.cache.get(data.channel_id);
        const message = channel?.messages.cache.get(data.message_id);

        if (message?.poll?.results?.answerCounts) {
            const countObj = message.poll.results.answerCounts.get(data.answer_id) ?? {
                count: 0,
                selfVoted: false,
                answer: message.poll.answers.get(data.answer_id),
            };

            countObj.count++;
            if (client.user.id === data.user_id) countObj.selfVoted = true;

            message.poll.results.answerCounts.set(data.answer_id, countObj);
        }

        client.emit(Events.MESSAGE_POLL_VOTE_ADD, data);
        return { data };
    }
}

module.exports = MessagePollVoteAddAction;
