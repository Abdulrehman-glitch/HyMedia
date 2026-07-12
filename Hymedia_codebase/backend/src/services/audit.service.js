const crypto = require("crypto");
const { getCosmosAuditContainer } = require("../config/cosmosClient");

async function recordAuditEvent(event) {
  try {
    const container = getCosmosAuditContainer();
    const now = new Date().toISOString();
    const auditId = crypto.randomUUID();

    await container.items.create({
      id: auditId,
      auditId,
      type: "audit",
      action: event.action,
      actorUserId: event.actorUserId || "",
      actorEmail: event.actorEmail || "",
      targetType: event.targetType || "",
      targetId: event.targetId || "",
      requestId: event.requestId || "",
      ipAddress: event.ipAddress || "",
      userAgent: event.userAgent || "",
      metadata: event.metadata || {},
      createdAt: now
    });
  } catch (error) {
    console.warn("Audit event was not recorded:", error.message);
  }
}

function auditFromRequest(req, details) {
  return recordAuditEvent({
    ...details,
    actorUserId: details.actorUserId || req.user?.userId || "",
    actorEmail: details.actorEmail || req.user?.email || "",
    requestId: req.requestId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || ""
  });
}

module.exports = {
  recordAuditEvent,
  auditFromRequest
};
