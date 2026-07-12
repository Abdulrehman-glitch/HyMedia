const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const app = require("../server");

function request(appInstance, pathName) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      http.get({ hostname: "127.0.0.1", port, path: pathName }, (response) => {
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
              body
            });
          });
        });
      }).on("error", (error) => {
        server.close(() => reject(error));
      });
    });
  });
}

test("health endpoint responds", async () => {
  const response = await request(app, "/health");
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, "healthy");
  assert.equal(body.service, "hymedia-frontend");
});

test("SPA fallback returns index.html with security headers", async () => {
  const response = await request(app, "/gallery/deep-link");

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.match(response.body, /<div id="app">|HyMedia/i);
});

test("index loads configuration before application code", () => {
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const configIndex = index.indexOf("config.js");
  const appIndex = index.indexOf("app.js");

  assert.ok(configIndex > -1);
  assert.ok(appIndex > -1);
  assert.ok(configIndex < appIndex);
});

test("index includes moderator queue hooks", () => {
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(index, /id="moderationPanel"/);
  assert.match(index, /id="moderationQueueList"/);
  assert.match(index, /id="refreshModerationBtn"/);
});

test("index includes admin role management hooks", () => {
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(index, /id="adminPanel"/);
  assert.match(index, /id="adminUsersList"/);
  assert.match(index, /id="refreshAdminUsersBtn"/);
});
