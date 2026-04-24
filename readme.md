### lurker

lurker is a selfhostable, read-only reddit client. it is
better than old-reddit because:

- it renders well on mobile
- it respects `prefers-color-scheme`
- no account necessary to subscribe to subreddits
- no account necessary for over-18 content

**This fork has authentication removed** — no login/register
required. Just open the app and browse Reddit immediately.
Subscriptions are shared globally.

### features

- minimal use of client-side javascript
- global subscription system (no per-user auth)
- pagination
- comment collapsing, jump-to-next/prev comment
- "search on undelete" url for deleted comments
- over-18, spoiler images are hidden by default

### setup with docker compose

```yaml
services:
  lurker:
    build: .
    container_name: lurker
    volumes:
      - ./data:/data
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - LURKER_PORT=3000
```

then:

```bash
docker compose up --build
```

### environment variables

- `LURKER_PORT`: port to listen on, defaults to `3000`.
- `LURKER_THEME`: name of CSS theme file. The file must be present in `src/public`.

### technical

lurker uses an sqlite db to store subscriptions. it creates
`lurker.db` in the data directory.

### usage

open the app in your browser. if you have no subscriptions
you'll be redirected to `/r/all`. you can subscribe to
subreddits by clicking the subscribe button on any subreddit
page.
