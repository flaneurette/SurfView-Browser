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
