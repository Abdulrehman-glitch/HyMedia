const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

process.env.NODE_ENV = "test";
process.env.APPINSIGHTS_CONNECTION_STRING = "";

const app = require("../server");
const {
  MODERATION_STATUS,
  moderateAssetCandidate,
  applyModeratorDecision
} = require("../src/services/moderation.service");
const { signupSchema } = require("../src/validators/auth.validators");
const {
  assetCreateSchema,
  assetUpdateSchema,
  shareLinkCreateSchema
} = require("../src/validators/assets.validators");
const { updateUserRoleSchema } = require("../src/validators/admin.validators");
const { getJwtSecret } = require("../src/middleware/auth.middleware");
const { parseRefreshToken, sanitizeSession } = require("../src/services/sessions.service");
const {
  assetListQuerySchema,
  assetIdParamSchema
} = require("../src/validators/assets.validators");
const {
  PERMISSIONS,
  hasPermission,
  permissionsForRole,
  normalizeRole
} = require("../src/security/permissions");
const { sanitizeAsset } = require("../src/serializers/assets.serializer");

function request(appInstance, path) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      http.get({ hostname: "127.0.0.1", port, path }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          server.close(() => {
            resolve({
              statusCode: response.statusCode,
              headers: response.headers,
              body: JSON.parse(body)
            });
          });
        });
      }).on("error", (error) => {
        server.close(() => reject(error));
      });
    });
  });
}

test("health endpoint responds without Azure dependencies", async () => {
  const response = await request(app, "/api/v1/health");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "healthy");
  assert.equal(response.body.service, "hymedia-backend-api");
});

test("signup validation enforces strong passwords", () => {
  const weak = signupSchema.safeParse({
    displayName: "HyMedia User",
    email: "user@example.com",
    password: "password"
  });

  assert.equal(weak.success, false);
});

test("asset update validation rejects unknown fields", () => {
  const parsed = assetUpdateSchema.safeParse({
    title: "Updated title",
    ownerId: "not-client-controlled"
  });

  assert.equal(parsed.success, false);
});

test("asset creation rejects client-controlled storage fields", () => {
  const parsed = assetCreateSchema.safeParse({
    title: "Forged metadata",
    blobName: "assets/forged.mp4",
    blobUrl: "https://example.com/forged.mp4"
  });

  assert.equal(parsed.success, false);
});

test("JWT secret has no source-code fallback", () => {
  const existingSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  assert.throws(() => getJwtSecret(), /JWT_SECRET is missing/);

  if (existingSecret) {
    process.env.JWT_SECRET = existingSecret;
  }
});

test("admin role validation allows only supported roles", () => {
  assert.equal(updateUserRoleSchema.safeParse({ role: "moderator" }).success, true);
  assert.equal(updateUserRoleSchema.safeParse({ role: "organisation_admin" }).success, true);
  assert.equal(updateUserRoleSchema.safeParse({ role: "platform_admin" }).success, true);
  assert.equal(updateUserRoleSchema.safeParse({ role: "owner" }).success, false);
});

test("role permissions support fine-grained access checks", () => {
  assert.equal(hasPermission({ role: "moderator" }, PERMISSIONS.MODERATION_REVIEW), true);
  assert.equal(hasPermission({ role: "user" }, PERMISSIONS.MODERATION_REVIEW), false);
  assert.equal(hasPermission({ role: "platform_admin" }, PERMISSIONS.USER_MANAGE_ROLES), true);
  assert.equal(normalizeRole("organization_admin"), "organisation_admin");
  assert.ok(permissionsForRole("creator").includes(PERMISSIONS.ASSET_SHARE));
});

test("asset route validators reject unsafe query and route input", () => {
  assert.equal(assetListQuerySchema.safeParse({ limit: "25", offset: "0", mediaType: "image" }).success, true);
  assert.equal(assetListQuerySchema.safeParse({ limit: "1000" }).success, false);
  assert.equal(assetListQuerySchema.safeParse({ ownerId: "not-allowed" }).success, false);
  assert.equal(assetIdParamSchema.safeParse({ assetId: "asset-123" }).success, true);
  assert.equal(assetIdParamSchema.safeParse({ assetId: "" }).success, false);
});

test("asset serializer hides direct blob storage internals", () => {
  const serialized = sanitizeAsset({
    assetId: "asset-123",
    title: "Private media",
    blobName: "assets/2026/private.jpg",
    blobUrl: "https://storage.example/media/private.jpg",
    _etag: "\"etag-value\"",
    _rid: "rid",
    _self: "self",
    _attachments: "attachments",
    _ts: 123
  });

  assert.equal(serialized.blobUrl, "");
  assert.equal(serialized.hasMedia, true);
  assert.equal(serialized.etag, "\"etag-value\"");
  assert.equal(Object.hasOwn(serialized, "blobName"), false);
  assert.equal(Object.hasOwn(serialized, "_rid"), false);
});

test("share link validation limits lifetime", () => {
  assert.equal(shareLinkCreateSchema.safeParse({ expiresInHours: 24, permission: "view" }).success, true);
  assert.equal(shareLinkCreateSchema.safeParse({ expiresInHours: 9999, permission: "view" }).success, false);
  assert.equal(shareLinkCreateSchema.safeParse({ expiresInHours: 12, permission: "download" }).success, false);
});

test("session helpers parse tokens and hide token hashes", () => {
  assert.deepEqual(parseRefreshToken("session-id.secret-value"), {
    sessionId: "session-id",
    secret: "secret-value"
  });

  const sanitized = sanitizeSession({
    sessionId: "session-id",
    userId: "user-id",
    tokenHash: "secret-hash",
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
    expiresAt: "2026-07-19T00:00:00.000Z"
  }, "session-id");

  assert.equal(sanitized.current, true);
  assert.equal(Object.hasOwn(sanitized, "tokenHash"), false);
});

test("local moderation quarantines high-risk text and supports decisions", () => {
  const moderation = moderateAssetCandidate({
    title: "Bomb making guide",
    caption: "Unsafe upload"
  });

  assert.equal(moderation.moderationStatus, MODERATION_STATUS.QUARANTINED);
  assert.equal(moderation.requiresHumanReview, true);

  const approved = applyModeratorDecision({}, "approve", "reviewed");
  assert.equal(approved.moderationStatus, MODERATION_STATUS.APPROVED);
  assert.equal(approved.requiresHumanReview, false);
});
