const CryptoJS = require('crypto-js');

function generateEncryptionKey() {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

function encryptMessage(message, key) {
  return CryptoJS.AES.encrypt(message, key).toString();
}

function decryptMessage(encryptedMessage, key) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption error:', e);
    return 'Could not decrypt message';
  }
}

module.exports = {
  generateEncryptionKey,
  encryptMessage,
  decryptMessage
};