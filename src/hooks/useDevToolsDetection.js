import { useState, useEffect, useCallback } from 'react'

const useDevToolsDetection = () => {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  const detectDevTools = useCallback(() => {
    const threshold = 160

    // Method 1: Check window size difference
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold

    // Method 2: Check using debugger timing
    const checkDebugger = () => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      const end = performance.now()
      return end - start > 100
    }

    // Method 3: Check using console.log with getter
    const checkConsole = () => {
      let devtoolsOpen = false
      const element = new Image()
      Object.defineProperty(element, 'id', {
        get: function () {
          devtoolsOpen = true
          return ''
        }
      })
      console.log('%c', element)
      console.clear()
      return devtoolsOpen
    }

    // Method 4: Check using toString
    const checkToString = () => {
      let devtoolsOpen = false
      const obj = {}
      obj.toString = function () {
        devtoolsOpen = true
        return ''
      }
      console.log('%c', obj)
      console.clear()
      return devtoolsOpen
    }

    // Combine methods (using window size as primary, console methods as backup)
    const isOpen = widthThreshold || heightThreshold || checkConsole() || checkToString()

    return isOpen
  }, [])

  useEffect(() => {
    // Initial check
    setIsDevToolsOpen(detectDevTools())

    // Check periodically
    const intervalId = setInterval(() => {
      const isOpen = detectDevTools()
      setIsDevToolsOpen(isOpen)
    }, 1000)

    // Check on resize
    const handleResize = () => {
      setIsDevToolsOpen(detectDevTools())
    }

    window.addEventListener('resize', handleResize)

    // Block keyboard shortcuts
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+C (Element picker)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        return false
      }
      // Ctrl+U (View source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        return false
      }
    }

    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [detectDevTools])

  return isDevToolsOpen
}

export default useDevToolsDetection
