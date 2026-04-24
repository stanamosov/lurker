const express = require("express");
const he = require("he");
const geddit = require("../geddit.js");
const { db } = require("../db");

const router = express.Router();
const G = new geddit.Geddit();

const commonRenderOptions = {
	theme: process.env.LURKER_THEME,
};

// GET /
router.get("/", async (req, res) => {
	const subs = db.query("SELECT * FROM subscriptions").all();

	const qs = req.query ? "?" + new URLSearchParams(req.query).toString() : "";

	if (subs.length === 0) {
		res.redirect(`/r/all${qs}`);
	} else {
		const p = subs.map((s) => s.subreddit).join("+");
		res.redirect(`/r/${p}${qs}`);
	}
});

// GET /r/:id
router.get("/r/:subreddit", async (req, res) => {
	const subreddit = req.params.subreddit;
	const isMulti = subreddit.includes("+");
	const query = req.query ? req.query : {};
	if (!query.sort) {
		query.sort = "hot";
	}
	if (!query.view) {
		query.view = "compact";
	}

	let isSubbed = false;
	if (!isMulti) {
		isSubbed =
			db
				.query("SELECT * FROM subscriptions WHERE subreddit = $subreddit")
				.get({ subreddit }) !== null;
	}
	const postsReq = G.getSubmissions(query.sort, `${subreddit}`, query);
	const aboutReq = G.getSubreddit(`${subreddit}`);

	const [posts, about] = await Promise.all([postsReq, aboutReq]);

	if (query.view == "card" && posts && posts.posts) {
		posts.posts.forEach(unescape_selftext);
	}

	res.render("index", {
		subreddit,
		posts,
		about,
		query,
		isMulti,
		isSubbed,
		currentUrl: req.url,
		...commonRenderOptions,
	});
});

// GET /comments/:id
router.get("/comments/:id", async (req, res) => {
	const id = req.params.id;

	const params = {
		limit: 50,
	};
	response = await G.getSubmissionComments(id, params);
	res.render("comments", {
		data: unescape_submission(response),
		from: req.query.from,
		query: req.query,
		...commonRenderOptions,
	});
});

// GET /comments/:parent_id/comment/:child_id
router.get("/comments/:parent_id/comment/:child_id", async (req, res) => {
	const parent_id = req.params.parent_id;
	const child_id = req.params.child_id;

	const params = {
		limit: 50,
	};
	response = await G.getSingleCommentThread(parent_id, child_id, params);
	const comments = response.comments;
	comments.forEach(unescape_comment);
	res.render("single_comment_thread", {
		comments,
		parent_id,
		...commonRenderOptions,
	});
});

// GET /subs
router.get("/subs", async (req, res) => {
	const subs = db
		.query("SELECT * FROM subscriptions ORDER by LOWER(subreddit)")
		.all();

	res.render("subs", {
		subs,
		query: req.query,
		...commonRenderOptions,
	});
});

// GET /search
router.get("/search", async (req, res) => {
	res.render("search", {
		query: req.query,
		...commonRenderOptions,
	});
});

// GET /sub-search
router.get("/sub-search", async (req, res) => {
	if (!req.query || !req.query.q) {
		res.render("sub-search", { ...commonRenderOptions });
	} else {
		const { items, after } = await G.searchSubreddits(req.query.q);
		const subs = db
			.query("SELECT subreddit FROM subscriptions")
			.all()
			.map((res) => res.subreddit);
		const message =
			items.length === 0
				? "no results found"
				: `showing ${items.length} results`;
		res.render("sub-search", {
			items,
			subs,
			after,
			message,
			original_query: req.query.q,
			query: req.query,
			...commonRenderOptions,
		});
	}
});

// GET /post-search
router.get("/post-search", async (req, res) => {
	if (!req.query || !req.query.q) {
		res.render("post-search", { ...commonRenderOptions });
	} else {
		const { items, after } = await G.searchSubmissions(req.query.q);
		const message =
			items.length === 0
				? "no results found"
				: `showing ${items.length} results`;

		if (req.query.view == "card" && items) {
			items.forEach(unescape_selftext);
		}

		res.render("post-search", {
			items,
			after,
			message,
			original_query: req.query.q,
			currentUrl: req.url,
			query: req.query,
			...commonRenderOptions,
		});
	}
});

// GET /media
router.get("/media/*", async (req, res) => {
	const url = req.params[0];
	const ext = url.split(".").pop().toLowerCase();
	const kind = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
		? "img"
		: "video";
	res.render("media", { kind, url, ...commonRenderOptions });
});

// POST /subscribe
router.post("/subscribe", async (req, res) => {
	const { subreddit } = req.body;
	const existingSubscription = db
		.query("SELECT * FROM subscriptions WHERE subreddit = $subreddit")
		.get({ subreddit });
	if (existingSubscription) {
		res.status(400).send("Already subscribed to this subreddit");
	} else {
		db.query(
			"INSERT INTO subscriptions (subreddit) VALUES ($subreddit)",
		).run({ subreddit });
		res.status(201).send("Subscribed successfully");
	}
});

router.post("/unsubscribe", async (req, res) => {
	const { subreddit } = req.body;
	const existingSubscription = db
		.query("SELECT * FROM subscriptions WHERE subreddit = $subreddit")
		.get({ subreddit });
	if (existingSubscription) {
		db.query("DELETE FROM subscriptions WHERE subreddit = $subreddit").run({
			subreddit,
		});
		res.status(200).send("Unsubscribed successfully");
	} else {
		res.status(400).send("Subscription not found");
	}
});

module.exports = router;

function unescape_submission(response) {
	const post = response.submission.data;
	const comments = response.comments;

	unescape_selftext(post);
	comments.forEach(unescape_comment);

	return { post, comments };
}

function unescape_selftext(post) {
	// If called after getSubmissions
	if (post.data && post.data.selftext_html) {
		post.data.selftext_html = he.decode(post.data.selftext_html);
	}
	// If called after getSubmissionComments
	if (post.selftext_html) {
		post.selftext_html = he.decode(post.selftext_html);
	}
}

function unescape_comment(comment) {
	if (comment.data.body_html) {
		comment.data.body_html = he.decode(comment.data.body_html);
	}
	if (comment.data.replies) {
		if (comment.data.replies.data) {
			if (comment.data.replies.data.children) {
				comment.data.replies.data.children.forEach(unescape_comment);
			}
		}
	}
}
