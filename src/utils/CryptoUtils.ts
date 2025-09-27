import { createHash, createHmac, randomBytes, createCipher, createDecipher, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class CryptoUtils {
  /**
   * Generate a random string of specified length
   * @param length - Length of the random string
   * @param encoding - Encoding to use (default: 'hex')
   * @returns Random string
   */
  static generateRandomString(length: number, encoding: BufferEncoding = 'hex'): string {
    if (length <= 0) {
      throw new Error('Length must be positive');
    }

    const bytes = Math.ceil(length / 2); // hex encoding uses 2 chars per byte
    return randomBytes(bytes).toString(encoding).substring(0, length);
  }

  /**
   * Generate a random token
   * @param length - Length of the token in bytes (default: 32)
   * @returns Random token as hex string
   */
  static generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a UUID v4
   * @returns UUID v4 string
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Hash a string using the specified algorithm
   * @param data - Data to hash
   * @param algorithm - Hash algorithm (default: 'sha256')
   * @param encoding - Output encoding (default: 'hex')
   * @returns Hashed string
   */
  static hash(data: string, algorithm: string = 'sha256', encoding: 'hex' | 'base64' = 'hex'): string {
    if (!data) {
      throw new Error('Data cannot be empty');
    }

    return createHash(algorithm).update(data).digest(encoding);
  }

  /**
   * Create an HMAC hash
   * @param data - Data to hash
   * @param secret - Secret key
   * @param algorithm - Hash algorithm (default: 'sha256')
   * @param encoding - Output encoding (default: 'hex')
   * @returns HMAC hash
   */
  static hmac(data: string, secret: string, algorithm: string = 'sha256', encoding: 'hex' | 'base64' = 'hex'): string {
    if (!data) {
      throw new Error('Data cannot be empty');
    }
    if (!secret) {
      throw new Error('Secret cannot be empty');
    }

    return createHmac(algorithm, secret).update(data).digest(encoding);
  }

  /**
   * Verify an HMAC hash
   * @param data - Original data
   * @param secret - Secret key
   * @param hash - Hash to verify
   * @param algorithm - Hash algorithm (default: 'sha256')
   * @returns True if hash is valid
   */
  static verifyHmac(data: string, secret: string, hash: string, algorithm: string = 'sha256'): boolean {
    const expectedHash = this.hmac(data, secret, algorithm);
    return this.timingSafeEqual(expectedHash, hash);
  }

  /**
   * Compare two strings in constant time to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    return timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Encrypt data using AES-256-CBC
   * @param data - Data to encrypt
   * @param key - Encryption key (32 bytes)
   * @param iv - Initialization vector (16 bytes, optional)
   * @returns Encrypted data as hex string
   */
  static encrypt(data: string, key: string, iv?: string): string {
    if (!data) {
      throw new Error('Data cannot be empty');
    }
    if (!key) {
      throw new Error('Key cannot be empty');
    }

    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('Key must be 32 bytes (64 hex characters)');
    }

    const ivBuffer = iv ? Buffer.from(iv, 'hex') : randomBytes(16);
    if (ivBuffer.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    const cipher = createCipher('aes-256-cbc', keyBuffer);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data
    return ivBuffer.toString('hex') + encrypted;
  }

  /**
   * Decrypt data using AES-256-CBC
   * @param encryptedData - Encrypted data as hex string
   * @param key - Decryption key (32 bytes)
   * @returns Decrypted data
   */
  static decrypt(encryptedData: string, key: string): string {
    if (!encryptedData) {
      throw new Error('Encrypted data cannot be empty');
    }
    if (!key) {
      throw new Error('Key cannot be empty');
    }

    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('Key must be 32 bytes (64 hex characters)');
    }

    if (encryptedData.length < 32) {
      throw new Error('Invalid encrypted data format');
    }

    // Extract IV and encrypted data
    // const ivHex = encryptedData.substring(0, 32); // Unused
    const encryptedHex = encryptedData.substring(32);
    // const ivBuffer = Buffer.from(ivHex, 'hex');

    const decipher = createDecipher('aes-256-cbc', keyBuffer);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a secure encryption key
   * @param length - Key length in bytes (default: 32)
   * @returns Encryption key as hex string
   */
  static generateEncryptionKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure IV (Initialization Vector)
   * @param length - IV length in bytes (default: 16)
   * @returns IV as hex string
   */
  static generateIV(length: number = 16): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash a password using scrypt
   * @param password - Password to hash
   * @param salt - Salt (optional, will be generated if not provided)
   * @param keyLength - Key length in bytes (default: 64)
   * @param cost - CPU/memory cost parameter (default: 16384)
   * @param blockSize - Block size parameter (default: 8)
   * @param parallelization - Parallelization parameter (default: 1)
   * @returns Object with hash and salt
   */
  static async hashPassword(
    password: string,
    salt?: string,
    keyLength: number = 64,
    _cost: number = 16384,
    _blockSize: number = 8,
    _parallelization: number = 1
  ): Promise<{ hash: string; salt: string }> {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(32);
    const hashBuffer = await scryptAsync(password, saltBuffer, keyLength) as Buffer;

    return {
      hash: hashBuffer.toString('hex'),
      salt: saltBuffer.toString('hex'),
    };
  }

  /**
   * Verify a password against a hash
   * @param password - Password to verify
   * @param hash - Stored hash
   * @param salt - Stored salt
   * @param keyLength - Key length in bytes (default: 64)
   * @param cost - CPU/memory cost parameter (default: 16384)
   * @param blockSize - Block size parameter (default: 8)
   * @param parallelization - Parallelization parameter (default: 1)
   * @returns True if password is correct
   */
  static async verifyPassword(
    password: string,
    hash: string,
    salt: string,
    keyLength: number = 64,
    cost: number = 16384,
    blockSize: number = 8,
    parallelization: number = 1
  ): Promise<boolean> {
    try {
      const { hash: computedHash } = await this.hashPassword(password, salt, keyLength, cost, blockSize, parallelization);
      return this.timingSafeEqual(computedHash, hash);
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure API key
   * @param prefix - Prefix for the API key (optional)
   * @param length - Length of the random part (default: 32)
   * @returns API key
   */
  static generateAPIKey(prefix?: string, length: number = 32): string {
    const randomPart = this.generateToken(length);
    return prefix ? `${prefix}_${randomPart}` : randomPart;
  }

  /**
   * Generate a secure session token
   * @param length - Length of the token (default: 64)
   * @returns Session token
   */
  static generateSessionToken(length: number = 64): string {
    return this.generateToken(length);
  }

  /**
   * Generate a secure CSRF token
   * @param length - Length of the token (default: 32)
   * @returns CSRF token
   */
  static generateCSRFToken(length: number = 32): string {
    return this.generateToken(length);
  }

  /**
   * Generate a secure JWT secret
   * @param length - Length of the secret (default: 64)
   * @returns JWT secret
   */
  static generateJWTSecret(length: number = 64): string {
    return this.generateToken(length);
  }

  /**
   * Generate a secure webhook secret
   * @param length - Length of the secret (default: 32)
   * @returns Webhook secret
   */
  static generateWebhookSecret(length: number = 32): string {
    return this.generateToken(length);
  }

  /**
   * Create a signature for data
   * @param data - Data to sign
   * @param secret - Secret key
   * @param algorithm - Hash algorithm (default: 'sha256')
   * @returns Signature
   */
  static createSignature(data: string, secret: string, algorithm: string = 'sha256'): string {
    return this.hmac(data, secret, algorithm);
  }

  /**
   * Verify a signature
   * @param data - Original data
   * @param signature - Signature to verify
   * @param secret - Secret key
   * @param algorithm - Hash algorithm (default: 'sha256')
   * @returns True if signature is valid
   */
  static verifySignature(data: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    return this.verifyHmac(data, secret, signature, algorithm);
  }

  /**
   * Generate a secure random number
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random number
   */
  static generateRandomNumber(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Min must be less than max');
    }

    const range = max - min;
    const bytes = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(2, bytes * 8);
    const threshold = maxValue - (maxValue % range);

    let randomValue: number;
    do {
      const randomBuffer = randomBytes(bytes);
      randomValue = randomBuffer.readUIntBE(0, bytes);
    } while (randomValue >= threshold);

    return min + (randomValue % range);
  }

  /**
   * Generate a secure random float
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random float
   */
  static generateRandomFloat(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Min must be less than max');
    }

    const randomBuffer = randomBytes(4);
    const randomInt = randomBuffer.readUInt32BE(0);
    const randomFloat = randomInt / 0xffffffff;
    
    return min + (randomFloat * (max - min));
  }

  /**
   * Generate a secure random boolean
   * @returns Random boolean
   */
  static generateRandomBoolean(): boolean {
    const randomBuffer = randomBytes(1);
    return (randomBuffer[0]! & 1) === 1;
  }

  /**
   * Generate a secure random choice from an array
   * @param array - Array to choose from
   * @returns Random element
   */
  static generateRandomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Array cannot be empty');
    }

    const index = this.generateRandomNumber(0, array.length);
    return array[index]!;
  }

  /**
   * Generate a secure random sample from an array
   * @param array - Array to sample from
   * @param count - Number of elements to sample
   * @returns Array of random elements
   */
  static generateRandomSample<T>(array: T[], count: number): T[] {
    if (array.length === 0) {
      throw new Error('Array cannot be empty');
    }
    if (count <= 0) {
      throw new Error('Count must be positive');
    }
    if (count > array.length) {
      throw new Error('Count cannot be greater than array length');
    }

    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.generateRandomNumber(0, i + 1);
      [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
    }

    return shuffled.slice(0, count);
  }

  /**
   * Generate a secure random shuffle of an array
   * @param array - Array to shuffle
   * @returns Shuffled array
   */
  static generateRandomShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.generateRandomNumber(0, i + 1);
      [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  /**
   * Generate a secure random string with custom character set
   * @param length - Length of the string
   * @param charset - Character set to use
   * @returns Random string
   */
  static generateRandomStringWithCharset(length: number, charset: string): string {
    if (length <= 0) {
      throw new Error('Length must be positive');
    }
    if (charset.length === 0) {
      throw new Error('Character set cannot be empty');
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = this.generateRandomNumber(0, charset.length);
      result += charset[randomIndex];
    }
    return result;
  }

  /**
   * Generate a secure random alphanumeric string
   * @param length - Length of the string
   * @returns Random alphanumeric string
   */
  static generateRandomAlphanumeric(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return this.generateRandomStringWithCharset(length, charset);
  }

  /**
   * Generate a secure random numeric string
   * @param length - Length of the string
   * @returns Random numeric string
   */
  static generateRandomNumeric(length: number): string {
    const charset = '0123456789';
    return this.generateRandomStringWithCharset(length, charset);
  }

  /**
   * Generate a secure random alphabetic string
   * @param length - Length of the string
   * @returns Random alphabetic string
   */
  static generateRandomAlphabetic(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    return this.generateRandomStringWithCharset(length, charset);
  }
}
