"use strict";

const {
  GetObjectCommand, PutObjectCommand, HeadObjectCommand,
  DeleteObjectCommand, ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

function s3ClientConfig(env) {
  for (const key of ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET_NAME", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
    if (!env[key]) throw new Error(key + " is required when OBJECT_STORAGE_PROVIDER=s3");
  }
  let endpoint;
  try { endpoint = new URL(env.S3_ENDPOINT); } catch (_) { throw new Error("S3_ENDPOINT must be a valid HTTPS service endpoint"); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/") {
    throw new Error("S3_ENDPOINT must be HTTPS with no credentials, query, fragment or bucket path");
  }
  if (!/^[a-zA-Z0-9-]+$/.test(env.S3_REGION)) throw new Error("S3_REGION must be a region identifier");
  if (![undefined, "", "true", "false"].includes(env.S3_FORCE_PATH_STYLE)) throw new Error("S3_FORCE_PATH_STYLE must be true or false");
  return {
    endpoint: endpoint.origin,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    // Explicit app credentials avoid inheriting an unrelated AWS profile/role.
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    maxAttempts: 3,
  };
}

function missingObject(error) {
  if (error && error.name === "NoSuchBucket") return false;
  return Boolean(error && (error.name === "NoSuchKey" || error.name === "NotFound" || error.$metadata?.httpStatusCode === 404));
}

function customMetadata(metadata) {
  const headers = {};
  for (const [key, value] of Object.entries(metadata || {})) {
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error("Unsupported object metadata key");
    const text = String(value);
    // S3 custom metadata is case insensitive. RFC 2047 keeps Unicode map names
    // safe in HTTP headers without losing the original UTF-8 value.
    headers[key.toLowerCase()] = /^[\x20-\x7e]*$/.test(text)
      ? text : "=?UTF-8?B?" + Buffer.from(text).toString("base64") + "?=";
  }
  return headers;
}

// Only the Google Storage method subset actually used by FutureMusic is exposed.
// No ACL writes, public upload helpers, service-account API, or bucket creation.
function createS3Storage({ client, sourceBucket, destinationBucket, signUrl = getSignedUrl, now = Date.now }) {
  if (!client || !sourceBucket || !destinationBucket) throw new Error("S3 client and explicit source/destination bucket mapping are required");

  function file(name) {
    if (typeof name !== "string" || !name || name.includes("\0")) throw new Error("Object key must be a nonempty string");
    const target = { Bucket: destinationBucket, Key: name };
    return {
      name,
      async download() {
        const response = await client.send(new GetObjectCommand(target));
        if (!response.Body || typeof response.Body.transformToByteArray !== "function") throw new Error("Object response body is missing");
        return [Buffer.from(await response.Body.transformToByteArray())];
      },
      async save(body, options = {}) {
        if (options.public || options.predefinedAcl || options.acl || options.metadata?.acl) {
          throw new Error("This adapter only writes private objects; ACL changes are unsupported");
        }
        const metadata = options.metadata || {};
        await client.send(new PutObjectCommand({
          ...target,
          Body: body,
          ContentType: options.contentType || metadata.contentType,
          CacheControl: metadata.cacheControl,
          Metadata: customMetadata(metadata.metadata),
        }));
        // Existing map writes are small buffered JSON; resumable=true needs no
        // multipart upload here. Large asset migration uses separate copy tools.
      },
      async exists() {
        try { await client.send(new HeadObjectCommand(target)); return [true]; }
        catch (error) { if (missingObject(error)) return [false]; throw error; }
      },
      async delete(options = {}) {
        if (!options.ignoreNotFound) {
          const [exists] = await this.exists();
          if (!exists) { const error = new Error("Object not found"); error.code = 404; throw error; }
        }
        try { await client.send(new DeleteObjectCommand(target)); }
        catch (error) { if (!(options.ignoreNotFound && missingObject(error))) throw error; }
      },
      async getSignedUrl(options = {}) {
        if (options.action !== "read") throw new Error("Only signed read URLs are supported");
        const expires = options.expires instanceof Date ? options.expires.getTime() : Number(options.expires);
        const expiresIn = Math.floor((expires - now()) / 1000);
        if (!Number.isFinite(expiresIn) || expiresIn < 1 || expiresIn > 604800) throw new Error("Signed read expiry must be in the next 1 second to 7 days");
        if (options.responseDisposition && /[\r\n]/.test(options.responseDisposition)) throw new Error("Invalid content disposition");
        const command = new GetObjectCommand({
          ...target,
          ResponseContentDisposition: options.responseDisposition,
        });
        // Do not sign a Range header: browsers can request video/download byte
        // ranges directly from S3 using this URL, without buffering in Node.
        return [await signUrl(client, command, { expiresIn })];
      },
    };
  }

  return {
    bucket(name) {
      if (name !== sourceBucket) throw new Error("Bucket is outside the configured storage mapping");
      return {
        file,
        async getFiles({ prefix = "", autoPaginate = true } = {}) {
          const files = [];
          let token;
          do {
            const response = await client.send(new ListObjectsV2Command({
              Bucket: destinationBucket, Prefix: prefix, ContinuationToken: token,
            }));
            for (const entry of response.Contents || []) if (entry.Key) files.push(file(entry.Key));
            if (!autoPaginate || !response.IsTruncated) break;
            if (!response.NextContinuationToken || response.NextContinuationToken === token) throw new Error("Object listing returned an invalid continuation token");
            token = response.NextContinuationToken;
          } while (true);
          return [files];
        },
      };
    },
  };
}

module.exports = { createS3Storage, s3ClientConfig };
