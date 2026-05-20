import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  Camera,
  CheckCircle2,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react'

type AlarmMode = 'classic' | 'coach' | 'silent'
type CameraState = 'idle' | 'starting' | 'active' | 'error' | 'unsupported'
type AudioState = 'off' | 'ready' | 'muted' | 'unsupported'
type ActiveTone = {
  oscillator: OscillatorNode
  gain: GainNode
}

const alarmModes: Record<AlarmMode, { label: string; message: string; tone: string }> = {
  classic: {
    label: 'Classic Siren',
    message: 'PHONE LUNK DETECTED',
    tone: 'High-visibility alarm overlay',
  },
  coach: {
    label: 'Coach Mode',
    message: 'RACK IT OR SCROLL ELSEWHERE',
    tone: 'Firm nudge for shared spaces',
  },
  silent: {
    label: 'Silent Badge',
    message: 'PHONE HOLD DETECTED',
    tone: 'Quiet visual-only warning',
  },
}

const featureCards = [
  {
    icon: ShieldCheck,
    title: 'Private by default',
    description: 'The demo keeps camera handling in the browser and does not upload video.',
  },
  {
    icon: Gauge,
    title: 'Manual QA trigger',
    description: 'Simulate a phone sighting without needing hardware, TensorFlow, or staged footage.',
  },
  {
    icon: BellRing,
    title: 'Small alarm loop',
    description: 'Pick a mode, start the camera preview, trigger an alert, and clear it.',
  },
]

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const alarmTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeToneRef = useRef<ActiveTone | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [alarmMode, setAlarmMode] = useState<AlarmMode>('classic')
  const [audioState, setAudioState] = useState<AudioState>('off')
  const [detectionCount, setDetectionCount] = useState(0)
  const [alarmActive, setAlarmActive] = useState(false)

  const selectedAlarm = alarmModes[alarmMode]
  const cameraLabel = useMemo(() => {
    if (cameraState === 'active') return 'Camera monitoring'
    if (cameraState === 'starting') return 'Starting camera'
    if (cameraState === 'unsupported') return 'Camera unsupported'
    if (cameraState === 'error') return 'Camera unavailable'
    return 'Camera idle'
  }, [cameraState])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
    }

    return () => {
      stopCamera()
      stopAlarmTone()
      if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current)
    }
  }, [])

  function describeCameraError(error: unknown) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return 'Camera permission blocked. Allow camera access in the browser, then retry camera.'
    }

    if (error instanceof Error && error.name === 'NotAllowedError') {
      return 'Camera permission blocked. Allow camera access in the browser, then retry camera.'
    }

    if (error instanceof Error && error.name === 'NotFoundError') {
      return 'No camera was found. Connect a camera or use the simulator path.'
    }

    return error instanceof Error
      ? `Camera unavailable. ${error.message}`
      : 'Camera unavailable. Permission was denied or the device could not be opened.'
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      setErrorMessage('Camera APIs are unavailable in this browser. Use a secure browser context or the simulator path.')
      return
    }

    setCameraState('starting')
    setErrorMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setCameraState('active')
    } catch (error) {
      setCameraState('error')
      setErrorMessage(describeCameraError(error))
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState((current) => (current === 'unsupported' ? 'unsupported' : 'idle'))
  }

  async function enableAudioAlarm() {
    const browserWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    const AudioContextConstructor = browserWindow.AudioContext ?? browserWindow.webkitAudioContext

    if (!AudioContextConstructor) {
      setAudioState('unsupported')
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor()
    }

    await audioContextRef.current.resume().catch(() => undefined)
    setAudioState('ready')
  }

  function muteAudioAlarm() {
    stopAlarmTone()
    setAudioState('muted')
  }

  function stopAlarmTone() {
    if (!activeToneRef.current) return

    try {
      activeToneRef.current.oscillator.stop()
    } catch {
      // The tone may already have reached its scheduled stop time.
    }
    activeToneRef.current.oscillator.disconnect()
    activeToneRef.current.gain.disconnect()
    activeToneRef.current = null
  }

  async function playAlarmTone() {
    if (audioState !== 'ready' || alarmMode === 'silent') return

    const audioContext = audioContextRef.current
    if (!audioContext) return

    await audioContext.resume().catch(() => undefined)
    stopAlarmTone()

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const now = audioContext.currentTime

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(alarmMode === 'coach' ? 660 : 880, now)
    oscillator.frequency.exponentialRampToValueAtTime(alarmMode === 'coach' ? 440 : 620, now + 0.24)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.85)
    activeToneRef.current = { oscillator, gain }
  }

  function triggerAlarm() {
    setDetectionCount((count) => count + 1)
    setAlarmActive(true)
    void playAlarmTone()

    if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current)
    alarmTimerRef.current = window.setTimeout(() => {
      setAlarmActive(false)
      stopAlarmTone()
    }, 4000)
  }

  function clearAlarm() {
    setAlarmActive(false)
    stopAlarmTone()
    if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current)
  }

  return (
    <main className="app-shell">
      {alarmActive && (
        <section className={`alarm-overlay alarm-overlay--${alarmMode}`} role="alert">
          <BellRing aria-hidden="true" />
          <div>
            <strong>{selectedAlarm.message}</strong>
            <span>Detection #{detectionCount} logged for review.</span>
          </div>
          <button type="button" onClick={clearAlarm}>
            Clear
          </button>
        </section>
      )}

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="definition">Phone Lunk: a shared-equipment hog glued to a phone.</p>
          <h1 id="hero-title">Phone Lunk Alarm Lab</h1>
          <p>
            A scoped rebuild of the phone-spotting alarm concept: start a local camera
            preview, choose an alarm style, and simulate a detection in one QA session.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={startCamera}>
              <Camera aria-hidden="true" />
              Start Camera
            </button>
            <button type="button" className="secondary-action" onClick={triggerAlarm}>
              <Smartphone aria-hidden="true" />
              Simulate Phone Spot
            </button>
          </div>
        </div>

        <aside className="monitor-panel" aria-label="Camera monitor">
          <div className="monitor-header">
            <span className={`status-dot status-dot--${cameraState}`} />
            <span>{cameraLabel}</span>
          </div>
          <div className="video-frame">
            <video ref={videoRef} muted playsInline aria-label="Local camera preview" />
            {cameraState !== 'active' && (
              <div className="video-placeholder">
                <Camera aria-hidden="true" />
                <strong>
                  {cameraState === 'starting'
                    ? 'Opening camera...'
                    : cameraState === 'error'
                      ? 'Camera permission needed'
                      : cameraState === 'unsupported'
                        ? 'Camera APIs unavailable'
                        : 'Camera preview off'}
                </strong>
                <span>
                  {cameraState === 'unsupported'
                    ? 'This browser does not expose camera APIs.'
                    : cameraState === 'error'
                      ? 'Use Retry Camera after adjusting browser permissions.'
                    : 'Start the camera or use the simulator path.'}
                </span>
              </div>
            )}
          </div>
          {errorMessage && <p className="error-note">{errorMessage}</p>}
          <div className="monitor-controls">
            <button type="button" onClick={stopCamera} disabled={cameraState !== 'active'}>
              Stop Camera
            </button>
            <button type="button" onClick={cameraState === 'error' ? startCamera : triggerAlarm}>
              {cameraState === 'error' && <RotateCcw aria-hidden="true" />}
              {cameraState === 'error' ? 'Retry Camera' : 'Test Alarm'}
            </button>
          </div>
        </aside>
      </section>

      <section className="control-strip" aria-label="Alarm controls">
        <div>
          <span className="eyebrow">Alarm Mode</span>
          <div className="mode-options">
            {(Object.keys(alarmModes) as AlarmMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                className={mode === alarmMode ? 'is-selected' : ''}
                onClick={() => setAlarmMode(mode)}
                aria-pressed={mode === alarmMode}
              >
                <Volume2 aria-hidden="true" />
                {alarmModes[mode].label}
              </button>
            ))}
          </div>
        </div>
        <div className="audio-controls">
          <span className="eyebrow">Audio Alarm</span>
          <div className="audio-actions">
            {audioState === 'off' || audioState === 'unsupported' ? (
              <button type="button" onClick={enableAudioAlarm} disabled={audioState === 'unsupported'}>
                <Volume2 aria-hidden="true" />
                Enable Audio Alarm
              </button>
            ) : (
              <button
                type="button"
                onClick={audioState === 'muted' ? enableAudioAlarm : muteAudioAlarm}
              >
                {audioState === 'muted' ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                {audioState === 'muted' ? 'Enable Audio Alarm' : 'Mute Audio Alarm'}
              </button>
            )}
          </div>
          <small>
            {audioState === 'ready'
              ? 'Audio alarm ready'
              : audioState === 'muted'
                ? 'Audio alarm muted'
                : audioState === 'unsupported'
                  ? 'Audio alarm unsupported in this browser'
                  : 'Audio alarm off'}
          </small>
        </div>
        <div className="stats">
          <span>Detections</span>
          <strong>{detectionCount}</strong>
          <small>{selectedAlarm.tone}</small>
        </div>
      </section>

      <section className="feature-grid" aria-label="Implementation scope">
        {featureCards.map((feature) => {
          const Icon = feature.icon
          return (
            <article key={feature.title}>
              <Icon aria-hidden="true" />
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          )
        })}
      </section>

      <section className="qa-path" aria-label="QA path">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <h2>First-pass QA path</h2>
          <p>
            Verify the page renders, alarm mode selection updates, simulated detections increment,
            the overlay clears, and camera permission failures are handled.
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
