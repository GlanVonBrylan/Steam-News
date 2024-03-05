
import {
	unwatch,
	getAppName, getWatchedApps, getWatchedPrices
} from "../../steam_news/watchers.js";
import { guildCommands } from "@brylan/djs-commands";

const MAX_OPTIONS = 25;
const CMD_NAME = "unwatch";

function toString() {
	return this.name;
}
function formatName(name) {
	return name.length > 32 ? name.substring(0, 31) + "…" : name;
}
function toOptions({ name, appid }) {
	return { name: formatName(name), value: ""+appid, toString };
}

const updateCmd = guildCommands.updateCmd.bind(null, CMD_NAME);

export function shouldCreateFor(id) {
	return getWatchedApps(id).length || getWatchedPrices(id).length;
}


import getLocalizationHelper from "./~localizationHelper.js";
const localizations = getLocalizationHelper(CMD_NAME);

export const defaultMemberPermissions = "0";
const unwatchNews = {
	type: SUBCOMMAND, name: "news",
	description: "(admins only) Stop watching a game’s news feed.",
	...localizations.optionLocalizations("news"),
};
const unwatchPrice = {
	type: SUBCOMMAND, name: "price",
	description: "(admins only) Stop watching a game’s price.",
	...localizations.optionLocalizations("price"),
}
const appidOption = {
	type: STRING, name: "game", required: true,
	description: "The game’s name or id",
	// middleware takes care of translating this
	choices: [],
};
export const options = [appidOption];
export function getOptions(guildId)
{
	const watchedApps = getWatchedApps(guildId).map(toOptions);
	const watchedPrices = getWatchedPrices(guildId).map(toOptions);
	const nApps = watchedApps.length;
	const nPrices = watchedPrices.length;
	const options = [];
	if(nApps)
		options.push({
			...unwatchNews,
			options: [{
				...appidOption,
				...(nApps > MAX_OPTIONS ? {autocomplete: true} : {choices: watchedApps.sort()}),
			}],
		});

	if(nPrices)
		options.push({
			...unwatchPrice,
			options: [{
				...appidOption,
				...(nPrices > MAX_OPTIONS ? {autocomplete: true} : {choices: watchedPrices.sort()}),
			}],
		});

	return options;
}

export function autocomplete(inter)
{
	const search = (inter.options.getFocused() || "").toLowerCase();
	const apps = (inter.options.getSubcommand() === "price" ? getWatchedPrices : getWatchedApps)(inter.guild.id);
	const results = (search ? apps.filter(({name}) => name.toLowerCase().includes(search)) : apps);

	inter.respond(results.slice(0, 25).map(toOptions));
}

export async function run(inter)
{
	const price = inter.options.getSubcommand() === "price";
	const appid = inter.options.getString("game");
	const name = getAppName(appid) || "This game";
	const unwatched = unwatch(appid, inter.guild, price) !== false;
	const trKey = `unwatch.${price ? "price" : "news"}-${unwatched ? "unwatched" : "unchanged"}`;
	inter.reply({
		ephemeral: true,
		content: tr.get(inter.locale, trKey, name),
	});

	if(unwatched)
		updateCmd(inter.guild);
}
