// Security configuration and constants
export const SecurityConfig = {
  // JWT Configuration
  JWT: {
    SECRET_MIN_LENGTH: 32,
    EXPIRES_IN: "24h",
    ALGORITHM: "HS256" as const,
    ISSUER: "inventory-api",
  },

  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false,
    MAX_LENGTH: 128,
  },

  // Rate Limiting
  RATE_LIMIT: {
    GLOBAL: {
      MAX_REQUESTS: 1000,
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    },
    AUTH: {
      MAX_REQUESTS: 5,
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    },
    API: {
      MAX_REQUESTS: 100,
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    },
  },

  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || ["*"],
    ALLOWED_METHODS: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-Requested-With"],
    MAX_AGE: 86400, // 24 hours
  },

  // Request Body Limits
  BODY_LIMIT: {
    DEFAULT: "1mb",
    FILE_UPLOAD: "10mb",
  },

  // Session Configuration
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    SECURE: process.env.NODE_ENV === "production",
    HTTP_ONLY: true,
    SAME_SITE: "strict" as const,
  },

  // Security Headers
  HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 year
    CONTENT_SECURITY_POLICY: {
      DEFAULT_SRC: ["'self'"],
      SCRIPT_SRC: ["'self'", "'unsafe-inline'"],
      STYLE_SRC: ["'self'", "'unsafe-inline'"],
      IMG_SRC: ["'self'", "data:", "https:"],
    },
  },

  // Input Sanitization
  SANITIZATION: {
    TRIM_STRINGS: true,
    REMOVE_HTML: true,
    MAX_STRING_LENGTH: 1000,
  },
} as const;
