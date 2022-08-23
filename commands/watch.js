"use strict";

const { search } = require("../steam_news/api");
const { WATCH_LIMIT, watch, watchPrice, unwatch, getAppInfo, purgeApp } = require("../steam_news/watchers");
const {
	ChannelType: {GuildText: GUILD_TEXT, GuildPublicThread: GUILD_PUBLIC_THREAD, GuildPrivateThread: GUILD_PRIVATE_THREAD, GuildNews: GUILD_NEWS, GuildNewsThread: GUILD_NEWS_THREAD},
	PermissionsBitField: {Flags: {SendMessages: SEND_MESSAGES, EmbedLinks: EMBED_LINKS}},
} = require("discord.js");

const updateUnwatch = require("./guild").updateCmd.bind(null, require("./guild/unwatch"));

exports.defaultMemberPermissions = "0";
exports.autocomplete = require("../autocomplete/search");
exports.description = `(admins only) Follow a game’s news feed or price changes (maximum ${WATCH_LIMIT} of each per server)`;
exports.options = [{
	type: STRING, name: "type", required: true,
	description: "Whether to watch news or price changes",
	choices: [{name: "News", value: "news"}, {name: "Price", value: "price"}],
}, {
	type: STRING, name: "game", required: true,
	description: "The game’s name or id",
	autocomplete: true,
}, {
	type: CHANNEL, name: "channel",
	channelTypes: [GUILD_TEXT, GUILD_PUBLIC_THREAD, GUILD_PRIVATE_THREAD, GUILD_NEWS, GUILD_NEWS_THREAD],
	description: "The channel where to send the news (defaults to current channel if not provided)"
}];
exports.run = async inter => {
	const channel = inter.options.getChannel("channel") || inter.channel;
	const perms = channel.permissionsFor(inter.guild.members.me);
	const t = tr.set(inter.locale, "watch");

	if(!perms.has(SEND_MESSAGES))
		return inter.reply({ephemeral: true, content: t("cannot-send", channel)}).catch(error);
	else if(!perms.has(EMBED_LINKS))
		return inter.reply({ephemeral: true, content: t("cannot-embed", channel)}).catch(error);

	const defer = inter.deferReply({ephemeral: true}).catch(error);
	let appid = inter.options.getString("game");

	if(!isFinite(appid))
	{
		const [game] = await search(appid);
		if(game)
			appid = game.id;
		else
			return defer.then(() => inter.editReply({ephemeral: true, content: tr.get(inter.locale, "no-match", appid)}).catch(error));
	}

	const type = inter.options.getString("type");
	const watchPrice = type === "price";

	watch(+appid, channel, watchPrice).then(async success => {
		await defer;
		const details = getAppInfo(appid);

		if(!details)
		{
			purgeApp(appid);
			return inter.editReply({ephemeral: true, content: t.get(inter.locale, "bad-appid")}).catch(error);
		}

		if(watchPrice)
		{
			if(success === null)
				return inter.editReply({ephemeral: true, content: t("price-free")}).catch(error);
			if(success === false)
				return inter.editReply({ephemeral: true, content: t("price-unknown")}).catch(error);
		}

		if(details.type === "dlc" && !watchPrice)
		{
			purgeApp(appid);
			return inter.editReply({ephemeral: true, content: t.get(inter.locale, "no-DLC-news")}).catch(error);
		}

		if(details.nsfw && !channel.nsfw)
		{
			unwatch(appid, inter.guild);
			return inter.editReply(tr.get(inter.locale), `NSFW-content-${type}`).catch(error);
		}

		const limitWarning = success === WATCH_LIMIT ? `\n${t("server-limit-reached", WATCH_LIMIT)}` : "";
		const detailsError = details.name === "undefined" ? "\n"+t("error-retrieving-details") : "";

		updateUnwatch(inter.guild, true);

		inter.editReply({ephemeral: true, content:
			success ? `${t(`confirm-${type}`, details.name, channel)}${detailsError}${limitWarning}`
				: t(`already-${type}`, details.name),
		}).catch(error);
	}, async err => {
		await defer;
		if(err.message.includes("appid"))
			inter.editReply({ephemeral: true, content: tr.get(inter.locale, "bad-appid")}).catch(error);
		else if(err instanceof RangeError)
			inter.editReply({ephemeral: true, content: err.message}).catch(error);
		else
		{
			error(err);
			inter.editReply({ephemeral: true, content: tr.get(inter.locale, "error")}).catch(error);
		}
	});
}
