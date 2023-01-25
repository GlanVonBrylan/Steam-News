"use strict";

const { stmts: {getStats} } = require("../steam_news/db");

exports.dmPermission = true;
exports.run = async inter => {
	const t = tr.set(inter.locale, "stats");
	const stats = getStats();

	inter.reply({embeds: [{
		title: "Steam News statistics",
		fields: [
			{ name: t("watchers"), value: ""+stats.watchers, inline: true },
			{ name: t("games-watched"), value: ""+stats.watchedApps, inline: true },
			{ name: t("most-watched"), value: `${stats.maxName} *(${t("n-watchers", stats.maxWatchers)})*` },
			{ name: t("price-watchers"), value: ""+stats.priceWatchers, inline: true },
			{ name: t("prices-watched"), value: ""+stats.watchedPrices, inline: true },
		],
		footer:{ text: t("active-since") },
		timestamp: inter.client.application.createdAt.toISOString(),
	}]}).catch(error);
}
