/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0 authorization.
 * Implements RFC 7636 using WebCrypto API.
 */

/**
 * Generates a cryptographically random code verifier string.
 * @returns A base64url-encoded random string (43-128 characters)
 */
export async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generates a code challenge from a code verifier using S256 method.
 * @param verifier The code verifier string
 * @returns A base64url-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(
  verifier: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Encodes a byte array to base64url format (RFC 4648).
 * @param buffer The byte array to encode
 * @returns A base64url-encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
