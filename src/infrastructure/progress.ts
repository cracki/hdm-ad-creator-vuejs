import type { Router } from 'vue-router'

interface PaceStatic {
  running: boolean
  start(options?: Record<string, unknown>): void
  stop(): void
  restart(): void
}

let Pace: PaceStatic | undefined

export function setupProgress(router: Router) {
  import('pace-js').then((m) => {
    Pace = m.default ?? m

    Pace.start({
      startOnPageLoad: false,
      restartOnPushState: true,
      restartOnRequestAfter: 300,
      ajax: {
        trackMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        trackWebSockets: false,
        ignoreURLs: [],
      },
      elements: false,
      eventLag: false,
      document: false,
    })

    Pace.stop()
  })

  let started = false

  router.beforeEach(() => {
    if (!Pace) return
    started = true
    Pace.restart()
  })

  router.afterEach(() => {
    if (!Pace || !started) return
    const p = Pace
    setTimeout(() => {
      if (p.running) return
      p.stop()
    }, 200)
  })

  router.onError(() => {
    if (!Pace) return
    Pace.stop()
  })
}
