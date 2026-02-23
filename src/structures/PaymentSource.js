'use strict';

const Base = require('./Base');

/**
 * Represents a payment source.
 * @extends {Base}
 */
class PaymentSource extends Base {
    constructor(client, data) {
        super(client);

        /**
         * The id of the payment source
         * @type {Snowflake}
         */
        this.id = data.id;

        this._patch(data);
    }

    _patch(data) {
        /**
         * The type of the payment source
         * @type {number}
         */
        this.type = data.type;

        /**
         * Whether this payment source is invalid
         * @type {boolean}
         */
        this.invalid = data.invalid;

        /**
         * The flags for this payment source
         * @type {number}
         */
        this.flags = data.flags;

        /**
         * The screen status of this payment source
         * @type {?number}
         */
        this.screenStatus = data.screen_status ?? null;

        /**
         * The brand of the payment source (e.g. Visa, MasterCard)
         * @type {?string}
         */
        this.brand = data.brand ?? null;

        /**
         * The last 4 digits of the payment source
         * @type {?string}
         */
        this.last4 = data.last_4 ?? null;

        /**
         * The expiration month of the payment source
         * @type {?number}
         */
        this.expiresMonth = data.expires_month ?? null;

        /**
         * The expiration year of the payment source
         * @type {?number}
         */
        this.expiresYear = data.expires_year ?? null;

        /**
         * The billing address of the payment source
         * @type {?Object}
         */
        this.billingAddress = data.billing_address ?? null;

        /**
         * The country of the payment source
         * @type {?string}
         */
        this.country = data.country ?? null;

        /**
         * Whether this is the default payment source
         * @type {boolean}
         */
        this.default = data.default;

        /**
         * The email associated with this payment source
         * @type {?string}
         */
        this.email = data.email ?? null;
    }
}

module.exports = PaymentSource;
