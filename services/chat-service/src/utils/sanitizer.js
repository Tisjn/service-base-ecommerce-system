function sanitizeText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 2000);
}

module.exports = { sanitizeText };
