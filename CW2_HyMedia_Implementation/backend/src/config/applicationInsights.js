const appInsights = require("applicationinsights");

function setupApplicationInsights() {
  const connectionString = process.env.APPINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.log("Application Insights not configured. Running without telemetry.");
    return;
  }

  appInsights
    .setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .start();

  console.log("Application Insights telemetry enabled.");
}

module.exports = setupApplicationInsights;