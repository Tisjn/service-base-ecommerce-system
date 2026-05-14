const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const env = require("./env");

const clientOptions = { region: env.aws.region };

if (env.aws.accessKeyId && env.aws.secretAccessKey) {
  clientOptions.credentials = {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  };
}

const dynamoClient = new DynamoDBClient(clientOptions);
const ddb = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

module.exports = { dynamoClient, ddb };
