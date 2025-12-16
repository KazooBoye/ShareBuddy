/**
 * Rule-based content filters (fast, deterministic checks)
 */

const logger = require('../utils/logger');

// Common spam/inappropriate patterns
const SPAM_PATTERNS = [
  /\b(buy now|click here|limited offer|act now)\b/gi,
  /\b(viagra|cialis|pharmacy)\b/gi,
  /\b(casino|poker|gambling)\b/gi,
  /\$\$\$+/g,
  /!!!{3,}/g
];

const PROFANITY_LIST = [
  // Add language-specific profanity here
  // This is a basic example - expand based on your needs
];

function applyRuleBasedChecks(text, metadata) {
  const flags = {};
  let score = 1.0; // Start with perfect score
  let shouldReject = false;

  if (!text || text.trim().length === 0) {
    // No text content, rely on metadata
    flags.no_text_content = true;
    score = 0.8; // Slightly lower score but not rejected
  } else {
    // Check 1: Spam patterns
    let spamCount = 0;
    SPAM_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        spamCount += matches.length;
      }
    });

    if (spamCount > 3) {
      flags.spam_detected = true;
      score -= 0.3;
    }

    // Check 2: Excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 50) {
      flags.excessive_caps = true;
      score -= 0.1;
    }

    // Check 3: Profanity (basic check)
    const lowerText = text.toLowerCase();
    const profanityCount = PROFANITY_LIST.filter(word => 
      lowerText.includes(word)
    ).length;

    if (profanityCount > 2) {
      flags.profanity_detected = true;
      score -= 0.2;
    }

    // Check 4: Repetitive content
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.3 && words.length > 20) {
      flags.repetitive_content = true;
      score -= 0.15;
    }
  }

  // Check 5: Metadata checks
  if (metadata.title) {
    const title = metadata.title.toLowerCase();
    
    // Suspicious title patterns
    if (title.includes('test') && title.includes('ignore')) {
      flags.test_document = true;
      score -= 0.2;
    }
  }

  // Check 6: File size checks
  if (metadata.file_size) {
    const sizeInMB = metadata.file_size / (1024 * 1024);
    
    // Very small files might be spam/test
    if (sizeInMB < 0.01) {
      flags.suspiciously_small = true;
      score -= 0.1;
    }
  }

  // Determine if should reject immediately
  if (score < 0.3) {
    shouldReject = true;
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    flags,
    shouldReject
  };
}

module.exports = {
  applyRuleBasedChecks
};
