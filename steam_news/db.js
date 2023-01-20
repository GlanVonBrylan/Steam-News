"use strict";

const db = module.exports = exports = new require("better-sqlite3")(__dirname+"/watchers.db");

const DB_VERSION = 3;

db.run = function(sql, ...params) { return this.prepare(sql).run(...params); }

db.exec(`
CREATE TABLE IF NOT EXISTS Apps (
	appid INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	nsfw BOOLEAN DEFAULT NULL,
	latest TEXT DEFAULT NULL,
	lastPrice INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS Watchers (
	appid INTEGER,
	guildId TEXT,
	channelId TEXT NOT NULL,
	PRIMARY KEY (appId, guildId),
	CONSTRAINT fk_appid FOREIGN KEY (appid) REFERENCES Apps(appid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PriceWatchers (
	appid INTEGER,
	guildId TEXT,
	channelId TEXT NOT NULL,
	PRIMARY KEY (appId, guildId),
	CONSTRAINT fk_price_appid FOREIGN KEY (appid) REFERENCES Apps(appid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Guilds (
	id TEXT PRIMARY KEY,
	cc TEXT NOT NULL
);
`);

try {
	db.exec(`-- No "IF NOT EXISTS", we WANT this to crash if it already exists
		CREATE TABLE DB_Version (version INTEGER PRIMARY KEY);
		INSERT INTO DB_Version VALUES (${DB_VERSION});`);
} catch {}

	const currentVersion = db.prepare("SELECT version FROM DB_VERSION").pluck().get();
	if(currentVersion < DB_VERSION)
	{
		// Upgrade database
		switch(currentVersion)
		{
		case 1:
			db.exec("ALTER TABLE Apps ADD lastPrice INTEGER DEFAULT NULL;");
			// no break; !
		case 2:
			// No ALTER COLUMN in SQLite :(
			db.exec(`CREATE TABLE sqlb_temp_table_1 (id TEXT PRIMARY KEY, cc TEXT NOT NULL);
			INSERT INTO sqlb_temp_table_1 (id, cc) SELECT id, cc FROM Guilds;
			DROP TABLE Guilds;
			ALTER TABLE sqlb_temp_table_1 RENAME TO Guilds;`);
		}

		db.run("UPDATE DB_Version SET version = ?", DB_VERSION);
	}

const getAllCC = db.prepare("SELECT id, cc FROM Guilds");
const setCC = db.prepare("INSERT INTO Guilds (id, cc) VALUES ($id, $cc)");
const updateCC = db.prepare("UPDATE Guilds SET cc = $cc WHERE id = $id");

const stmts = exports.stmts = {
	insertApp: db.prepare("INSERT INTO Apps (appid, name, nsfw, latest, lastPrice) VALUES (?, ?, ?, ?, ?)"),

	isAppKnown: db.prepare("SELECT 1 FROM Apps WHERE appid = ?"),
	getAppInfo: db.prepare("SELECT * FROM Apps WHERE appid = ?"),
	getAppName: db.prepare("SELECT name FROM Apps WHERE appid = ?").pluck(),
	isAppNSFW: db.prepare("SELECT nsfw FROM Apps WHERE appid = ?").pluck(),
	getPrice: db.prepare("SELECT lastPrice FROM Apps WHERE appid = ?").pluck(),

	watch: db.prepare("INSERT INTO Watchers (appid, guildId, channelId) VALUES (?, ?, ?)"),
	unwatch: db.prepare("DELETE FROM Watchers WHERE appid = ? AND guildid = ?"),
	findWatchedApps: db.prepare("SELECT DISTINCT appid FROM Watchers").pluck(),
	getWatchers: db.prepare("SELECT channelId FROM Watchers WHERE appid = ?").pluck(),
	getWatchedApps: db.prepare(`SELECT a.appid, name, nsfw, channelId
		FROM Apps a JOIN Watchers w ON (a.appid = w.appid)
		WHERE guildId = ?
		ORDER BY name`),
	updateLatest: db.prepare("UPDATE Apps SET latest = $latest WHERE appid = $appid"),

	watchPrice: db.prepare("INSERT INTO PriceWatchers (appid, guildId, channelId) VALUES (?, ?, ?)"),
	unwatchPrice: db.prepare("DELETE FROM PriceWatchers WHERE appid = ? AND guildid = ?"),
	findWatchedPrices: db.prepare("SELECT appid, name, nsfw, lastPrice FROM Apps a WHERE EXISTS (SELECT '*' FROM PriceWatchers WHERE appid = a.appid)"),
	getPriceWatchers: db.prepare(`SELECT guildId, channelId, COALESCE(cc, 'US') "cc"
		FROM PriceWatchers LEFT JOIN Guilds ON id = guildId WHERE appid = ?`),
	getWatchedPrices: db.prepare(`SELECT a.appid, name, lastPrice, nsfw, channelId
		FROM Apps a JOIN PriceWatchers w ON (a.appid = w.appid)
		WHERE guildId = ?
		ORDER BY name`),
	updateLastPrice: db.prepare("UPDATE Apps SET lastPrice = $lastPrice WHERE appid = $appid"),

	getCC: db.prepare("SELECT cc FROM Guilds WHERE id = ?").pluck(),
	setCC: {run: (id, cc) => updateCC.run({id, cc}).changes || setCC.run({id, cc}).changes},
	getAllCC: {readonly: true, all: (indexById = true) => {
		if(!indexById) return getAllCC.all();
		const ccs = {};
		for(const {id, cc} of getAllCC.all())
			ccs[id] = cc;
		return ccs;
	}},

	purgeGuild: db.prepare("DELETE FROM Watchers WHERE guildId = ?"),
	purgeChannel: db.prepare("DELETE FROM Watchers WHERE channelId = ?"),
};

const getAll = [
	"getWatchers", "getWatchedApps", "findWatchedApps",
	"getPriceWatchers", "getWatchedPrices", "findWatchedPrices",
	"getAllCC",
];

for(const [name, stmt] of Object.entries(stmts))
	stmts[name] = stmt[stmt.readonly ? (getAll.includes(name) ? "all" : "get") : "run"].bind(stmt);
