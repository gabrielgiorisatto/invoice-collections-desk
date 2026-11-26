import { useState } from 'react'
import { Button, Input } from 'antd'
import { demoAccount, demoLoginNotice } from '@domain/index.ts'
import { signIn } from '../../api/session.ts'
import BrandMark from './BrandMark.tsx'

type Props = {
  onSignedIn: () => void
}

export default function LoginScreen({ onSignedIn }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(nextUsername: string, nextPassword: string) {
    setBusy(true)
    setError(null)
    try {
      const message = await signIn(nextUsername, nextPassword)
      if (message) {
        setError(message)
        return
      }
      onSignedIn()
    } catch {
      setError('Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  async function useDemoAccount() {
    setUsername(demoAccount.username)
    setPassword(demoAccount.password)
    await submit(demoAccount.username, demoAccount.password)
  }

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <BrandMark />
          <div>
            <h1 className="login-title" id="login-title">Collections Desk</h1>
            <p className="login-subtitle">Demo sign-in</p>
          </div>
        </div>
        <p className="login-sim" role="note">{demoLoginNotice}</p>
        <p className="login-creds">
          Username <strong>{demoAccount.username}</strong>
          {' · '}
          Password <strong>{demoAccount.password}</strong>
        </p>
        <Button type="primary" block disabled={busy} onClick={() => { void useDemoAccount() }}>
          Use demo account
        </Button>
        <form
          className="login-form"
          onSubmit={event => {
            event.preventDefault()
            void submit(username, password)
          }}
        >
          <label className="login-field" htmlFor="demo-username">
            Username
            <Input
              id="demo-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={event => setUsername(event.target.value)}
            />
          </label>
          <label className="login-field" htmlFor="demo-password">
            Password
            <Input.Password
              id="demo-password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <Button htmlType="submit" block disabled={busy}>
            Sign in
          </Button>
        </form>
      </section>
    </main>
  )
}
