"use strict";

// GCS stays the default. S3 is selected only after data and access are verified.
function createObjectStorage(env = process.env) {
  const provider = (env.OBJECT_STORAGE_PROVIDER || "gcs").trim().toLowerCase();
  const bucketName = env.GCS_BUCKET_NAME || "futuremusic";
  if (provider === "gcs") {
    const { Storage } = require("@google-cloud/storage");
    return {
      provider,
      bucketName,
      storage: new Storage({ projectId: env.GOOGLE_CLOUD_PROJECT || "futuremusic" }),
    };
  }
  if (provider !== "s3") throw new Error("OBJECT_STORAGE_PROVIDER must be gcs or s3");
  const { S3Client } = require("@aws-sdk/client-s3");
  const { createS3Storage, s3ClientConfig } = require("./s3-storage");
  return {
    provider,
    bucketName,
    storage: createS3Storage({
      client: new S3Client(s3ClientConfig(env)),
      sourceBucket: bucketName,
      destinationBucket: env.S3_BUCKET_NAME,
    }),
  };
}

module.exports = { createObjectStorage };
