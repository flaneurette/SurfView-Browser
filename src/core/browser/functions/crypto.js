// #####################################################################
// CRYPTO
// #####################################################################

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha512';
let scrambled = null;
let plain = null;
const xorKey = crypto.randomBytes(32);

async function generateHash(rawData) {
    // Escape all data first
    const escapedData = escHtml(rawData);
    const encoder = new TextEncoder();
    const data = encoder.encode(escapedData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if(devdebug) console.log('Web Crypto SHA-256:', hashHex);
    return hashHex;
}

function getPWMPath() {
  return path.join(app.getPath('userData'), 'passwords.json');
}

function storeKey(password) {
    scrambled = Buffer.from(password).map((b, i) => b ^ xorKey[i % xorKey.length]);
    password = null;
}

function useKey() {
    plain = scrambled.map((b, i) => b ^ xorKey[i % xorKey.length]);
    return plain; // caller must wipe after use
}

function flushKey() {
    if (scrambled) scrambled.fill(0);
    if (plain) plain.fill(0);
    scrambled = null;
    plain = null;
}

/*
    // Usage
    storeKey(password);

    // Then:
    const key = useKey();
    
    // Do something.
    
    // Then:
    key.fill(0);
    flushKey();
*/

function encryptData(data, password) {

    try {
        
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }
        
        if (typeof password !== 'string') {
            throw new Error('password must be a string');
        }

        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encryptedData = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);

        return Buffer.concat([salt, iv, encryptedData]);
        
    } catch (e) {
        console.error('Encryption error:', e.message);
        return null;
    }
}

