import crypto from "crypto";

// Ensure you add DB_ENCRYPTION_KEY to your .env file!
// It MUST be exactly 32 characters long.
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || "your-32-character-secret-key-here"; 
const IV_LENGTH = 16; 

export function encryptMessage(text: string) {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Return the IV and the encrypted text combined
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptMessage(text: string) {
  // If the message doesn't have a colon, it's an old plain-text message (backwards compatibility)
  if (!text || !text.includes(':')) return text; 
  
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    return "[Encrypted Message]"; // Fallback if decryption fails
  }
}