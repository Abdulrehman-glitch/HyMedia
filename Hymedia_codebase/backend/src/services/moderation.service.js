const MODERATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  SENSITIVE: "sensitive",
  QUARANTINED: "quarantined",
  REMOVED: "removed"
};

const highRiskTerms = [
  "terror",
  "extremist",
  "self harm",
  "suicide",
  "kill myself",
  "child sexual",
  "revenge porn",
  "rape",
  "bomb making"
];

const sensitiveTerms = [
  "nsfw",
  "explicit",
  "adult",
  "violent",
  "blood",
  "gore",
  "weapon",
  "hate"
];

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildModerationText(payload) {
  const tags = Array.isArray(payload.tags) ? payload.tags.join(" ") : payload.tags || "";
  return normalizeText([payload.title, payload.caption, payload.location, tags].join(" "));
}

function scoreText(text, terms) {
  return terms.filter((term) => text.includes(term)).length;
}

function moderateAssetCandidate(payload = {}) {
  const text = buildModerationText(payload);
  const highRiskScore = scoreText(text, highRiskTerms);
  const sensitiveScore = scoreText(text, sensitiveTerms);
  const reasons = [];

  let status = MODERATION_STATUS.APPROVED;

  if (highRiskScore > 0) {
    status = MODERATION_STATUS.QUARANTINED;
    reasons.push("high-risk-text-match");
  } else if (sensitiveScore > 0 || payload.isSensitive || payload.isAdult18Plus) {
    status = MODERATION_STATUS.SENSITIVE;
    reasons.push(payload.isAdult18Plus ? "uploader-marked-18-plus" : "sensitive-policy-match");
  }

  return {
    moderationStatus: status,
    moderationProvider: "local-policy",
    moderationCheckedAt: new Date().toISOString(),
    moderationScores: {
      highRiskText: highRiskScore,
      sensitiveText: sensitiveScore
    },
    moderationReasons: reasons,
    requiresHumanReview: status === MODERATION_STATUS.QUARANTINED
  };
}

function applyModeratorDecision(asset, decision, moderatorNote = "") {
  const now = new Date().toISOString();
  const updates = {
    moderationCheckedAt: now,
    moderationReviewedAt: now,
    moderationReviewerNote: moderatorNote,
    requiresHumanReview: false
  };

  if (decision === "approve") {
    return {
      ...updates,
      moderationStatus: MODERATION_STATUS.APPROVED,
      isSensitive: false
    };
  }

  if (decision === "mark_sensitive") {
    return {
      ...updates,
      moderationStatus: MODERATION_STATUS.SENSITIVE,
      isSensitive: true
    };
  }

  if (decision === "quarantine") {
    return {
      ...updates,
      moderationStatus: MODERATION_STATUS.QUARANTINED,
      requiresHumanReview: true
    };
  }

  if (decision === "remove") {
    return {
      ...updates,
      moderationStatus: MODERATION_STATUS.REMOVED,
      removedAt: now
    };
  }

  return {};
}

module.exports = {
  MODERATION_STATUS,
  moderateAssetCandidate,
  applyModeratorDecision
};
