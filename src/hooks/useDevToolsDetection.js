import { useState, useEffect, useMemo } from 'react'
import devtools from 'devtools-detect'

// Detect if user is on mobile device
const isMobileDevice = () => {
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.innerWidth <= 768
  
  // Check user agent for mobile devices
  const mobileUserAgentPattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  const isMobileUserAgent = mobileUserAgentPattern.test(navigator.userAgent)
  
  // Consider it mobile if user agent matches OR (has touch AND small screen)
  return isMobileUserAgent || (hasTouchScreen && isSmallScreen)
}

const useDevToolsDetection = () => {
  const isMobile = useMemo(() => isMobileDevice(), [])
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  useEffect(() => {
    // Skip detection on mobile devices to avoid false positives
    if (isMobile) {
      setIsDevToolsOpen(false)
      return
    }

    // Set initial state for desktop
    setIsDevToolsOpen(devtools.isOpen)

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
  }, [isMobile])

  return isDevToolsOpen
}

export default useDevToolsDetection
