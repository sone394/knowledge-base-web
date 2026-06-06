import { useState, type ReactNode } from 'react'
import { useEncryption } from '../context/EncryptionContext'
import EncryptionSetup from './EncryptionSetup'
import EncryptionUnlock from './EncryptionUnlock'

export default function EncryptionGate({ children }: { children: ReactNode }) {
  const { isConfigured, isUnlocked, setupPassword, unlock } = useEncryption()
  const [error, setError] = useState<string | null>(null)

  if (!isConfigured) {
    return (
      <EncryptionSetup
        error={error}
        onSubmit={(password, rememberSession) => {
          setError(null)
          setupPassword(password, rememberSession)
        }}
      />
    )
  }

  if (!isUnlocked) {
    return (
      <EncryptionUnlock
        error={error}
        onSubmit={(password, rememberSession) => {
          setError(null)
          const ok = unlock(password, rememberSession)
          if (!ok) {
            setError('知识库密码不正确')
          }
        }}
      />
    )
  }

  return <>{children}</>
}