function decryptData(encrypted, password) {
    
    try {
        
        if (!Buffer.isBuffer(encrypted)) {
            throw new Error('Encrypted data must be a Buffer');
        }
        
        if (typeof password !== 'string') {
            throw new Error('password must be a string');
        }
        
        const salt = encrypted.slice(0, 16);
        const iv = encrypted.slice(16, 32);
        const data = encrypted.slice(32);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([
            decipher.update(data),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch (e) {
        console.error('Decryption error:', e.message);
        return null;
    }
}

function decryptUserField(method,data,pin) {
    let dec = decryptData(Buffer.from(data, 'base64'), pin);
    return dec;
}

function encryptPWM(file, data, password) {
    try {
        let encrypted = encryptData(data, password);
        fs.writeFileSync(file, encrypted);
        return true;
        } catch(e) {
        if(devdebug) console.log(e);
        return false;
    }
}

function createSessionPass() {
    window.surfview.setValue('sessionPWM', 'active');
    return true;
}

function revokeSessionPass() {
    window.surfview.setValue('sessionPWM', 'inactive');
    return true;
}

function decryptPWM(file, password) {
    try {
        if(devdebug) console.log(password);
        const encrypted = fs.readFileSync(file);
        return decryptData(encrypted, password);
        } catch (e) {
        if(devdebug) console.log(e);
        return false;
    }
}

function initVault(password) {
    try {
        let file = getPWMPath();
        let enc = encryptPWM(file, '{}', password);
        return enc;
        } catch (e) {
        if(devdebug) console.log(e);
        return false;
    }
}

function unlockVault(password) {
    let file = getPWMPath();
    let enc = decryptPWM(file, password);
    return enc;
}

function addPassword(domain, username, password, pin) {

  if(!domain || !username || !password || !pin) {
      if(devdebug) console.log('Missing parameter, cannot add new vault entry.');
      return false;
  }
  
  try {
     
    if(tmpMasterPassword) {
        
        const vaultPath = getPWMPath();
        const encrypted = fs.readFileSync(vaultPath);
        let data = JSON.parse(decryptData(encrypted, tmpMasterPassword));
        
        let domainName = sanitizeUrl(domain, 'host');
        
        if (!data[domainName]) {
            data[domainName] = {
                host: domainName,
                url: domain,
                username: encryptData(username, pin).toString('base64'),
                password: encryptData(password, pin).toString('base64'),
                date: Date.now(),
            };
        }
        
        fs.writeFileSync(vaultPath, encryptData(JSON.stringify(data), tmpMasterPassword));
    } else {
        window.surfview.dialog("Cannot retrieve tempory master password, close and re-open this window, or restart SurfView.");
    }

    return true;

  } catch (err) {
    console.error('Failed to add password:', err);
    return false;
  }
}























function deriveKey(password, salt) {
  if (!password || !salt) {
    throw new Error('password and salt are required for key derivation');
  }
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

/*
function encryptData(data, key) {

  if (!data || !key) {
    throw new Error('Data and key are required for encryption');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptData(encryptedData, key) {
    
  if (!encryptedData || !key) {
    throw new Error('Encrypted data and key are required for decryption');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

*/

function encryptAndSaveVault(filePath, vault, masterpassword) {
    
  if (!vault || !masterpassword) {
    throw new Error('Vault and master password are required');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterpassword, salt);
  const encryptedVault = encryptData(JSON.stringify(vault), key);
  fs.writeFileSync(filePath, `${salt.toString('hex')}:${encryptedVault}`);
}

function decryptAndLoadVault(filePath, masterpassword) {
    
  if (!fs.existsSync(filePath)) {
    throw new Error('Vault file does not exist');
  }

  const encryptedData = fs.readFileSync(filePath, 'utf8').trim();

  const parts = encryptedData.split(':');

  // New vault: just salt, or salt with trailing colon (salt:)
  if (parts.length === 1 || (parts.length === 2 && parts[1] === '')) {
    return {
      domainKeys: {},
      passwords: {},
      salt: parts[0],
      pinSalt: crypto.randomBytes(SALT_LENGTH).toString('hex')
    };
  }

  if (parts.length < 4) {
    throw new Error('Invalid vault file format');
  }

  const saltHex = parts[0];
  const encryptedVault = parts.slice(1).join(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(masterpassword, salt);
  const decryptedVault = decryptData(encryptedVault, key);
  return JSON.parse(decryptedVault);
}

class SessionManager {
    
  constructor() {
    this.masterKey = null;
    this.pinKey = null;
    this.cache = {};
    this.vault = null;
  }

  unlockVault(masterpassword, vault) {
    if (!masterpassword || !vault) {
      throw new Error('Master password and vault are required');
    }

    this.masterKey = deriveKey(masterpassword, Buffer.from(vault.salt, 'hex'));
    this.pinKey = deriveKey(masterpassword, Buffer.from(vault.pinSalt, 'hex'));
    this.vault = vault;
  }

  decryptDomainpassword(domain) {
    if (!this.masterKey || !this.vault) {
      throw new Error('Vault is locked');
    }

    if (this.cache[domain]) {
      return this.cache[domain];
    }

    const encryptedKey = this.vault.domainKeys[domain];
    const encryptedpassword = this.vault.passwords[domain];

    if (!encryptedKey || !encryptedpassword) {
      return null;
    }

    try {
      const domainKey = decryptData(encryptedKey, this.masterKey);
      const password = decryptData(encryptedpassword, domainKey);
      this.cache[domain] = password;
      return password;
    } catch (err) {
      console.error('Failed to decrypt password:', err);
      return null;
    }
  }

  verifyPin(pin) {
    if (!this.pinKey || !this.vault) {
      throw new Error('Vault is locked');
    }

    try {
      const derivedPinKey = deriveKey(pin, Buffer.from(this.vault.pinSalt, 'hex'));
      return derivedPinKey.equals(this.pinKey);
    } catch (err) {
      console.error('PIN verification failed:', err);
      return false;
    }
  }

  lock() {
    this.masterKey = null;
    this.pinKey = null;
    this.cache = {};
    this.vault = null;
  }
}

/*
function unlockVault(masterpassword) {
    
  if (!masterpassword || masterpassword.length < 1) {
    console.error('Master password is required');
    return false;
  }

  try {
      
    const vaultPath = getPWMPath();

    if (!fs.existsSync(vaultPath)) {
        
      const vault = {
        domainKeys: {},
        passwords: {},
        salt: crypto.randomBytes(SALT_LENGTH).toString('hex'),
        pinSalt: crypto.randomBytes(SALT_LENGTH).toString('hex')
      };
      
      encryptAndSaveVault(vaultPath, vault, masterpassword);
      sessionManager.unlockVault(masterpassword, vault);
    }

    // Existing vault - decrypt it
    const vault = decryptAndLoadVault(vaultPath, masterpassword);
    sessionManager.unlockVault(masterpassword, vault);
    return vault;
    
  } catch (err) {
    console.error('Failed to unlock vault:', err);
    return false;
  }
}
*/


function getpasswordForDomain(domain, pin) {
  try {
    if (!sessionManager.verifyPin(pin)) {
      return null;
    }
    return sessionManager.decryptDomainpassword(domain);
  } catch (err) {
    console.error('Failed to get password:', err);
    return null;
  }
}


/*
// Unlock the vault (once per session)
if (unlockVault('myMasterpassword123!')) {
  console.log('Vault unlocked successfully');

  // Add a new password
               // domain    // user           //pass            // pin
  addpassword('google.com', 'user@gmail.com', 'mypassword123', '1234');

  // Get a password (requires PIN)
  const password = getpasswordForDomain('google.com', '1234');
  console.log('password:', password);

  // Lock the vault when done
  lockVault();
}

*/