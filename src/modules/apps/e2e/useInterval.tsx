import { useRef, useEffect } from 'react'

function useInterval(callback: () => Promise<void>, delay) {
  const savedCallback = useRef<() => Promise<void>>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    //running is local to each iteration of this effect
    //so won't pollute anything if the user starts polling again
    let running = false
    let savedTimeout = null

    const tick = async () => {
      if (running) {
        await savedCallback.current()
      }

      if (running) {
        savedTimeout = setTimeout(tick, delay)
      }
    }

    const stop = () => {
      running = false
      const timeout = savedTimeout

      if (timeout !== null) {
        clearTimeout(timeout)
      }
    }

    if (delay !== null) {
      running = true
      savedTimeout = setTimeout(tick, delay)
      return stop
    }
  }, [delay])
}

export default useInterval
