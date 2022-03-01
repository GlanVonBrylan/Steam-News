"use strict";

const Discord = require("discord.js");
const INTENTS = Discord.Intents.FLAGS;
const auth = exports.auth = require("./auth.json");

const client = exports.client = new Discord.Client({
	intents: new Discord.Intents([
		INTENTS.GUILDS,
	]),
});

const {FLAGS: { ADMINISTRATOR }} = Discord.Permissions;

var master;
exports.sendToMaster = (msg, onError = error) => master.send(msg).catch(onError);

const error = require("./error");
const { commands, init: initCmds } = require("./commands");

client.login(auth.token);

client.on("ready", async () => {
	exports.myself = client.user;
	exports.master = master = await client.users.fetch(auth.master);
	console.log(`Connecté en tant que ${client.user.tag} !`);
	initCmds(client, auth.debug);
	require("./dbl")(auth.dblToken, client);
});


for(const file of require("fs").readdirSync(__dirname+"/events"))
	client.on(file.substring(0, file.length - 3), require(`./events/${file}`));


client.on("interactionCreate", interaction => {
	if(interaction.type !== "APPLICATION_COMMAND")
		return;

	const command = commands[interaction.commandName];

	if(!interaction.inGuild() && !command.global)
		return interaction.reply({ content: "This command only works in servers.", ephemeral: true }).catch(error);

	if(command)
	{
		if(command.adminOnly && !interaction.member.permissions.has(ADMINISTRATOR) && interaction.member.id !== master.id)
			interaction.reply({content: "Only admins can use this command.", ephemeral: true}).catch(error);
		else
			command.run(interaction);
	}
	else
		error(`Commande inconnue reçue : ${interaction.commandName}`);
});
