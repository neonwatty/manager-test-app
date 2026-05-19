import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  Camera,
  CheckCircle2,
  Gauge,
  ShieldCheck,
  Smartphone,
  Volume2,
} from 'lucide-react'

type AlarmMode = 'classic' | 'coach' | 'silent'
type CameraState = 'idle' | 'starting' | 'active' | 'error' | 'unsupported'

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
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [alarmMode, setAlarmMode] = useState<AlarmMode>('classic')
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
      if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current)
    }
  }, [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
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
      setErrorMessage(
        error instanceof Error ? error.message : 'Camera permission was denied or unavailable.',
      )
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState((current) => (current === 'unsupported' ? 'unsupported' : 'idle'))
  }

  function triggerAlarm() {
    setDetectionCount((count) => count + 1)
    setAlarmActive(true)

    if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current)
    alarmTimerRef.current = window.setTimeout(() => {
      setAlarmActive(false)
    }, 4000)
  }

  function clearAlarm() {
    setAlarmActive(false)
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
                <strong>{cameraState === 'starting' ? 'Opening camera...' : 'Camera preview off'}</strong>
                <span>
                  {cameraState === 'unsupported'
                    ? 'This browser does not expose camera APIs.'
                    : 'Start the camera or use the simulator path.'}
                </span>
              </div>
            )}
          </div>
          {errorMessage && <p className="error-note">Camera error: {errorMessage}</p>}
          <div className="monitor-controls">
            <button type="button" onClick={stopCamera} disabled={cameraState !== 'active'}>
              Stop Camera
            </button>
            <button type="button" onClick={triggerAlarm}>
              Test Alarm
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
