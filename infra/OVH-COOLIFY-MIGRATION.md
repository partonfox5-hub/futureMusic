# FutureMusic staging on the shared 8 GB OVH VPS

Source reviewed: `master` at `8dd2334b79e7170b65d8945487bfed6481c6073b`.
This preparation leaves the current Google Cloud build/deployment and default
storage behavior intact. It does not copy data, change DNS, or provision a server.

## Application setup

1. In Coolify, connect `partonfox5-hub/futureMusic` and a reviewed migration branch.
   Use **Dockerfile**, build context `/`, Dockerfile path `/Dockerfile.coolify`,
   internal port **8080**, and a private staging hostname.
2. Start with a **768 MiB container memory limit**, **1 CPU limit**, and one
   replica. This is a starting budget to verify under traffic, not a measured
   production requirement. The Node heap is capped at 512 MiB by this Dockerfile;
   native buffers and process overhead use additional memory.
3. Enter environment values from `.env.coolify.example` in Coolify. Use a
   **restored copy** of the MySQL database on a private Docker network. Remove
   `INSTANCE_CONNECTION_NAME`; set `DB_HOST`, `DB_PORT`, and a dedicated app user.
   Do not expose MySQL's port to the internet.
4. The Docker health probe `/healthz` checks that the process responds. Use
   `/readyz` to verify database access. A process can be healthy while the
   database is unavailable. If MySQL was unavailable at initial boot, restart
   the app after MySQL becomes ready: the existing pool initialization does
   not retry after its first failure.
5. A preview hostname requires matching `DOMAIN`, `GAME_URL`/allowed CORS origin,
   OAuth redirect URLs, and Stripe return/webhook URLs as appropriate. Test
   against Stripe's test credentials; production keys can create real charges.
   Keep the real domain and production DNS on Google Cloud until cutover.

## Databases and sessions

`server.js` and Lattice use **MySQL** through `mysql2`. The installed `pg` and
`connect-pg-simple` packages are not active database/session connections in the
reviewed server. Match the source MySQL major version for the first restore;
do not substitute PostgreSQL or MariaDB during migration.

The existing application uses Express's in-memory session store and in-memory
carts/rate limits. Restarting the container loses its sessions; multiple
replicas would not share those sessions. Keep one replica initially and
schedule a durable session-store change separately after validating auth and
checkout requirements. Back up the MySQL databases to independent storage,
and verify a restore before changing production traffic.

## Private bucket dependencies remain during staging

Off-Google compute needs explicit Google Storage credentials: Cloud Run's
service-account identity is not available on OVH. Supply credentials via a
read-only secret mount and `GOOGLE_APPLICATION_CREDENTIALS`, or a supported
workload-identity configuration. Grant only required bucket access and URL
signing capability. Never put credential JSON in GitHub, a Docker layer, or
chat. Existing secret values also need to be moved from Cloud Run or Secret
Manager; GitHub source does not contain them.

The reviewed default bucket is `futuremusic`. Known operations/object paths:

| Feature | Objects | Storage operations |
| --- | --- | --- |
| Ad streaming | `ads/<filename>` | Time-limited signed reads |
| Purchased song downloads | `songs/<download_reference>` from MySQL | Service-account lookup and signed reads after ownership check |
| Hero Slayer download | `downloads/hero-slayer-alpha.zip`, or `HERO_SLAYER_GCS_PATH` | Existence check and signed reads after purchase check |
| Zoom maps | `zoom/maps/<id>.json` and `.r<rev>.json` | List, read, write, delete; local cache |
| Horde maps | `horde/maps/<id>.json` and index | List, read, write, delete; local cache |
| Evidence videos | `evidence/video1.mp4`, `evidence/video2.mp4` | Direct Google Storage URLs in `server.js` |

Ad streaming currently hardcodes `futuremusic`; other download routes mostly
use `GCS_BUCKET_NAME`. Confirm actual Cloud Run environment values and enumerate
all bucket objects, versions, metadata, ACLs and size before deciding where to
copy them. The opt-in OVH S3 adapter covers listing, reads, writes, deletes,
existence checks and signed read URLs while preserving private purchase checks.
Direct evidence URLs still require access review. Do not delete the Google bucket until
object counts/checksums, private downloads and map save/delete/revision behavior
have passed tests on the destination.

## Optional private OVH S3 storage

