"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { createS3Storage, s3ClientConfig } = require("../lib/s3-storage");
const { createObjectStorage } = require("../lib/object-storage");

const time = 1800000000000;
const fakeEnv = {
  S3_ENDPOINT: "https://s3.test.example", S3_REGION: "bhs", S3_BUCKET_NAME: "futuremusic-copy",
  S3_ACCESS_KEY_ID: "offline-example-access", S3_SECRET_ACCESS_KEY: "offline-example-secret",
};
function setup(send = async () => ({}), signUrl = async () => "https://signed.example/opaque") {
  const calls = [];
  const client = { async send(command) { calls.push(command); return send(command); } };
  const storage = createS3Storage({ client, sourceBucket: "futuremusic", destinationBucket: "futuremusic-copy", signUrl, now: () => time });
  return { storage, calls, client, file: storage.bucket("futuremusic").file("zoom/maps/map-a.json") };
}
const absent = (name = "NotFound", status = 404) => Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });

test("default provider and logical bucket stay Google Storage", () => {
  const result = createObjectStorage({});
  assert.equal(result.provider, "gcs");
  assert.equal(result.bucketName, "futuremusic");
  assert.equal(typeof result.storage.getServiceAccount, "function");
  assert.throws(() => createObjectStorage({ OBJECT_STORAGE_PROVIDER: "typo" }), /must be gcs or s3/);
});

test("S3 opt-in requires explicit credentials and a safe HTTPS endpoint", () => {
  for (const key of Object.keys(fakeEnv)) {
    const env = { ...fakeEnv }; delete env[key];
    assert.throws(() => s3ClientConfig(env), new RegExp(key + " is required"));
  }
  for (const endpoint of ["http://s3.test.example", "https://user:secret@s3.test.example", "https://s3.test.example/bucket", "https://s3.test.example?secret=x", "https://s3.test.example#fragment"]) {
    assert.throws(() => s3ClientConfig({ ...fakeEnv, S3_ENDPOINT: endpoint }), /HTTPS/);
  }
  assert.equal(s3ClientConfig(fakeEnv).forcePathStyle, false);
  assert.equal(s3ClientConfig({ ...fakeEnv, S3_FORCE_PATH_STYLE: "true" }).forcePathStyle, true);
  assert.throws(() => s3ClientConfig({ ...fakeEnv, S3_FORCE_PATH_STYLE: "yes" }), /true or false/);
  const result = createObjectStorage({ ...fakeEnv, OBJECT_STORAGE_PROVIDER: "s3" });
  assert.equal(result.provider, "s3");
  assert.equal(typeof result.storage.getServiceAccount, "undefined");
});

test("unknown logical buckets and empty object keys fail before any request", () => {
  const { storage, calls } = setup();
  assert.throws(() => storage.bucket("another-private-bucket"), /outside/);
  for (const key of ["", "nul\0key"]) assert.throws(() => storage.bucket("futuremusic").file(key), /nonempty/);
  assert.equal(calls.length, 0);
});

test("map writes preserve content type, cache control and Unicode metadata without ACL", async () => {
  const { file, calls } = setup();
  await file.save('{"rev":3}', { contentType: "application/json", resumable: true, metadata: {
    cacheControl: "no-store, max-age=0", metadata: { mapName: "Café 🎵", rev: "3", updated: "123" },
  } });
  assert(calls[0] instanceof PutObjectCommand);
  const input = calls[0].input;
  assert.equal(input.Bucket, "futuremusic-copy");
  assert.equal(input.Key, "zoom/maps/map-a.json");
  assert.equal(input.Body, '{"rev":3}');
  assert.equal(input.ContentType, "application/json");
  assert.equal(input.CacheControl, "no-store, max-age=0");
  assert.equal(input.Metadata.rev, "3");
  assert.equal(input.Metadata.mapname, "=?UTF-8?B?" + Buffer.from("Café 🎵").toString("base64") + "?=");
  assert.equal(Object.hasOwn(input, "ACL"), false);
  for (const options of [{ public: true }, { predefinedAcl: "publicRead" }, { metadata: { acl: [] } }]) {
    await assert.rejects(file.save("data", options), /only writes private objects/);
  }
  assert.equal(calls.length, 1);
});

test("map downloads preserve Buffer-returning GCS shape", async () => {
  const { file, calls } = setup(async () => ({ Body: { async transformToByteArray() { return Buffer.from('{"rev":3}'); } } }));
  const [data] = await file.download();
  assert(Buffer.isBuffer(data));
  assert.equal(data.toString("utf8"), '{"rev":3}');
  assert(calls[0] instanceof GetObjectCommand);
  assert.equal(calls[0].input.Bucket, "futuremusic-copy");
});

