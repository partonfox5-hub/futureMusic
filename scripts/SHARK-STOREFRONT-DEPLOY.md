# Shark Game storefront deployment

Prepared for the existing Clouvider-hosted FutureMusic Express application. Do not use the retired Google Cloud Run deployment pipeline.

## Contents

- `/shark-game`: US$9.99 direct Quest APK purchase page.
- Homepage banner immediately after Battle Sphere Arena; Projects card immediately after its card.
- Stripe hosted card checkout, signed existing `/webhook` fulfillment, optional confirmation email, and private paid downloads.
- Product-specific purchase and privacy wording. Website APK purchases do not grant Meta Store ownership.

## Required server setup

1. Inspect the existing service, working directory, process manager and environment before making changes. Preserve existing `.env`, uploads, database and unrelated local edits. Back up the application revision and files being changed.
2. Deploy the prepared code and six WebP images from branch `codex/shark-storefront`. No new dependency is required. The new module uses existing Express, Stripe, EJS, sessions and Nodemailer dependencies.
3. Place the signed APK outside the public web directory, at `private-downloads/Shark-Quest.apk` under the application, or configure `SHARK_APK_PATH` to an absolute private path. Do not put it in `public/` or commit it to Git.
   - Release: **0.6.0**, Android code **7**, package `com.futuremusic.shark`.
   - Bytes: **162240809**.
   - SHA-256: **FD2F0EA7EB9DDE662869442916FFE8B200D8209FE6E8FA5AFCFB7B4550206EE8**.
4. Preserve the existing live `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. The canonical store origin defaults to `https://futuremusic.online`. A public deployment requires a live Stripe key; test-mode payments cannot grant production downloads. Do not print credentials in logs.
5. Ensure the Stripe webhook for `https://futuremusic.online/webhook` receives `checkout.session.completed` events. Only card payments are offered, so delayed payment methods are not enabled. Verify the existing signing secret matches the live endpoint.
6. Keep `SHARK_ORDER_DIR` (default `private-downloads/shark-orders`) on persistent private storage, writable by the Node service. Back it up with other application data. It stores a checkout reference, fulfillment time and email delivery flag, never payment-card details. Use one Node process for this file-backed email delivery state; multiple workers require a shared transactional fulfillment store.
7. Existing SMTP/Gmail transport configuration is reused if present. Paid buyers can still access their download if email delivery is unavailable. Webhook fulfillment retries an email failure.
8. Restart/reload the existing service using its existing process manager. Do not change other hosted sites or their routing.

## Validation before opening sales

- Run `node --test scripts/test-shark-store.cjs` with dependencies installed: **25 tests passed** locally, with mocked payments and no charges.
- Check the new page, homepage stripe and Projects card on desktop and mobile. Preview screenshots are saved in the Codex task's `outputs/website/` directory.
- Confirm the deployment serves all six `/images/shark-game/*.webp` images.
- Check `/api/shark-game/download` without a purchase returns **400**, and that no public URL serves the private APK or order records.
- Check checkout is disabled if the APK or live payment configuration is absent.
- Verify live Stripe connectivity and webhook registration without charging a card. A real paid transaction requires the owner's explicit payment authorization and spending limit.
- A verified paid download should use `Content-Disposition: attachment`, no-store caching and no-referrer policy. Invalid, unpaid, wrong-product, refunded or disputed purchases must fail closed.

## Rollback

Restore the backed-up code revision and reload the existing application. Keep the private APK and fulfillment records intact for existing buyers. If sales must be paused while retaining downloads, remove only the checkout form/route availability; do not delete purchase records or disable verification for paid downloads.

## Current status

Prepared and tested locally. Production deployment is waiting for working Clouvider access on this laptop. A Git push alone does not confirm that the migrated website has updated.
