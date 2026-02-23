'use strict';

const BitField = require('./BitField');

/**
 * Data structure that makes it easy to interact with a {@link ClientUser#tutorialFlags} bitfield.
 * @extends {BitField}
 */
class TutorialFlags extends BitField { }

/**
 * @name TutorialFlags
 * @kind constructor
 * @memberof TutorialFlags
 * @param {BitFieldResolvable} [bits=0] Bit(s) to read from
 */

/**
 * Bitfield of the packed bits
 * @type {number}
 * @name TutorialFlags#bitfield
 */

/**
 * Numeric tutorial flags. [Undocumented / Reverse Engineered]
 * @type {Object}
 */
TutorialFlags.FLAGS = {
    DISMISSED_TUTORIAL_TAG: 1 << 0,
    DISMISSED_GO_LIVE_TUTORIAL: 1 << 1,
    DISMISSED_VIDEO_CALL_TUTORIAL: 1 << 2,
    DISMISSED_VOICE_CALL_TUTORIAL: 1 << 3,
    DISMISSED_GUILD_TUTORIAL: 1 << 4,
    DISMISSED_CHANNEL_TUTORIAL: 1 << 5,
    DISMISSED_VOICE_CHANNEL_TUTORIAL: 1 << 6,
    DISMISSED_GROUP_DM_TUTORIAL: 1 << 7,
    DISMISSED_DM_TUTORIAL: 1 << 8,
    DISMISSED_FRIENDS_TUTORIAL: 1 << 9,
    DISMISSED_ACTIVITY_TUTORIAL: 1 << 10,
    DISMISSED_GAME_LIBRARY_TUTORIAL: 1 << 11,
    DISMISSED_GAME_DETAIL_TUTORIAL: 1 << 12,
    DISMISSED_GAME_ACTION_TUTORIAL: 1 << 13,
    DISMISSED_GAME_INVITE_TUTORIAL: 1 << 14,
    DISMISSED_GAME_ACTIVITY_TUTORIAL: 1 << 15,
    DISMISSED_UPSELL_MODAL: 1 << 16,
};

module.exports = TutorialFlags;
