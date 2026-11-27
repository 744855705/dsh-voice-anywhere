/**
 * Minimal ambient shapes for the modules the bundle resolves at build time.
 *
 * These are hosts we do not compile: the React runtime, the client stores, the
 * UI primitives, the reused official component and the build stamp. Declaring
 * them here keeps `tsc --noEmit` checking *our* code without pulling the DSH
 * installation into the type graph.
 */
declare module 'react' {
  export type ReactNode = unknown
  export function createElement(type: unknown, props?: unknown, ...children: unknown[]): unknown
  export function useState<T>(initial: T | (() => T)): readonly [T, (next: T | ((prev: T) => T)) => void]
  export function useRef<T>(initial: T): { current: T }
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export class Component<P = Record<string, unknown>, S = Record<string, unknown>> {
    constructor(props: P)
    readonly props: P
    state: S
    setState(next: S | ((previous: S) => S)): void
    render(): unknown
  }
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown
  export function jsx(type: unknown, props: unknown, key?: unknown): unknown
  export function jsxs(type: unknown, props: unknown, key?: unknown): unknown
}

declare module 'react-dom' {
  export function createPortal(node: unknown, container: unknown): unknown
}

declare module '@deepseek-ai/dsh-client-store' {
  export interface SnapshotStore<T> {
    getSnapshot(): T
    set(next: T): void
    subscribe(listener: () => void): () => void
  }
  export function createSnapshotStore<T>(initial: T): SnapshotStore<T>
}

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  export const Button: unknown
}

declare module 'voice-anywhere:build' {
  const build: { readonly official: string; readonly builtAt: string; readonly engines: string; readonly srcHash: string; readonly officialHash: string }
  export default build
}

declare module 'voice-official/*' {
  export const VoiceInput: unknown
  export class Recording {
    constructor(onDispose: () => void, deviceId: string)
    dispose(): void | Promise<void>
  }
  export function createMicrophoneDeviceStore(): {
    getSnapshot(): { id: string; label?: string }
    set(device: { id: string; label: string }): void
    subscribe(listener: () => void): () => void
  }
  export const de: Record<string, string>
  export const en: Record<string, string>
  export const es: Record<string, string>
  export const fr: Record<string, string>
  export const ja: Record<string, string>
  export const pt: Record<string, string>
  export const ru: Record<string, string>
  export const zh: Record<string, string>
}