`OBJECT_STORAGE_PROVIDER` defaults to `gcs`. Select `s3` only after the imported
copy has been verified. The adapter maps the one logical `GCS_BUCKET_NAME`
to the explicit destination `S3_BUCKET_NAME`, retaining every object key.
Supply `S3_ENDPOINT` (HTTPS service endpoint, without a bucket path),
`S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` in Coolify secrets.
Use `S3_FORCE_PATH_STYLE=true` only if required by the chosen endpoint/bucket;
virtual-hosted access is the default. Confirm the region/endpoint in OVH rather
than substituting the VPS region automatically.

The destination must remain **private**. There is no ACL/public-upload helper
in this adapter and no automatic bucket-policy change. Existing ownership
checks run before paid read URLs are signed; map writes/deletes retain their
home-write middleware. The app needs bucket listing and object read/write/delete
permissions for its own bucket, not account-wide administration. Asset URLs
expire after the same requested 15-minute or 1-hour interval. Browsers retrieve
files and byte ranges directly from S3, avoiding large download buffers on the
shared VPS. Application map reads remain buffered as in the existing GCS code.

Map writes preserve JSON content type, cache control, and map revision/name
metadata. S3 metadata keys become lowercase; non-ASCII values use RFC 2047
encoding so the original UTF-8 text survives HTTP transport. The `resumable`
flag on small JSON map saves maps to a normal S3 PUT. This adapter is not a
bulk bucket migration tool and does not copy object versions, ACLs, holds or
retention policies; those require a separately verified migration procedure.

`EVIDENCE_BASE_URL` optionally replaces the base of the two evidence-video
URLs. Its default remains the existing Google URL, including in S3 mode.
Do **not** point it at an unsigned private S3 URL or make the bucket public.
First verify whether those two source objects are intentionally public, and
provide an authorized serving mechanism with the same visibility. This remains
a cutover prerequisite; the adapter does not add a public evidence-signing route.

Run `npm run test:storage` for offline adapter, pagination, private signing,
paid ownership, and actual Zoom/Horde handler round-trip tests. These use fake
credentials and an in-memory S3 client; they do not contact cloud storage.
They do not replace a destination smoke test for OVH permissions, browser
range responses, imported objects, metadata and content disposition.

Implementation references: [AWS SDK v3 S3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html),
[AWS object metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html),
[OVH S3 endpoint formats](https://docs.ovhcloud.com/en/guides/storage-and-backup/object-storage/s3-post-object-upload).

## Disk, builds, and mutable paths

The reviewed Git tree contains **1,851,923,981 bytes** (about 1.73 GiB) of files,
mostly browser games, models, textures, audio and video. Repository size does
not mean that much RAM is needed. Clones, Docker context/layers and build cache
take additional disk. The current Cloud Build file documents buildpack export
out-of-memory failures and uses Docker on an 8-vCPU builder with a 120 GB disk.
Keep Docker builds, run only one app build at a time, and monitor disk usage.
Building on GitHub Actions and deploying a container image is a later option
if builds disrupt the shared server; do not add recurring image history until
registry retention is configured.

The Dockerfile uses the existing `.dockerignore`, which excludes development
tools, secrets, node_modules, `voice-studio`, and several bulky archives. It
retains live game assets. The separate Coolify Dockerfile runs as the `node`
user and assigns `/app` content to that user. Use UID/GID 1000 ownership when
preparing writable host mounts.

Known container-local writes:

- `/app/public/games/zoom/saved`
- `/app/public/games/horde/saved`
- `/app/public/games/rampart-reborn/forks`
- `/app/public/games/rampart-reborn/registry.json`
- `/app/raw/rampart-uploads`

Confirm what exists in production and back it up before replacing containers.
Configure persistent mounts for required mutable content, but do not blindly
mount an empty directory over all of `/app/public` or the Rampart game: that
would hide shipped assets. Rampart fork uploads are currently disabled in
source. The separate `voice-studio` Python project is excluded from the web
image and is not part of this deployment.

## Before moving Namecheap DNS

Verify key public pages and game assets; MySQL users/orders/products and Lattice;
registration/login/logout; mail; Stripe test checkout and webhook; private song
and Hero Slayer downloads; video ranges; and map reads/writes/deletes. Check
ownership restrictions, TLS/cookies, correct client IP through Coolify's one
trusted proxy, CORS and OAuth callbacks. Inventory external URLs too: SEO data
includes a separately hosted `*.run.app` mobile game which this repository
does not migrate.

Import a final database copy during an agreed write pause, verify it again,
then change only the necessary Namecheap website DNS records to OVH. Preserve
email MX/TXT records and retain the old Google service/data for rollback until
production validation is complete. Disable duplicate Google build triggers
only after the destination deployment path is verified.
