require("dotenv").config();

const {
  getCosmosUsersContainer,
  getCosmosAuditContainer
} = require("../src/config/cosmosClient");

async function migrateAuditEvents() {
  const usersContainer = getCosmosUsersContainer();
  const auditContainer = getCosmosAuditContainer();

  const iterator = usersContainer.items.query({
    query: "SELECT * FROM c WHERE c.type = @type",
    parameters: [{ name: "@type", value: "audit" }]
  }, {
    maxItemCount: 100
  });

  let copied = 0;
  let skipped = 0;
  let pages = 0;

  while (iterator.hasMoreResults() && pages < 1000) {
    const { resources } = await iterator.fetchNext();
    pages += 1;

    if (!resources || resources.length === 0) {
      break;
    }

    for (const event of resources) {
      try {
        await auditContainer.items.upsert(event);
        copied += 1;
      } catch (error) {
        if (error.code === 409) {
          skipped += 1;
        } else {
          throw error;
        }
      }
    }
  }

  return { copied, skipped, pages };
}

if (require.main === module) {
  migrateAuditEvents()
    .then((result) => {
      console.log(JSON.stringify({
        success: true,
        ...result
      }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        success: false,
        message: error.message
      }));
      process.exitCode = 1;
    });
}

module.exports = {
  migrateAuditEvents
};