test("exists distinguishes missing keys from denied access or a missing bucket", async () => {
  assert.deepEqual(await setup().file.exists(), [true]);
  assert.deepEqual(await setup(async () => { throw absent(); }).file.exists(), [false]);
  assert.deepEqual(await setup(async () => { throw absent("NoSuchKey"); }).file.exists(), [false]);
  await assert.rejects(setup(async () => { throw absent("AccessDenied", 403); }).file.exists(), /AccessDenied/);
  await assert.rejects(setup(async () => { throw absent("NoSuchBucket"); }).file.exists(), /NoSuchBucket/);
});

test("delete ignores only missing objects when requested", async () => {
  const removed = setup();
  await removed.file.delete({ ignoreNotFound: true });
  assert.equal(removed.calls.length, 1);
  assert(removed.calls[0] instanceof DeleteObjectCommand);
  await setup(async () => { throw absent(); }).file.delete({ ignoreNotFound: true });
  await assert.rejects(setup(async () => { throw absent("AccessDenied", 403); }).file.delete({ ignoreNotFound: true }), /AccessDenied/);
  const missing = setup(async () => { throw absent(); });
  await assert.rejects(missing.file.delete(), /Object not found/);
  assert(missing.calls[0] instanceof HeadObjectCommand);
  assert.equal(missing.calls.length, 1);
});

test("list paginates all keys and returns usable file wrappers", async () => {
  const { storage, calls } = setup(async (command) => {
    if (command instanceof GetObjectCommand) return { Body: { async transformToByteArray() { return Buffer.from("map"); } } };
    assert(command instanceof ListObjectsV2Command);
    return command.input.ContinuationToken
      ? { Contents: [{ Key: "horde/maps/b.json" }], IsTruncated: false }
      : { Contents: [{ Key: "horde/maps/a.json" }], IsTruncated: true, NextContinuationToken: "page-2" };
  });
  const [files] = await storage.bucket("futuremusic").getFiles({ prefix: "horde/maps/", autoPaginate: true });
  assert.deepEqual(files.map((file) => file.name), ["horde/maps/a.json", "horde/maps/b.json"]);
  assert.equal(calls[0].input.Prefix, "horde/maps/");
  assert.equal(calls[1].input.ContinuationToken, "page-2");
  assert.equal((await files[1].download())[0].toString(), "map");
});

test("listing handles empty pages and rejects broken pagination instead of looping", async () => {
  assert.deepEqual((await setup().storage.bucket("futuremusic").getFiles())[0], []);
  const broken = setup(async () => ({ IsTruncated: true }));
  await assert.rejects(broken.storage.bucket("futuremusic").getFiles(), /continuation token/);
  const onePage = setup(async () => ({ Contents: [{ Key: "a" }], IsTruncated: true }));
  assert.equal((await onePage.storage.bucket("futuremusic").getFiles({ autoPaginate: false }))[0].length, 1);
  assert.equal(onePage.calls.length, 1);
});

test("private signed reads convert absolute expiry and preserve attachment disposition", async () => {
  let signed;
  const { file, client } = setup(undefined, async (givenClient, command, options) => {
    signed = { givenClient, command, options }; return "https://signed.example/opaque";
  });
  assert.deepEqual(await file.getSignedUrl({ version: "v4", action: "read", expires: time + 900000, responseDisposition: 'attachment; filename="download.zip"' }), ["https://signed.example/opaque"]);
  assert.equal(signed.givenClient, client);
  assert.equal(signed.options.expiresIn, 900);
  assert.equal(signed.command.input.ResponseContentDisposition, 'attachment; filename="download.zip"');
  assert.equal(Object.hasOwn(signed.command.input, "Range"), false);
  for (const expires of [time, time + 500, time - 1000, time + 604801000, NaN]) await assert.rejects(file.getSignedUrl({ action: "read", expires }), /expiry/);
  await assert.rejects(file.getSignedUrl({ action: "write", expires: time + 900000 }), /Only signed read/);
  await assert.rejects(file.getSignedUrl({ action: "read", expires: time + 900000, responseDisposition: "bad\r\nheader" }), /content disposition/);
});

test("real SDK presigning is offline and leaves byte-range headers unrestricted", async () => {
  const client = new S3Client(s3ClientConfig(fakeEnv));
  const storage = createS3Storage({ client, sourceBucket: "futuremusic", destinationBucket: fakeEnv.S3_BUCKET_NAME });
  const [url] = await storage.bucket("futuremusic").file("songs/a file.mp3").getSignedUrl({ action: "read", expires: Date.now() + 900000 });
  const parsed = new URL(url);
  assert.equal(parsed.protocol, "https:");
  assert(Number(parsed.searchParams.get("X-Amz-Expires")) >= 899);
  assert(Number(parsed.searchParams.get("X-Amz-Expires")) <= 900);
  assert.equal(parsed.searchParams.get("X-Amz-SignedHeaders").includes("range"), false);
  assert(parsed.pathname.endsWith("/songs/a%20file.mp3"));
  client.destroy();
});

