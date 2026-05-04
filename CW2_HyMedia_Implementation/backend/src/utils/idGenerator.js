import crypto from "crypto";

export const generateAssetId = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

  const randomPart = crypto.randomUUID().split("-")[0];

  return "asset_" + timestamp + "_" + randomPart;
};
