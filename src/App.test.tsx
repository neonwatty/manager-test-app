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
