const { S3Client } = require("@aws-sdk/client-s3");
const env = require("./config/env");

const hasS3Config = Boolean(
  env.aws.bucket && env.aws.accessKeyId && env.aws.secretAccessKey,
);

const s3 = hasS3Config
  ? new S3Client({
      region: env.aws.region,
      credentials: {
        accessKeyId: env.aws.accessKeyId,
        secretAccessKey: env.aws.secretAccessKey,
      },
    })
  : null;

module.exports = { s3, hasS3Config };
