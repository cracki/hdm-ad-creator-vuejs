declare module 'pace-js' {
  interface PaceOptions {
    className?: string
    catchupTime?: number
    initialRate?: number
    minTime?: number
    ghostTime?: number
    maxProgressPerFrame?: number
    easeFactor?: number
    startOnPageLoad?: boolean
    restartOnPushState?: boolean
    restartOnRequestAfter?: number | false
    target?: string
    elements?: false | { checkInterval?: number; selectors?: string[] }
    eventLag?: false | { minSamples?: number; sampleCount?: number; lagThreshold?: number }
    ajax?: false | { trackMethods?: string[]; trackWebSockets?: boolean; ignoreURLs?: (string | RegExp)[] }
    document?: boolean
  }

  interface PaceStatic {
    running: boolean
    options: PaceOptions
    start(options?: PaceOptions): void
    stop(): void
    restart(): void
    go(): void
    on(event: string, handler: (...args: unknown[]) => void): void
    off(event: string, handler?: (...args: unknown[]) => void): void
    trigger(event: string, ...args: unknown[]): void
    bar: {
      progress: number
      render(): void
    }
  }

  const Pace: PaceStatic
  export default Pace
}
