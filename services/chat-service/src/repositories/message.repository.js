const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb } = require("../config/dynamo");
const env = require("../config/env");

const TableName = env.dynamo.messagesTable;

async function save(message) {
  await ddb.send(new PutCommand({ TableName, Item: message }));
  return message;
}

async function listByRoom(roomId, { limit = 50, cursor } = {}) {
  const result = await ddb.send(
    new QueryCommand({
      TableName,
      KeyConditionExpression: "roomId = :roomId",
      ExpressionAttributeValues: { ":roomId": roomId },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor
        ? JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
        : undefined,
    }),
  );

  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey), "utf8").toString("base64url")
    : null;

  return {
    items: (result.Items || []).reverse(),
    nextCursor,
  };
}

module.exports = { listByRoom, save };
