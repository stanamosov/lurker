### lurker

**This fork has authentication removed** — no login/register
required. Just open the app and browse Reddit immediately.
Subscriptions are shared globally.

### setup with docker compose

```yaml
services:
  lurker:
    build: .
    container_name: lurker
    network_mode: bridge
    volumes:
      - ./data:/data
    ports:
      - "9795:9795"
    restart: unless-stopped
    environment:
      - LURKER_PORT=9795
```

then:

```bash
# build and start
docker compose up --build -d

# stop and remove
docker compose down

# view logs
docker compose logs -f

# rebuild after making changes
docker compose down && docker compose up --build -d
```

### environment variables

- `LURKER_PORT`: port to listen on, I have replaced default port `3000` with `9795`.
- `LURKER_THEME`: name of CSS theme file. The file must be present in `src/public`.

## Reddit → Lurker Redirect

Tampermonkey Script that redirects Reddit URLs to local Lurker instance.

### Features

- Redirect posts
- Redirect subreddits
- Supports redd.it links
- Works with Linkding workflow


## Configuration

Change:

`const lurkerBaseUrl = 'http://YOUR_LURKER_IP';`

```javascript
// ==UserScript==
// @name         Redirect Reddit to Lurker (Full)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Redirect all Reddit URLs to Lurker
// @match        *://*.reddit.com/*
// @match        *://reddit.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const lurkerBaseUrl = 'http://YOUR_LURKER_IP';

    const path = window.location.pathname;
    const query = window.location.search;

    let newUrl = null;

    // Match full post URLs
    // /r/sub/comments/postid/title
    const postRegex =
        /^\/r\/([^/]+)\/comments\/([a-zA-Z0-9]{6,8})(?:\/.*)?/;

    // Match short post links
    // /comments/postid
    const shortPostRegex =
        /^\/comments\/([a-zA-Z0-9]{6,8})(?:\/.*)?/;

    // Match subreddit (with or without trailing slash)
    const subredditRegex =
        /^\/r\/([^/]+)\/?$/;

    // Match user profiles
    const userRegex =
        /^\/(u|user)\/([^/]+)\/?/;

    // POST URL
    let match = path.match(postRegex);
    if (match) {
        const subreddit = match[1];
        const postId = match[2];

        newUrl =
            `${lurkerBaseUrl}/comments/${postId}?from=/r/${subreddit}${query}`;
    }

    // SHORT POST
    else if ((match = path.match(shortPostRegex))) {
        const postId = match[1];

        newUrl =
            `${lurkerBaseUrl}/comments/${postId}${query}`;
    }

    // SUBREDDIT
    else if ((match = path.match(subredditRegex))) {
        const subreddit = match[1];

        newUrl =
            `${lurkerBaseUrl}/r/${subreddit}${query}`;
    }

    // USER PROFILE
    else if ((match = path.match(userRegex))) {
        const username = match[2];

        newUrl =
            `${lurkerBaseUrl}/u/${username}${query}`;
    }

    // ROOT → homepage
    else if (path === '/') {
        newUrl = `${lurkerBaseUrl}/`;
    }

    if (newUrl) {
        window.location.replace(newUrl);
    }

})();
```