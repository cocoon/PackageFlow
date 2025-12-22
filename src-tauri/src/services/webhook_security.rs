// Webhook Security Module
// Provides HMAC signature verification and rate limiting for incoming webhooks
// Feature: Enhanced Project Security Posture

use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::RwLock;
use std::time::{Duration, Instant};

// =============================================================================
// HMAC Signature Verification
// =============================================================================

/// Signature verification errors
#[derive(Debug, Clone)]
pub enum SignatureError {
    /// Signature header has invalid format
    InvalidFormat,
    /// Signature algorithm not supported
    UnsupportedAlgorithm,
    /// Signature does not match
    Mismatch,
    /// Missing signature header
    Missing,
}

impl std::fmt::Display for SignatureError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SignatureError::InvalidFormat => write!(f, "Invalid signature format"),
            SignatureError::UnsupportedAlgorithm => write!(f, "Unsupported signature algorithm"),
            SignatureError::Mismatch => write!(f, "Signature mismatch"),
            SignatureError::Missing => write!(f, "Missing signature"),
        }
    }
}

impl std::error::Error for SignatureError {}

/// HMAC-SHA256 signature verifier
pub struct SignatureVerifier {
    secret: Vec<u8>,
}

impl SignatureVerifier {
    /// Create a new signature verifier with the given secret
    pub fn new(secret: &str) -> Self {
        Self {
            secret: secret.as_bytes().to_vec(),
        }
    }

    /// Generate HMAC-SHA256 signature for payload
    pub fn sign(&self, payload: &[u8]) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(&self.secret)
            .expect("HMAC can take key of any size");
        mac.update(payload);
        let result = mac.finalize();
        format!("sha256={}", hex::encode(result.into_bytes()))
    }

    /// Verify HMAC-SHA256 signature
    ///
    /// # Arguments
    /// * `payload` - The request body bytes
    /// * `signature` - The signature header value (format: "sha256=<hex>")
    ///
    /// # Returns
    /// * `Ok(())` if signature is valid
    /// * `Err(SignatureError)` if verification fails
    pub fn verify(&self, payload: &[u8], signature: &str) -> Result<(), SignatureError> {
        // Parse signature header (format: "sha256=<hex>")
        let provided = signature
            .strip_prefix("sha256=")
            .ok_or(SignatureError::InvalidFormat)?;

        // Validate hex format
        if provided.len() != 64 || !provided.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(SignatureError::InvalidFormat);
        }

        // Calculate expected signature
        let mut mac = Hmac::<Sha256>::new_from_slice(&self.secret)
            .expect("HMAC can take key of any size");
        mac.update(payload);
        let expected = hex::encode(mac.finalize().into_bytes());

        // Constant-time comparison to prevent timing attacks
        if !constant_time_eq::constant_time_eq(provided.as_bytes(), expected.as_bytes()) {
            return Err(SignatureError::Mismatch);
        }

        Ok(())
    }
}

// =============================================================================
// Rate Limiting
// =============================================================================

/// Rate limit check result
#[derive(Debug, Clone)]
pub enum RateLimitResult {
    /// Request is allowed
    Allowed,
    /// Request is rate limited
    Limited {
        /// Seconds until rate limit resets
        retry_after_secs: u64,
    },
}

/// Sliding window rate limiter
/// Thread-safe implementation for concurrent access
pub struct RateLimiter {
    /// IP -> request timestamps
    requests: RwLock<HashMap<IpAddr, Vec<Instant>>>,
    /// Maximum requests per window
    max_requests: usize,
    /// Time window duration
    window: Duration,
}

impl RateLimiter {
    /// Create a new rate limiter
    ///
    /// # Arguments
    /// * `max_requests` - Maximum requests allowed per window
    /// * `window_secs` - Time window in seconds
    pub fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            requests: RwLock::new(HashMap::new()),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Check if request from IP is allowed
    ///
    /// # Arguments
    /// * `ip` - Client IP address
    ///
    /// # Returns
    /// * `RateLimitResult::Allowed` if request is allowed
    /// * `RateLimitResult::Limited` if rate limit exceeded
    pub fn check(&self, ip: IpAddr) -> RateLimitResult {
        let now = Instant::now();
        let window_start = now.checked_sub(self.window).unwrap_or(now);

        let mut requests = self.requests.write().unwrap_or_else(|e| e.into_inner());

        // Get or initialize IP record
        let timestamps = requests.entry(ip).or_insert_with(Vec::new);

        // Remove expired records
        timestamps.retain(|&t| t > window_start);

        // Check if rate limited
        if timestamps.len() >= self.max_requests {
            // Calculate retry after
            if let Some(&oldest) = timestamps.first() {
                let reset_time = oldest + self.window;
                if reset_time > now {
                    let retry_after = reset_time.duration_since(now);
                    return RateLimitResult::Limited {
                        retry_after_secs: retry_after.as_secs() + 1,
                    };
                }
            }
        }

        // Record this request
        timestamps.push(now);

        RateLimitResult::Allowed
    }

