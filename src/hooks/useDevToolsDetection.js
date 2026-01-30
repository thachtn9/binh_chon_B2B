import { useState, useEffect } from 'react'
import devtools from 'devtools-detect'

const useDevToolsDetection = () => {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(devtools.isOpen)

  useEffect(() => {
    // Listen for devtools change event
    const handleChange = (event) => {
      setIsDevToolsOpen(event.detail.isOpen)
    }

    window.addEventListener('devtoolschange', handleChange)

    // Also check periodically as backup
    const interval = setInterval(() => {
      setIsDevToolsOpen(devtools.isOpen)
    }, 1000)

    return () => {
      window.removeEventListener('devtoolschange', handleChange)
      clearInterval(interval)
    }
  }, [])

  return isDevToolsOpen
}

export default useDevToolsDetection
