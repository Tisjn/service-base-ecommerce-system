const {
  CreateTableCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");
const { dynamoClient } = require("../src/config/dynamo");
const env = require("../src/config/env");

async function exists(TableName) {
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName }));
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function createRoomsTable() {
  const TableName = env.dynamo.roomsTable;
  if (await exists(TableName)) {
    console.log(`${TableName} already exists`);
    return;
  }

  await dynamoClient.send(
    new CreateTableCommand({
      TableName,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "roomId", AttributeType: "S" },
        { AttributeName: "customerId", AttributeType: "S" },
        { AttributeName: "status", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "roomId", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: "customerId-createdAt-index",
          KeySchema: [
            { AttributeName: "customerId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "status-createdAt-index",
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    }),
  );
  console.log(`created ${TableName}`);
}

async function createMessagesTable() {
  const TableName = env.dynamo.messagesTable;
  if (await exists(TableName)) {
    console.log(`${TableName} already exists`);
    return;
  }

  await dynamoClient.send(
    new CreateTableCommand({
      TableName,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "roomId", AttributeType: "S" },
        { AttributeName: "sentAt", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "roomId", KeyType: "HASH" },
        { AttributeName: "sentAt", KeyType: "RANGE" },
      ],
    }),
  );
  console.log(`created ${TableName}`);
}

async function main() {
  await createRoomsTable();
  await createMessagesTable();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
