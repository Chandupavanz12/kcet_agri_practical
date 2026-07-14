import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const SECRET_SALT = process.env.JWT_SECRET || 'super-secret-key-123';

// Use ultra-fast HMAC SHA-256 calculation for instant logins
export async function hashPassword(password) {
  return 'hmac:' + crypto.createHmac('sha256', SECRET_SALT).update(String(password)).digest('hex');
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  
  if (passwordHash.startsWith('hmac:')) {
    const expectedHash = 'hmac:' + crypto.createHmac('sha256', SECRET_SALT).update(String(password)).digest('hex');
    return expectedHash === passwordHash;
  }
  
  // Backward compatibility with older bcrypt hashes
  return bcryptjs.compare(String(password), passwordHash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