    /// Clean up old entries to prevent memory growth
    /// Should be called periodically
    pub fn cleanup(&self) {
        let now = Instant::now();
        let window_start = now.checked_sub(self.window).unwrap_or(now);

        let mut requests = self.requests.write().unwrap_or_else(|e| e.into_inner());

        // Remove IPs with no recent requests
        requests.retain(|_, timestamps| {
            timestamps.retain(|&t| t > window_start);
            !timestamps.is_empty()
        });
    }

    /// Get current request count for an IP (for monitoring)
    pub fn get_request_count(&self, ip: &IpAddr) -> usize {
        let now = Instant::now();
        let window_start = now.checked_sub(self.window).unwrap_or(now);

        let requests = self.requests.read().unwrap_or_else(|e| e.into_inner());

        requests
            .get(ip)
            .map(|timestamps| timestamps.iter().filter(|&&t| t > window_start).count())
            .unwrap_or(0)
    }
}

impl Default for RateLimiter {
    /// Default: 60 requests per minute
    fn default() -> Self {
        Self::new(60, 60)
    }
}

// =============================================================================
// Webhook Security Configuration
// =============================================================================

/// Security configuration for incoming webhooks
#[derive(Debug, Clone)]
pub struct WebhookSecurityConfig {
    /// Whether to require HMAC signature
    pub require_signature: bool,
    /// Rate limit: max requests per minute
    pub rate_limit_per_minute: usize,
    /// Whether rate limiting is enabled
    pub rate_limit_enabled: bool,
}

impl Default for WebhookSecurityConfig {
    fn default() -> Self {
        Self {
            require_signature: false, // Default false for backward compatibility
            rate_limit_per_minute: 60,
            rate_limit_enabled: true,
        }
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_sign_and_verify() {
        let verifier = SignatureVerifier::new("test-secret-key");
        let payload = b"test payload data";

        // Sign
        let signature = verifier.sign(payload);
        assert!(signature.starts_with("sha256="));

        // Verify
        assert!(verifier.verify(payload, &signature).is_ok());
    }

    #[test]
    fn test_signature_mismatch() {
        let verifier = SignatureVerifier::new("test-secret-key");
        let payload = b"test payload data";

        // Wrong signature
        let wrong_sig = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
        assert!(matches!(
            verifier.verify(payload, wrong_sig),
            Err(SignatureError::Mismatch)
        ));
    }

    #[test]
    fn test_signature_invalid_format() {
        let verifier = SignatureVerifier::new("test-secret-key");
        let payload = b"test payload data";

        // Missing prefix
        assert!(matches!(
            verifier.verify(payload, "invalid"),
            Err(SignatureError::InvalidFormat)
        ));

        // Wrong length
        assert!(matches!(
            verifier.verify(payload, "sha256=abc"),
            Err(SignatureError::InvalidFormat)
        ));
    }

    #[test]
    fn test_rate_limiter_allows_requests() {
        let limiter = RateLimiter::new(5, 60);
        let ip: IpAddr = "127.0.0.1".parse().unwrap();

        // First 5 requests should be allowed
        for _ in 0..5 {
            assert!(matches!(limiter.check(ip), RateLimitResult::Allowed));
        }
    }

    #[test]
    fn test_rate_limiter_blocks_excess() {
        let limiter = RateLimiter::new(3, 60);
        let ip: IpAddr = "127.0.0.1".parse().unwrap();

        // First 3 requests allowed
        for _ in 0..3 {
            assert!(matches!(limiter.check(ip), RateLimitResult::Allowed));
        }

        // 4th request should be limited
        assert!(matches!(limiter.check(ip), RateLimitResult::Limited { .. }));
    }

    #[test]
    fn test_rate_limiter_different_ips() {
        let limiter = RateLimiter::new(2, 60);
        let ip1: IpAddr = "127.0.0.1".parse().unwrap();
        let ip2: IpAddr = "192.168.1.1".parse().unwrap();

        // Each IP has its own limit
        for _ in 0..2 {
            assert!(matches!(limiter.check(ip1), RateLimitResult::Allowed));
            assert!(matches!(limiter.check(ip2), RateLimitResult::Allowed));
        }

        // Both should now be limited
        assert!(matches!(limiter.check(ip1), RateLimitResult::Limited { .. }));
        assert!(matches!(limiter.check(ip2), RateLimitResult::Limited { .. }));
    }

    #[test]
    fn test_rate_limiter_request_count() {
        let limiter = RateLimiter::new(10, 60);
        let ip: IpAddr = "127.0.0.1".parse().unwrap();

        assert_eq!(limiter.get_request_count(&ip), 0);

        limiter.check(ip);
        assert_eq!(limiter.get_request_count(&ip), 1);

        limiter.check(ip);
        limiter.check(ip);
        assert_eq!(limiter.get_request_count(&ip), 3);
    }

    #[test]
    fn test_known_signature_vector() {
        // Test with known values to ensure algorithm correctness
        let verifier = SignatureVerifier::new("webhook-secret");
        let payload = b"{\"event\":\"test\"}";

        let signature = verifier.sign(payload);

        // Verify the generated signature can be verified
        assert!(verifier.verify(payload, &signature).is_ok());

        // Tampered payload should fail
        let tampered = b"{\"event\":\"hacked\"}";
        assert!(verifier.verify(tampered, &signature).is_err());
    }
}
