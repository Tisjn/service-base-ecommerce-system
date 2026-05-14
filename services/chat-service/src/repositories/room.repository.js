const {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { ddb } = require("../config/dynamo");
const env = require("../config/env");

const TableName = env.dynamo.roomsTable;

async function findById(roomId) {
  const result = await ddb.send(new GetCommand({ TableName, Key: { roomId } }));
  return result.Item || null;
}

async function findActiveByCustomer(customerId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName,
      IndexName: "customerId-createdAt-index",
      KeyConditionExpression: "customerId = :customerId",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":customerId": String(customerId),
        ":status": "active",
      },
      ScanIndexForward: false,
      Limit: 20,
    }),
  );
  return (result.Items || [])[0] || null;
}

async function create(room) {
  await ddb.send(new PutCommand({ TableName, Item: room }));
  return room;
}

async function listForCustomer(customerId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName,
      IndexName: "customerId-createdAt-index",
      KeyConditionExpression: "customerId = :customerId",
      ExpressionAttributeValues: { ":customerId": String(customerId) },
      ScanIndexForward: false,
    }),
  );
  return result.Items || [];
}

async function listForAdmin(status) {
  if (status) {
    const result = await ddb.send(
      new QueryCommand({
        TableName,
        IndexName: "status-createdAt-index",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status },
        ScanIndexForward: false,
      }),
    );
    return result.Items || [];
  }

  const result = await ddb.send(new ScanCommand({ TableName }));
  return (result.Items || []).sort((a, b) =>
    String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)),
  );
}

async function assignAdmin(roomId, adminId) {
  const now = new Date().toISOString();
  const result = await ddb.send(
    new UpdateCommand({
      TableName,
      Key: { roomId },
      UpdateExpression: "SET adminId = if_not_exists(adminId, :adminId), updatedAt = :now",
      ExpressionAttributeValues: {
        ":adminId": String(adminId),
        ":now": now,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes;
}

async function markClosed(roomId) {
  const now = new Date().toISOString();
  const result = await ddb.send(
    new UpdateCommand({
      TableName,
      Key: { roomId },
      UpdateExpression: "SET #status = :status, updatedAt = :now, closedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "closed",
        ":now": now,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes;
}

async function updateLastMessage(roomId, message) {
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName,
      Key: { roomId },
      UpdateExpression:
        "SET lastMessage = :lastMessage, lastMessageAt = :lastMessageAt, updatedAt = :now",
      ExpressionAttributeValues: {
        ":lastMessage": message.message || message.fileUrl || "",
        ":lastMessageAt": message.timestamp,
        ":now": now,
      },
    }),
  );
}

module.exports = {
  assignAdmin,
  create,
  findActiveByCustomer,
  findById,
  listForAdmin,
  listForCustomer,
  markClosed,
  updateLastMessage,
};
