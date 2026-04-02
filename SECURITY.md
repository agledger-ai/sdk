# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the AGLedger SDK, please report it responsibly.

**Email:** security@agledger.ai

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Current |

## Security Practices

- **Zero runtime dependencies** — no transitive supply chain risk
- **API keys are never logged** in error messages or stack traces
- **Webhook signatures** use HMAC-SHA256 with timing-safe comparison
- **Retry logic** respects `Retry-After` headers to prevent retry storms
- **Idempotency keys** auto-generated on all mutations to prevent duplicates
- **`SignatureVerificationError`** thrown on webhook tampering (never silently ignored)

## Disclosure Policy

We follow coordinated disclosure. Please allow 90 days for fix and release before public disclosure.
