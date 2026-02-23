'use strict';

module.exports = (client, packet) => {
  client.actions.VoiceChannelStatusUpdate.handle(packet.d);
};