test("paid download route retains login/ownership checks before S3 signing", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  const start = source.indexOf("app.get('/api/download/:sku'");
  const end = source.indexOf("app.get('/herdorama'", start);
  assert(start >= 0 && end > start);
  async function request(userId, hasOrder) {
    let handler, queries = 0, signatures = 0, signatureOptions;
    const storage = { bucket(name) {
      assert.equal(name, "futuremusic");
      return { file(key) {
        assert.equal(key, "songs/paid.mp3");
        return { async getSignedUrl(options) { signatures++; signatureOptions = options; return ["https://signed.example/paid"]; } };
      } };
    } };
    vm.runInNewContext(source.slice(start, end), {
      app: { get(route, fn) { if (route === "/api/download/:sku") handler = fn; } },
      process: { env: {} }, console: { log() {}, error() {} }, storage, objectStorageProvider: "s3",
      pool: { async query() {
        queries++;
        return queries === 1 ? [hasOrder ? [{ id: 1 }] : []] : [[{ download_reference: "paid.mp3" }]];
      } },
    });
    const response = { code: 200, status(code) { this.code = code; return this; }, send() {}, redirect(url) { this.url = url; } };
    await handler({ params: { sku: "paid" }, session: { userId } }, response);
    return { response, queries, signatures, signatureOptions };
  }
  const loggedOut = await request(undefined, true);
  assert.equal(loggedOut.response.code, 401); assert.equal(loggedOut.queries, 0); assert.equal(loggedOut.signatures, 0);
  const unowned = await request(1, false);
  assert.equal(unowned.response.code, 403); assert.equal(unowned.signatures, 0);
  const owned = await request(1, true);
  assert.equal(owned.response.url, "https://signed.example/paid"); assert.equal(owned.signatures, 1);
  assert.equal(owned.signatureOptions.action, "read"); assert.equal(owned.signatureOptions.serviceAccountEmail, undefined);
});

test("actual Zoom and Horde map handlers round-trip through the private adapter", async () => {
  const objects = new Map();
  const { storage } = setup(async (command) => {
    const input = command.input;
    if (command instanceof PutObjectCommand) { objects.set(input.Key, Buffer.from(input.Body)); return {}; }
    if (command instanceof GetObjectCommand) {
      if (!objects.has(input.Key)) throw absent("NoSuchKey");
      return { Body: { async transformToByteArray() { return objects.get(input.Key); } } };
    }
    if (command instanceof DeleteObjectCommand) { objects.delete(input.Key); return {}; }
    if (command instanceof ListObjectsV2Command) return { Contents: [...objects.keys()].filter((key) => key.startsWith(input.Prefix)).map((Key) => ({ Key })) };
    throw new Error("Unexpected map operation");
  });
  function response() {
    return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  }
  for (const game of ["zoom", "horde"]) {
    const routes = new Map();
    const app = {};
    for (const method of ["get", "post", "delete"]) app[method] = (url, ...handlers) => routes.set(method + " " + url, handlers);
    require(game === "horde" ? "../lib/horde-maps" : "../lib/zoom").mount(app, { storage, bucketName: "futuremusic" });
    const id = "s3-offline-" + game + "-" + process.pid;
    const localFile = path.join(__dirname, "../public/games", game, "saved", id + ".json");
    try {
      const posted = response();
      const postHandlers = routes.get("post /api/" + game + "/maps");
      assert.equal(postHandlers[0], require("../lib/write-gate").requireHomeWrite);
      await postHandlers.at(-1)({ body: { id, cells: "00", name: "Offline map", rev: 3 } }, posted);
      assert.equal(posted.code, 200); assert.equal(posted.body.remote, true); assert.equal(posted.body.rev, 3);
      assert(objects.has(game + "/maps/" + id + ".json"));
      const read = response();
      await routes.get("get /api/" + game + "/maps/:id").at(-1)({ params: { id }, query: game === "zoom" ? { rev: "3" } : {} }, read);
      assert.equal(read.body.id, id); assert.equal(read.body.rev, 3);
      if (game === "zoom") assert(objects.has("zoom/maps/" + id + ".r3.json"));
      else assert(objects.has("horde/maps/_index.json"));
      const removed = response();
      const deleteHandlers = routes.get("delete /api/" + game + "/maps/:id");
      assert.equal(deleteHandlers[0], require("../lib/write-gate").requireHomeWrite);
      await deleteHandlers.at(-1)({ params: { id } }, removed);
      assert.equal(removed.body.ok, true);
      assert.equal(objects.has(game + "/maps/" + id + ".json"), false);
    } finally {
      // Remove only this test's uniquely named cache file; no game assets/data.
      if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
    }
  }
});
