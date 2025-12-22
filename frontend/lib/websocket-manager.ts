export type SignalType = "PPG" | "ECG"

export interface SignalData {
  timestamp: number
  signalType: SignalType
  value: number
  quality: number
}

export interface SignalPacket {
  type: "signal_data"
  payload: {
    timestamp: number
    ppg_value?: number
    ecg_value?: number
    sample_rate: number
    quality: number
  }
}

export interface ControlCommand {
  type: "control"
  command: "start_acquisition" | "stop_acquisition" | "calibrate"
  parameters?: Record<string, unknown>
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

type SignalCallback = (data: SignalData) => void
type StatusCallback = (status: ConnectionStatus) => void

export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastHeartbeat = 0

  private signalCallbacks: SignalCallback[] = []
  private statusCallbacks: StatusCallback[] = []

  constructor(private url: string) {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.updateStatus("connecting")

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log("[v0] WebSocket connected to ESP32")
        this.reconnectAttempts = 0
        this.updateStatus("connected")
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const packet: SignalPacket = JSON.parse(event.data)
          this.handleSignalPacket(packet)
          this.lastHeartbeat = Date.now()
        } catch (error) {
          console.error("[v0] Error parsing WebSocket message:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("[v0] WebSocket error:", error)
        this.updateStatus("error")
      }

      this.ws.onclose = () => {
        console.log("[v0] WebSocket disconnected")
        this.updateStatus("disconnected")
        this.stopHeartbeat()
        this.attemptReconnect()
      }
    } catch (error) {
      console.error("[v0] Error creating WebSocket:", error)
      this.updateStatus("error")
    }
  }

  disconnect(): void {
    this.stopReconnect()
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.updateStatus("disconnected")
  }

  sendCommand(command: ControlCommand): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command))
    } else {
      console.warn("[v0] Cannot send command: WebSocket not connected")
    }
  }

  onSignal(callback: SignalCallback): () => void {
    this.signalCallbacks.push(callback)
    return () => {
      this.signalCallbacks = this.signalCallbacks.filter((cb) => cb !== callback)
    }
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback)
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback)
    }
  }

  private handleSignalPacket(packet: SignalPacket): void {
    const { timestamp, ppg_value, ecg_value, quality } = packet.payload

    if (ppg_value !== undefined) {
      this.emitSignal({
        timestamp,
        signalType: "PPG",
        value: ppg_value,
        quality,
      })
    }

    if (ecg_value !== undefined) {
      this.emitSignal({
        timestamp,
        signalType: "ECG",
        value: ecg_value,
        quality,
      })
    }
  }

  private emitSignal(data: SignalData): void {
    this.signalCallbacks.forEach((callback) => callback(data))
  }

  private updateStatus(status: ConnectionStatus): void {
    this.statusCallbacks.forEach((callback) => callback(status))
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[v0] Max reconnection attempts reached")
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    console.log(`[v0] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }

  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now()
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat
      if (timeSinceLastHeartbeat > 5000) {
        console.warn("[v0] No heartbeat received, connection may be stale")
      }
    }, 2000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}
