// #####################################################################
// 
// #####################################################################

const c = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000000;
const DIGEST = 'sha512';
let scrambled = null;
let plain = null;
const xorKey = c.randomBytes(32);

async function generateHash(rawData) {
    // Escape all data first
    const escapedData = escHtml(rawData);
    const encoder = new TextEncoder();
    const data = encoder.encode(escapedData);
    const hashBuffer = await c.subtle.digest('SHA-256', data);
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

function encodeData(data, password) {
    
    try {
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }
        if (typeof password !== 'string') {
            throw new Error('Password must be a string');
        }

        const secret = c.randomBytes(16);
        const iv = c.randomBytes(12);
        const key = c.scryptSync(password, secret, 32, { N: 32768, r: 8, p: 1, maxmem: 1 * 1024 * 1024 * 1024 });
        const cipher = c.createCipheriv('aes-256-gcm', key, iv);
        
        const encodedData = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();
        return Buffer.concat([secret, iv, authTag, encodedData]);

    } catch (e) {
        console.error('Encryption error:', e.message);
        return null;
    }
}

function decodeData(encodedBuffer, password) {
    
    try {
        
        if (!Buffer.isBuffer(encodedBuffer)) {
            throw new Error('Encrypted data must be a Buffer');
        }
        
        if (typeof password !== 'string') {
            throw new Error('Password must be a string');
        }
        
        const secret = encodedBuffer.subarray(0, 16);
        const iv = encodedBuffer.subarray(16, 28);
        const authTag = encodedBuffer.subarray(28, 44);
        const encodedData = encodedBuffer.subarray(44);
        const key = c.scryptSync(password, secret, 32, { N: 32768, r: 8, p: 1, maxmem: 1 * 1024 * 1024 * 1024 });
        const decipher = c.createDecipheriv('aes-256-gcm', key, iv);
       
        decipher.setAuthTag(authTag);
        
        const decodedData = Buffer.concat([
            decipher.update(encodedData),
            decipher.final()
        ]);

        return decodedData.toString('utf8');

    } catch (e) {
        console.error('Decryption error:', e.message);
        return null;
    }
}

function decodeUserField(method,data,pin) {
    let dec = decodeData(Buffer.from(data, 'base64'), pin);
    return dec;
}

function encodePWM(file, data, password) {
    try {
        let encoded = encodeData(data, password);
        fs.writeFileSync(file, encoded);
        return true;
        } catch(e) {
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

function decodePWM(file, password) {
    try {
        const encoded = fs.readFileSync(file);
        return decodeData(encoded, password);
        } catch (e) {
        if(devdebug) console.log(e);
        return false;
    }
}

function PINsalt() {
    
    let secretsalt = '';
    
        let ab = ['a','b','c','d','e','f','g','h','i','j','k','l',
        'm','n','o','p','q','r','s','t','u','v','w','x','y','z'];
        
        for(i=0;i<64;i++) {
            if(Math.floor(Math.random() * 2) == 0) {
                secretsalt += ab[Math.floor(Math.random() * 26)].toUpperCase();
                } else {
                secretsalt += ab[Math.floor(Math.random() * 26)];
            }
        }
        
    return secretsalt;
}

function readSalt() {
    let file = getFilePath('surfvalues.json');
    let decoded = fs.readFileSync(file);
    let decodedData = JSON.parse(decoded);
    let secretsalt = decodedData["salt"];
    return secretsalt;
}

function storeSalt(salt) {
    
    let sv = getFilePath('surfvalues.json');
    let data = JSON.parse(fs.readFileSync(sv, 'utf8'));
    
    if(!data) {
        fs.writeFileSync(sv, JSON.stringify(data, null, 2)).then(function() {
            data = JSON.parse(fs.readFileSync(sv, 'utf8'));
        });
    }
    
    data['salt'] = salt;
    fs.writeFileSync(sv, JSON.stringify(data, null, 2));
}

function encodePIN(pin, pinsalt) {
    return sha256(pin + pinsalt);
}

function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function comparePIN(password, pin) {
    
    let salt = readSalt();
    let hash = sha256(pin + salt);

    let file = getPWMPath();
    let decoded = decodePWM(file, password);
    let decodedData = JSON.parse(decoded);
    
    let userPIN = hash;
    let storedPIN = decodedData["master-pincode"]; //sha256
    
    if(userPIN == storedPIN) {
        return true;
        } else {
        return false;
    }
}

function initVault(password,pin) {
    
    try {
        
        let file = getFilePath('passwords.json');
        
        // Create one-time pinsalt
        let pinsalt = PINsalt();
        
        // Store one-time pinsalt
        storeSalt(pinsalt);
        
        let pincode = encodePIN(pin, pinsalt);
        let enc = encodePWM(file, JSON.stringify({"master-pincode": pincode}), password);
     
        return enc;
        
        } catch (e) { 
        
        if(devdebug) console.log(e);
        return false;
    }
}

function decodePWMVault(pin) {
    let pinsalt = readSalt();
    let sha = encodePIN(pin, pinsalt);
    return decodeData(Buffer.from(PWMvault, 'base64'), sha);
}

function unlockVault(password) {
    
    tmpMasterPassword = password;
    let file = getPWMPath();

    let decoded = decodePWM(file, password);
    let decodedData = JSON.parse(decoded);
    
    PWMvault = encodeData(decoded, decodedData["master-pincode"]).toString('base64');
    
    return decoded;
}

function freePIN() {
    encodedTmpPIN = null;
}

function addPassword(domain, username, password, pin) {

  if(!domain || !username || !password || !pin) {
      if(devdebug) console.log('Missing parameter, cannot add new vault entry.');
      return false;
  }
  
  try {

    if(tmpMasterPassword) {

        const vaultPath = getPWMPath();
        
        let decoded = decodePWM(vaultPath, tmpMasterPassword);
        let data = JSON.parse(decoded);
        
        let domainName = sanitizeUrl(domain, 'host');
        
        if (!data[domainName]) {
            data[domainName] = {
                host: domainName,
                url: domain,
                username: encodeData(username, pin).toString('base64'),
                password: encodeData(password, pin).toString('base64'),
                date: Date.now(),
            };
        }
        
        fs.writeFileSync(vaultPath, encodeData(JSON.stringify(data), tmpMasterPassword));
        
        // Update temp vault.
        PWMvault = encodeData(decoded, data["master-pincode"]).toString('base64');
        
    } else {
        return false;
    }

    return true;

  } catch (err) {
    console.error('Failed to add password:', err);
    return false;
  }
}
