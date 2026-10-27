import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'ledgerguard_super_secure_jwt_secret_key_minimum_32_bytes_length';
const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 *
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Issues a signed JWT token using jose.
 *
 * @param {object} payload - User claims
 * @param {string} [expiresIn='7d']
 * @returns {Promise<string>} Signed JWT string
 */
export async function signToken(payload, expiresIn = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Verifies a JWT token using jose.
 *
 * @param {string} token
 * @returns {Promise<object>} Decoded claims
 */
export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ['HS256'],
  });
  return payload;
}
