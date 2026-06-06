import CryptoJS from 'crypto-js'

const CIPHER_PREFIX = 'enc:v1:'

function deriveKey(password: string): CryptoJS.lib.WordArray {
  return CryptoJS.SHA256(password)
}

export function isEncrypted(text: string): boolean {
  return text.startsWith(CIPHER_PREFIX)
}

/** 用于本地校验知识库密码，不存储明文密码 */
export function hashVaultPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

export function encrypt(text: string, password: string): string {
  if (!text) return text

  const iv = CryptoJS.lib.WordArray.random(16)
  const key = deriveKey(password)
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })

  const ivBase64 = CryptoJS.enc.Base64.stringify(iv)
  const cipherBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  return `${CIPHER_PREFIX}${ivBase64}:${cipherBase64}`
}

export function decrypt(ciphertext: string, password: string): string {
  if (!ciphertext) return ciphertext
  if (!isEncrypted(ciphertext)) return ciphertext

  const payload = ciphertext.slice(CIPHER_PREFIX.length)
  const colonIndex = payload.indexOf(':')
  if (colonIndex === -1) {
    throw new Error('无效的密文格式')
  }

  const iv = CryptoJS.enc.Base64.parse(payload.slice(0, colonIndex))
  const cipherWords = CryptoJS.enc.Base64.parse(payload.slice(colonIndex + 1))
  const key = deriveKey(password)

  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext: cipherWords }),
    key,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  )

  const result = decrypted.toString(CryptoJS.enc.Utf8)
  if (!result) {
    throw new Error('解密失败，知识库密码可能不正确')
  }
  return result
}
