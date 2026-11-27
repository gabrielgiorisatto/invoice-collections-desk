export async function fetchSession(): Promise<boolean> {
  const response = await fetch('/api/session')
  if (!response.ok) return false
  const body = await response.json() as { authenticated?: boolean }
  return body.authenticated === true
}

/** Returns an error message, or null when the demo sign-in succeeded. */
export async function signIn(username: string, password: string): Promise<string | null> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (response.ok) return null
  const body = await response.json().catch(() => null) as { error?: string } | null
  return body?.error ?? 'Could not sign in.'
}

/** Clears the HttpOnly session cookie. Returns false when the server did not accept it. */
export async function signOut(): Promise<boolean> {
  const response = await fetch('/api/logout', { method: 'POST' })
  return response.ok
}
