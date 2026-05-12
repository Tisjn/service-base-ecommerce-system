const db = require("../config/db");

async function findByEmail(email) {
  const [rows] = await db.query(
    "SELECT id, email, password, full_name AS fullName, role, status, avatar_url AS avatarUrl FROM users WHERE email = ? LIMIT 1",
    [email],
  );

  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query(
    "SELECT id, email, password, full_name AS fullName, role, status, avatar_url AS avatarUrl FROM users WHERE id = ? LIMIT 1",
    [id],
  );

  return rows[0] || null;
}

async function createUser({
  email,
  password,
  fullName,
  avatarUrl = null,
  role = "customer",
  status = "active",
}) {
  const [result] = await db.query(
    "INSERT INTO users (email, password, full_name, role, status, avatar_url) VALUES (?, ?, ?, ?, ?, ?)",
    [email, password, fullName, role, status, avatarUrl],
  );

  return {
    id: result.insertId,
    email,
    fullName,
    avatarUrl,
    role,
    status,
  };
}

async function updatePassword(email, password) {
  const [result] = await db.query(
    "UPDATE users SET password = ? WHERE email = ?",
    [password, email],
  );
  return result.affectedRows > 0;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updatePassword,
};
