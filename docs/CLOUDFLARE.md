# Nivet League on Cloudflare Workers

The game already runs as JavaScript in the player's browser. Its HTML contains the engine, models, textures, audio and interface. A Cloudflare Worker can host that game, but it does not render WebGL or replace the 120 Hz Phoenix multiplayer server. The existing Pages and Bunny URLs can continue working.

There are two ready options. Neither provisions a paid database, object bucket or multiplayer service.

## Live deployment — 10.1.0

[Play Nivet League on Cloudflare](https://nivet-league.jikdifn.workers.dev/). The new `nivet-league` Worker serves the exact 10.1.0 browser build as static assets. Existing Workers were not overwritten. Its only bindings are `ASSETS` and the public `GAME_BUILD` version; Workers Caching is disabled, and no paid plan or additional resource was enabled.

Root GET and HEAD return 200, `/health` reports 10.1.0, and an unknown route returns 404. The deployed HTML is 16,783,916 bytes with SHA-256 `5d4f3c8e58caa19901c8e5fcb72971920721c51583ed0fbddc1930dba4029bb5`. Deployment identifier: `6ffb7d7a64e345cba35df9f0368f5ed7`.

The connector-assisted upload used scoped, short-lived asset tokens; temporary token files were removed after activation. `scripts/cloudflare-assets.cjs` prepares bounded manifests, verifies package hashes and uploads only to Cloudflare's fixed asset API. The package retains the usual Wrangler route below for future manual deployments.

## Recommended: tiny Worker plus static assets

`cloudflare/worker.mjs` handles `/health` and errors. The actual game is served as a Cloudflare static asset, ahead of the Worker. This avoids parsing the large game as Worker code and allows the normal static-asset delivery path.

From the game repository folder:

```sh
node scripts/build.cjs
node scripts/build-worker.cjs
```

The second command prints an absolute output directory, normally `../../outputs/nivet-cloudflare`. It contains:

- `worker.mjs`: the small server script.
- `wrangler.jsonc`: static-asset configuration and current game version.
- `public/index.html`: an exact copy of the playable build.
- `public/_headers`: cache revalidation and harmless security headers.
- `public/release.json` and `manifest.json`: release/hash information.
- `worker-paste.mjs`: the alternative below.

If deploying yourself, install Node.js and use the official Wrangler CLI. Sign in to your intended Cloudflare account, then deploy the generated configuration:

```sh
npx wrangler@4 login
npx wrangler@4 deploy --config ../../outputs/nivet-cloudflare/wrangler.jsonc
```

The proposed name is `nivet-league`. If that name belongs to an unrelated app in your account, choose a different name in the generated configuration rather than overwriting it. There are no scheduled jobs or paid-resource bindings in this package. The `/health` response identifies the static host; multiplayer health remains on the existing Phoenix endpoint.

## Alternative: paste one JS file in the dashboard

Use `cloudflare/worker-paste.mjs` when you want to paste JavaScript into a Worker without uploading assets.

1. Open **Workers & Pages** in Cloudflare, then the Worker intended for this game.
2. Select **Edit code**.
3. Replace its sample code with the complete contents of `worker-paste.mjs`.
4. Select **Deploy** and open the Worker's public URL.

That script streams the current game from the fixed GitHub Pages URL. It accepts only GET/HEAD at `/` or `/index.html`, has a local `/health`, never accepts a query-selected upstream, and does not forward cookies or authorization headers. It follows future Pages releases. This is convenient, but the game still depends on Pages and each game fetch invokes Worker code. The static-asset option above is preferable for a permanent host.

## Multiplayer from a new Worker URL

The game continues to connect directly to `wss://tevin-161-153-26-154.sslip.io/play`. The dedicated server checks the exact website Origin. Before online play on a new hostname, add that verified full HTTPS origin to the server's existing allowlist. Do not use a wildcard or replace the Pages/Bunny origins. Offline AI and practice do not require that change.

New-host browser saves are separate from saves on the old site because browser storage is scoped to the origin. The old URLs keep their saved preferences. Export local progress on the old site before switching if you want a backup; this release does not silently read another site's storage.

## Cost and limits checked 2026-10-28

- Cloudflare documents static-asset requests as **free and unlimited**, with no additional asset-storage cost. The asset-first configuration sends only `/health` and unmatched paths through Worker code. [Static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- On the **Workers Free** plan, Worker-code requests have a 100,000-per-day allowance and 10 ms CPU limit per invocation. The paste-only alternative uses this allowance for each game request. This package does not upgrade the account or enable the Paid plan. Existing account subscriptions, if any, are separate. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- Each static file may be at most **25 MiB**. The builder checks this before creating the package. Current Worker code limits are different from historical advice: the official page now lists **64 MiB uncompressed** and a one-second startup limit; the game is deliberately kept as an asset regardless. [Platform limits](https://developers.cloudflare.com/workers/platform/limits/)

No billing change is required for this architecture. If a console asks you to upgrade or add a payment plan, stop at that prompt; deployment should use the existing Free option. A hosted game still consumes the existing Oracle service and its existing limits.

## Validation

The Worker tests cover health, HEAD, unsupported methods, bounded paths, fixed upstream, credential stripping, streaming response preservation, unavailable origins, exact asset bytes, and the 25 MiB guard. Configuration fields were checked against the current Wrangler schema. The deployment uses an asset-first route rather than an HTML rewrite on every visit.

References: [Static-asset bindings](https://developers.cloudflare.com/workers/static-assets/binding/), [routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
