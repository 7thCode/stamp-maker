import type { StampApi } from '../../shared/api'

declare global {
  interface Window {
    stamp: StampApi
  }
}
