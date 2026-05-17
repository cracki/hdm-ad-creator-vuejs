import { ref } from 'vue'

interface CredentialResponse {
  credential: string
}

export function useGoogleAuth() {
  const loading = ref(false)

  function loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('google-gsi-script')) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.id = 'google-gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  async function triggerGoogleLogin(): Promise<string> {
    loading.value = true
    try {
      await loadScript()

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) throw new Error('Google Client ID not configured')

      return new Promise<string>((resolve, reject) => {
        window.google!.accounts.id.initialize({
          client_id: clientId,
          callback: (response: CredentialResponse) => {
            loading.value = false
            if (response.credential) {
              resolve(response.credential)
            } else {
              reject(new Error('No credential received'))
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google!.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            loading.value = false
            reject(new Error('Google login was cancelled or not displayed'))
          }
        })
      })
    } catch {
      loading.value = false
      throw new Error('Google login failed')
    }
  }

  return { loading, triggerGoogleLogin }
}
