import type { Register } from 'claude-code'
import { register as registerBuild } from './build'
import { register as registerCanvas } from './canvas'

// Build · Run · Tests · Preview · Simulator pane + band: one plugin, one module.
export const register: Register = (on, options) => {
  registerBuild(on, options)
  registerCanvas(on, options)
}
