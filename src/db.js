const { Database } = require("bun:sqlite");
const db = new Database("lurker.db", {
	strict: true,
});

// subs table - global subscriptions, no user dependency
db.run(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subreddit TEXT UNIQUE
  )
`);

module.exports = { db };
