import { useState, useEffect } from "react"

export function useKeyboardShortcuts() {
    const [konamiSequence, setKonamiSequence] = useState<string[]>([])
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    const [konamiActivated, setKonamiActivated] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const newSequence = [...konamiSequence, e.code]
            setKonamiSequence(newSequence.slice(-10)) // Keep last 10 keys

            if (newSequence.length >= 10 && newSequence.slice(-10).every((code, index) => code === konamiCode[index])) {
                setKonamiActivated(true)
                // Fun animation effect
                document.body.style.animation = 'rainbow 2s ease-in-out'
                setTimeout(() => {
                    document.body.style.animation = ''
                }, 2000)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [konamiSequence])

    return {
        konamiActivated
    }
}
