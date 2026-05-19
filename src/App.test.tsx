import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function installCameraMock() {
  const stop = vi.fn()
  const stream = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream
  const getUserMedia = vi.fn().mockResolvedValue(stream)

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })

  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)

  return { getUserMedia, stop }
}

function installAudioMock() {
  const connect = vi.fn()
  const disconnect = vi.fn()
  const start = vi.fn()
  const stop = vi.fn()
  const oscillator = {
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect,
    disconnect,
    start,
    stop,
    type: 'sine',
  }
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect,
    disconnect,
  }
  const context = {
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    destination: {},
    currentTime: 12,
    resume: vi.fn().mockResolvedValue(undefined),
  }
  const AudioContextMock = vi.fn(() => context)

  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: AudioContextMock,
  })

  return { AudioContextMock, context, oscillator, gain }
}

describe('Phone Lunk Alarm Lab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the primary alarm lab workflow', () => {
    installCameraMock()

    render(<App />)

    expect(screen.getByRole('heading', { name: /phone lunk alarm lab/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /simulate phone spot/i })).toBeInTheDocument()
    expect(screen.getByText(/private by default/i)).toBeInTheDocument()
  })

  it('starts and stops a camera preview', async () => {
    const user = userEvent.setup()
    const { getUserMedia, stop } = installCameraMock()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /start camera/i }))

    await waitFor(() => {
      expect(screen.getByText(/camera monitoring/i)).toBeInTheDocument()
    })
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
      audio: false,
    })

    await user.click(screen.getByRole('button', { name: /stop camera/i }))

    expect(stop).toHaveBeenCalled()
    expect(screen.getByText(/camera idle/i)).toBeInTheDocument()
  })

  it('increments detections and clears alarm overlay', async () => {
    const user = userEvent.setup()
    installCameraMock()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /simulate phone spot/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/phone lunk detected/i)
    expect(screen.getByText('1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('changes alarm copy when coach mode is selected', async () => {
    const user = userEvent.setup()
    installCameraMock()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /coach mode/i }))
    await user.click(screen.getByRole('button', { name: /test alarm/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/rack it or scroll elsewhere/i)
  })

  it('requires explicit audio opt-in before playing a browser alarm tone', async () => {
    const user = userEvent.setup()
    installCameraMock()
    const { AudioContextMock, context, oscillator, gain } = installAudioMock()

    render(<App />)

    expect(screen.getByText(/audio alarm off/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /simulate phone spot/i }))

    expect(AudioContextMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /enable audio alarm/i }))
    await user.click(screen.getByRole('button', { name: /test alarm/i }))

    await waitFor(() => {
      expect(context.resume).toHaveBeenCalled()
    })
    expect(context.createOscillator).toHaveBeenCalled()
    expect(context.createGain).toHaveBeenCalled()
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, 12)
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 12)
    expect(oscillator.start).toHaveBeenCalledWith(12)

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(oscillator.stop).toHaveBeenCalled()
    expect(screen.getByText(/audio alarm ready/i)).toBeInTheDocument()
  })

  it('mutes audio alarm playback after opt-in', async () => {
    const user = userEvent.setup()
    installCameraMock()
    const { context } = installAudioMock()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /enable audio alarm/i }))
    await user.click(screen.getByRole('button', { name: /mute audio alarm/i }))
    await user.click(screen.getByRole('button', { name: /test alarm/i }))

    expect(context.createOscillator).not.toHaveBeenCalled()
    expect(screen.getByText(/audio alarm muted/i)).toBeInTheDocument()
  })

  it('explains denied camera permission with a clear recovery path', async () => {
    const user = userEvent.setup()
    const getUserMedia = vi.fn().mockRejectedValue(
      Object.assign(new Error('Permission denied by browser'), {
        name: 'NotAllowedError',
      }),
    )

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })

    render(<App />)

    await user.click(screen.getByRole('button', { name: /start camera/i }))

    expect(await screen.findByText(/camera permission blocked/i)).toBeInTheDocument()
    expect(screen.getByText(/allow camera access in the browser/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry camera/i })).toBeInTheDocument()
  })

  it('shows unsupported state when camera APIs are missing', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    })

    render(<App />)

    expect(screen.getByText(/camera unsupported/i)).toBeInTheDocument()
    expect(screen.getByText(/does not expose camera APIs/i)).toBeInTheDocument()
  })
})
