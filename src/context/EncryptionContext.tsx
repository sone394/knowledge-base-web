import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { hashVaultPassword } from '../lib/encryption'

const VERIFIER_KEY_PREFIX = 'kb-vault-verifier:'
const SESSION_KEY_PREFIX = 'kb-vault-session:'

function verifierStorageKey(userId: string) {
  return `${VERIFIER_KEY_PREFIX}${userId}`
}

function sessionStorageKey(userId: string) {
  return `${SESSION_KEY_PREFIX}${userId}`
}

type EncryptionContextValue = {
  isConfigured: boolean
  isUnlocked: boolean
  password: string | null
  setupPassword: (password: string, rememberSession: boolean) => void
  unlock: (password: string, rememberSession: boolean) => boolean
  lock: () => void
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null)

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [password, setPassword] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

  const userId = user?.id ?? null

  useLayoutEffect(() => {
    if (!userId) {
      setPassword(null)
      setIsConfigured(false)
      return
    }

    setIsConfigured(!!localStorage.getItem(verifierStorageKey(userId)))

    const cached = sessionStorage.getItem(sessionStorageKey(userId))
    if (!cached) return

    const verifier = localStorage.getItem(verifierStorageKey(userId))
    if (verifier && hashVaultPassword(cached) === verifier) {
      setPassword(cached)
    } else {
      sessionStorage.removeItem(sessionStorageKey(userId))
    }
  }, [userId])

  const persistSession = useCallback(
    (value: string, rememberSession: boolean) => {
      if (!userId) return
      if (rememberSession) {
        sessionStorage.setItem(sessionStorageKey(userId), value)
      } else {
        sessionStorage.removeItem(sessionStorageKey(userId))
      }
    },
    [userId],
  )

  const setupPassword = useCallback(
    (nextPassword: string, rememberSession: boolean) => {
      if (!userId) return

      localStorage.setItem(
        verifierStorageKey(userId),
        hashVaultPassword(nextPassword),
      )
      setIsConfigured(true)
      setPassword(nextPassword)
      persistSession(nextPassword, rememberSession)
    },
    [userId, persistSession],
  )

  const unlock = useCallback(
    (inputPassword: string, rememberSession: boolean): boolean => {
      if (!userId) return false

      const verifier = localStorage.getItem(verifierStorageKey(userId))
      if (!verifier || hashVaultPassword(inputPassword) !== verifier) {
        return false
      }

      setPassword(inputPassword)
      persistSession(inputPassword, rememberSession)
      return true
    },
    [userId, persistSession],
  )

  const lock = useCallback(() => {
    setPassword(null)
    if (userId) {
      sessionStorage.removeItem(sessionStorageKey(userId))
    }
  }, [userId])

  const value = useMemo(
    () => ({
      isConfigured,
      isUnlocked: !!password,
      password,
      setupPassword,
      unlock,
      lock,
    }),
    [isConfigured, password, setupPassword, unlock, lock],
  )

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption() {
  const context = useContext(EncryptionContext)
  if (!context) {
    throw new Error('useEncryption must be used within EncryptionProvider')
  }
  return context
}
