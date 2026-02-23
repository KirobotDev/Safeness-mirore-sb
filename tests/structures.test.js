const { MessageEmbed, PaymentSource } = require('../src/index');

console.log('--- Verifying Structures ---');

try {
    const embed = new MessageEmbed();


    embed.setAuthor({ name: 'Test Author' });
    if (embed.author.name === 'Test Author') {
        console.log('MessageEmbed.setAuthor works with object');
    } else {
        console.error('MessageEmbed.setAuthor failed with object');
    }

    embed.setFooter({ text: 'Test Footer' });
    if (embed.footer.text === 'Test Footer') {
        console.error('MessageEmbed.setFooter works with object');
    } else {
        console.error('MessageEmbed.setFooter failed with object');
    }

} catch (e) {
    console.error('MessageEmbed verification failed:', e);
}

try {
    const ps = new PaymentSource({ options: {} }, {
        id: '123',
        type: 1,
        invalid: false,
        brand: 'Visa',
        last_4: '4242'
    });

    if (ps.id === '123' && ps.brand === 'Visa') {
        console.log('PaymentSource structure works');
    } else {
        console.error('PaymentSource structure invalid:', ps);
    }
} catch (e) {
    console.error('PaymentSource verification failed:', e);
}

console.log('--- Structure Verification Complete ---');
