
# Steam News

[![Discord Bots](https://top.gg/api/widget/status/929757212841226292.svg)](https://top.gg/bot/929757212841226292)
[![Discord Bots](https://top.gg/api/widget/servers/929757212841226292.svg)](https://top.gg/bot/929757212841226292)
[![Discord Bots](https://top.gg/api/widget/upvotes/929757212841226292.svg)](https://top.gg/bot/929757212841226292)

This bot allows you to watch Steam game news. My friend Damn3d had the idea.

Do check out [Steam Watch](https://github.com/dukeofsussex/SteamWatch) by DukeOfSussex as well.

### Translation credits

- French: Morgân von Brylân
- German: jemand2001

# Usage
This bot requires Node.JS 16 or higher.

You will need an `auth.json` file in the same folder as `bot.js` widht the following data:
```JSON
{
	"token": "your bot's authentication token",
 	"master": "your user id",
	"adminServer": "the id of the server where the admin commands will be available, for you",
	"dblToken": "(optional) your bot's Top.gg token",
	"debug": false,

	"supportServer": "(optional) The invite to your support server"
}
```
`debug` should be `true` in development and `false` (or not set) in production. In debug mode, commands are created as server commands for quicker updating. They are global commands otherwise. Also, commands under the `debug` subfolder are ignored unless in debug mode.

To start the bot, run `node bot.js`

## Database schema
Just read steam_news/db.js, there is a bunch of CREATE TABLE at the beginning.

# License
**Steam News** is published under GNU General Public Licence v3 (GPL-3.0). See COPYING.txt, or this link: [https://www.gnu.org/licenses/gpl-3.0.en.html](https://www.gnu.org/licenses/gpl-3.0.en.html)

![GPL](https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/GPLv3_Logo.svg/240px-GPLv3_Logo.svg.png)
