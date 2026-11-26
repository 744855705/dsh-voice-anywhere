/**
 * Whether the settings page is recording a trigger.
 *
 * The engine must go quiet while a trigger is being recorded, otherwise the
 * very combination the user is adding would fire dictation on the way in.
 */
let capturing = false

/** @returns whether a trigger is being recorded right now. */
export function isCapturing(): boolean {
  return capturing
}

/**
 * Mark the recorder as active or idle.
 * @param value - whether the page is capturing.
 */
export function setCapturing(value: boolean): void {
  capturing = value
}
