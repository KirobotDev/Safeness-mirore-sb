const { Client } = require('../src/index');
const client = new Client();

client.on('ready', async () => {
	console.log(`Connecté en tant que ${client.user.tag}`);

	await client.user.ackTutorial('DISMISSED_DM_TUTORIAL');
	console.log('badge tutoriel dm retiré !');

	await client.user.setHypeSquad('HOUSE_BRAVERY');
	console.log('HypeSquad définie sur Bravery');

	const guild = client.guilds.cache.first();
	if (guild) {
		const member = await guild.members.fetchMe();

		await member.setAccentColor?.('#FF00FF');
		console.log(`Profil mis a jour sur le serveur : ${guild.name}`);
	}
});

client.on('messageCreate', async (message) => {
	if (!message.guild && message.author.id !== client.user.id) {
		await message.ack();
		console.log(`Message de ${message.author.username} marqué comme lue`);
	}
});

client.login(''); // token a mètre ici