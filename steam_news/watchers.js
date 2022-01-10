"use strict";

const { existsSync, readFile, writeFile } = require("fs");
const { query, getDetails } = require("./api");

const watchedApps = {servers: {}, apps: {}};
const watchFile = __dirname + "/watchers.json";
const WATCH_LIMIT = exports.WATCH_LIMIT = 25; // the maximum number of fields in an embed and a good limit overall


function init()
{
	Object.defineProperty(watchedApps.apps, "map", {value: function(callback) { return Object.entries(this).map(callback); }});
	checkForNews();
}


let saving = false;
function saveWatchers()
{
	if(saving)
	{
		if(saving !== "timeoutScheduled")
		{
			saving = "timeoutScheduled";
			setTimeout(saveWatchers, 500);
		}
		return;
	}

	saving = true;
	writeFile(watchFile, JSON.stringify(watchedApps), err => { if(err) console.error(err); saving = false; });
}

if(existsSync(watchFile))
{
	readFile(watchFile, "utf-8", (err, data) => {
		if(err)
			console.error(err);
		else
		{
			Object.assign(watchedApps, JSON.parse(data));
			init();
		}
	});
}
else
	init();



/**
 * @param {int} appid The app's id
 * @returns {?string} The app's name, if known.
 */
exports.getAppName = appid => watchedApps[appid]?.name;

/**
 * @param {string} guildId The guild id
 * @returns {Array} The apps watched in that guild, in the format {appid, name, channelId}
 */
exports.getWatchedApps = guildId => {
	const guild = watchedApps.servers[guildId] || [];
	return guild.map(appid => {
		const app = watchedApps.apps[appid];
		return { appid, name: app.name, channelId: app.watchers[guildId] };
	});
}


setTimeout(checkForNews, 3600_000);
exports.checkForNews = checkForNews;

/**
 * Triggers all watchers.
 * @returns {Promise<int>} The number of news sent.
 */
exports.checkForNews = checkForNews;
async function checkForNews(save)
{
	const toEmbed = require("./toEmbed.function");
	const { channels } = require("../bot").client;
	var total = 0;
	const {apps} = watchedApps;

	await Promise.allSettled(apps.map(([appid, {last, watchers}]) => query(appid, 10).then(({appnews}) => {
		if(!appnews)
		{
			for(let server of watchers)
			{
				server = watchedApps.servers[server];
				server.splice(server.indexOf(appid), 1);
			}
			delete apps[appid];
		}
		else
		{
			const news = [];
			for(const newsitem of appnews.newsitems)
			{
				if(newsitem.gid === last)
					break;
				if(newsitem.feedname.includes("steam"))
				{
					news.push(newsitem)
					if(!last) break;
				}
			}

			if(news.length)
			{
				total += news.length;
				watchedApps[appid].last = news[0].gid;
				for(const newsitem of news.reverse())
				{
					const embed = { embeds: [toEmbed(newsitem)] };
					for(const channelId of Object.values(watchers))
						channels.fetch(channelId).then(channel => channel.send(embed).catch(console.error));
				}
			}
		}
	})));
	saveWatchers();
	return total;
}


/**
 * Adds a watcher for an app. A server can only watch 25 apps at once.
 * @param {int} appid The app's id.
 * @param {GuildChannel} channel The text-based channel to send the news to.
 *
 * @returns {Promise<int|false>} false if that app was already watched in that guild, or the new number of watched apps.
 * Rejects with a TypeError if either parameter is invalid, or with a RangeError if the server reached its limit of 25 apps.
 */
exports.watch = async (appid, channel) => {
	if(!channel?.isText() || !channel.guild)
		throw new TypeError("'channel' must be a text-based channel");

	const {appnews} = await query(appid);
	if(!appnews)
		throw new TypeError("'appid' is not a valid app id");

	const guildId = channel.guild.id;
	const {apps, servers} = watchedApps;

	if(guildId in servers)
	{
		if(servers[guildId].includes(appid))
			return false;
		if(servers[guildId].length === WATCH_LIMIT)
			throw new RangeError(`This server reached its limit of ${WATCH_LIMIT} watched apps.`);
		servers[guildId].push(appid);
	}
	else
		servers[guildId] = [appid];

	if(appid in apps)
		apps[appid].watchers[guildId] = channel.id;
	else
	{
		const details = await getDetails(appid);
		const last = appnews.newsitems.find(({feedname}) => feedname.includes("steam"))?.gid;
		apps[appid] = {
			name: details?.name || "undefined",
			last,
			watchers: { [guildId]: channel.id },
		 };
	}

	saveWatchers();
	return servers[guildId].length;
}


/**
 * Stops watching the given app in the given guild.
 * @param {int} appid The app's id.
 * @param {Guild} guild The guild.
 *
 * @returns {int|false} false if that guild was not watching that app, or the new number or apps watched by the guild.
 */
exports.unwatch = (appid, guild) => {
	if(guild.id)
		guild = guild.id;

	const watchers = watchedApps.apps[appid]?.watchers;
	if(!watchers || !(guild in watchers))
		return false;

	const server = watchedApps.servers[guild];
	server.splice(server.indexOf(appid), 1);
	delete watchers[guild];
	if(!Object.keys(watchers).length)
		watchedApps.apps[appid].last = null;
	saveWatchers();
	return server.length;
}
