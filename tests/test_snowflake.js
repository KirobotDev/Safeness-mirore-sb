const SnowflakeUtil = require('./src/util/SnowflakeUtil');

try {
    const snowflake = SnowflakeUtil.generate();
    console.log('Generated Snowflake:', snowflake);
    console.log('Type:', typeof snowflake);

    const deconstructed = SnowflakeUtil.deconstruct(snowflake);
    console.log('Deconstructed:', deconstructed);

    const timestamp = SnowflakeUtil.timestampFrom(snowflake);
    console.log('Timestamp:', timestamp);

    if (typeof snowflake === 'string' && typeof deconstructed.workerId === 'bigint') {
        console.log('SnowflakeUtil Upgrade Verification: SUCCESS');
    } else {
        console.log('SnowflakeUtil Upgrade Verification: FAILED (Types mismatch)');
    }

} catch (error) {
    console.error('SnowflakeUtil Test Failed:', error);
}
