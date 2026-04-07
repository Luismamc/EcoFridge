'use client'

import { useEffect, useState } from 'react'

interface CapacitorInfo {
  isNative: boolean
  platform: 'android' | 'ios' | 'web'
}

export function useCapacitor(): CapacitorInfo {
  const [info, setInfo] = useState<CapacitorInfo>({
    isNative: false,
    platform: 'web',
  })

  useEffect(() => {
    const checkNative = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        const isNative = Capacitor.isNativePlatform()
        setInfo({
          isNative,
          platform: Capacitor.getPlatform() as 'android' | 'ios' | 'web',
        })

        // Configure status bar for native
        if (isNative) {
          const { StatusBar, Style } = await import('@capacitor/status-bar')
          try {
            await StatusBar.setStyle({ style: Style.Light })
            await StatusBar.setBackgroundColor({ color: '#16a34a' })
          } catch {
            // StatusBar might not be available on all platforms
          }

          // Hide splash screen after web app loads
          const { SplashScreen } = await import('@capacitor/splash-screen')
          try {
            await SplashScreen.hide({ fadeOutDuration: 500 })
          } catch {
            // Ignore if splash screen not available
          }
        }
      } catch {
        // Not in Capacitor environment
        setInfo({ isNative: false, platform: 'web' })
      }
    }

    checkNative()
  }, [])

  return info
}
