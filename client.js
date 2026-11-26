window.__ModuleLoader__.load({
  id: "dsh-voice-anywhere",
  factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let react = require("react");
let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
let react_dom = require("react-dom");
let react_jsx_runtime = require("react/jsx-runtime");
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
//#region \0voice-anywhere:build
var _voice_anywhere_build_default = {
	"official": "0.2.3-alpha.2",
	"builtAt": "2026-11-26T21:36:13.135Z",
	"engines": "^0.2.3-alpha.2",
	"srcHash": "f7795175299b985c"
};
//#endregion
//#region src/controls.ts
/** The official microphone occupies this slot inside the composer card. */
const COMPOSER_CONTAINER = "[data-composer-card] [data-slot=\"conversation.input.activity\"]";
/** Our floating instance marks its portal root. */
const FLOATING_ROOT = "[data-voice-anywhere-root]";
/** Both instances render the capture row with this phase attribute. */
const ACTIVITY = "[data-voice-activity]";
/**
* Read the phase of one microphone container.
* @param container - slot anchor or portal root.
* @returns the press-relevant state.
*/
function stateOf(container) {
	if (container === null) return "none";
	const row = container.querySelector(ACTIVITY);
	if (row === null) return container.querySelector("button") === null ? "none" : "idle";
	return row.getAttribute("data-voice-activity") === "recording" ? "recording" : "busy";
}
/**
* Detect a capture already running somewhere other than `container`.
* @param container - the container a press would act on, or null when it does not exist yet.
* @returns whether another entry holds the microphone.
*/
function hasForeignRecording(container) {
	for (const row of document.querySelectorAll("[data-voice-activity=\"recording\"]")) if (container === null || !container.contains(row)) return true;
	return false;
}
/**
* Build a control over one container.
* @param find - locates the current container.
* @returns the press contract.
*/
function controlOver(find) {
	const state = () => stateOf(find());
	const canPress = () => {
		const container = find();
		const phase = stateOf(container);
		if (container === null || phase === "none" || phase === "busy") return false;
		return phase === "recording" || !hasForeignRecording(container);
	};
	return {
		state,
		canPress,
		press: () => {
			if (!canPress()) return false;
			const container = find();
			if (container === null) return false;
			const buttons = (container.querySelector(ACTIVITY) ?? container).querySelectorAll("button");
			if (buttons.length === 0) return false;
			(stateOf(container) === "recording" ? buttons[buttons.length - 1] : buttons[0]).click();
			return true;
		}
	};
}
/** The microphone inside the conversation composer. */
const composerControl = controlOver(() => document.querySelector(COMPOSER_CONTAINER));
/** The microphone this plugin floats next to the focused field. */
const floatingControl = controlOver(() => document.querySelector(FLOATING_ROOT));
//#endregion
//#region src/diagnostics.ts
const MAX_EVENTS = 50;
let facts = {};
let events = [];
/** Publish the current snapshot, ignoring a window that cannot hold it. */
function publish() {
	try {
		window.__voiceAnywhere = {
			...facts,
			events: [...events]
		};
	} catch {}
}
/**
* Replace the published surface.
* @param initial - build metadata and any facts known at start-up.
*/
function installDiagnostics(initial) {
	facts = { ...initial };
	events = [];
	publish();
}
/**
* Record a handled failure and report it once on the console.
* @param kind - short tag naming the failing step.
* @param error - the thrown value.
*/
function report(kind, error) {
	const message = error instanceof Error ? error.message : String(error);
	events.push({
		kind,
		message,
		at: (/* @__PURE__ */ new Date()).toISOString()
	});
	if (events.length > MAX_EVENTS) events.shift();
	publish();
	console.warn(`[voice-anywhere] ${kind}: ${message}`);
}
/**
* Attach one fact to the published surface.
* @param patch - fields to merge.
*/
function note(patch) {
	facts = {
		...facts,
		...patch
	};
	publish();
}
//#endregion
//#region src/selectors.ts
/**
* The DOM markers this plugin keys on.
*
* One definition each: the official `Modal` writes `data-shortcut-modal`, the
* question card writes `data-question-key`, and the opt-in marker is ours. A
* copy of any of these literals elsewhere is a bug waiting for a rename.
*/
const SELECTORS = {
	/** The composer card; it owns its own microphone and is never ours. */
	composer: "[data-composer-card]",
	/** The composer's editable root; the composer's own Enter handler lives on it. */
	composerInput: "[data-composer-card] [data-composer-input]",
	questionCard: "[data-question-key]",
	dialog: "[role=\"dialog\"][aria-modal=\"true\"]",
	shortcuts: "[data-shortcut-modal=\"shortcuts\"]",
	settings: "[data-shortcut-modal=\"settings\"]",
	platform: "[data-shortcut-modal=\"platform\"]",
	marker: "[data-voice-input]"
};
//#endregion
//#region src/config.ts
/** Configuration used when the file is missing, unreadable, or invalid. */
const DEFAULT_CONFIG = {
	allow: [],
	disable: [],
	triggers: [],
	submit: [],
	settingsPage: true,
	revision: "",
	profile: ""
};
/** Where the host half publishes the profile's configuration. */
const CONFIG_URL = "/voice-anywhere/config.json";
const TARGETS = new Set([
	"question-card",
	"dialog",
	"shortcuts"
]);
let current = DEFAULT_CONFIG;
/** @returns the configuration in force right now. */
function currentConfig() {
	return current;
}
/** Replace the configuration in force (loader and tests). */
function setConfig(next) {
	current = next;
}
/**
* Parse an unknown payload into a configuration, dropping anything off-schema.
* @param raw - parsed JSON body.
* @returns a configuration that is always safe to use.
*/
function normalizeConfig(raw) {
	if (typeof raw !== "object" || raw === null) return DEFAULT_CONFIG;
	return {
		allow: Array.isArray(raw.allow) ? raw.allow.filter((entry) => typeof entry === "string" && entry.trim() !== "") : [],
		disable: Array.isArray(raw.disable) ? raw.disable.filter((entry) => typeof entry === "string" && TARGETS.has(entry)) : [],
		triggers: stringList(raw.triggers),
		submit: stringList(raw.submit),
		settingsPage: raw.settingsPage !== false,
		revision: typeof raw.revision === "string" ? raw.revision : "",
		profile: typeof raw.profile === "string" ? raw.profile : ""
	};
}
/**
* Keep the string entries of one list field.
* @param value - raw field value.
* @returns the usable expressions.
*/
function stringList(value) {
	return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim() !== "") : [];
}
/**
* Load the profile configuration once.
*
* A transport or parse failure rejects, so the caller can report it; the
* configuration in force is left untouched, which means a broken host can never
* widen what the plugin attaches to.
* @param fetchImpl - fetch implementation, injectable for tests.
* @returns the configuration now in force.
* @throws when the route is unreachable or the body is not JSON.
*/
async function loadConfig(fetchImpl = fetch) {
	const response = await fetchImpl(CONFIG_URL, { credentials: "same-origin" });
	if (!response.ok) throw new Error(`configuration route answered ${response.status}`);
	setConfig(normalizeConfig(await response.json()));
	return current;
}
//#endregion
//#region src/policy.ts
/**
* Whether a selector matches the element or one of its ancestors.
* @param element - candidate editable.
* @param selector - user-supplied selector.
* @returns whether it matches; an invalid selector matches nothing.
*/
function matchesScope(element, selector) {
	try {
		return element.closest(selector) !== null;
	} catch {
		return false;
	}
}
/**
* Decide whether the control may appear for one surface.
* @param element - the editable in question.
* @param kind - surface family resolved by `surfaces.ts`.
* @param config - configuration in force.
* @returns whether the surface is visible to the plugin.
*/
function isSurfaceVisible(element, kind, config) {
	if (element.closest(SELECTORS.settings) !== null || element.closest(SELECTORS.platform) !== null) return false;
	if (kind === "shortcuts") return !config.disable.includes("shortcuts");
	if (kind === "dialog" && document.querySelector(SELECTORS.settings) !== null) return false;
	if (kind === "question-card") return !config.disable.includes("question-card");
	if (kind === "dialog") return !config.disable.includes("dialog");
	if (element.closest(SELECTORS.marker) !== null) return true;
	return config.allow.some((selector) => matchesScope(element, selector));
}
//#endregion
//#region src/targets.ts
/** Input types that hold free text; numbers, dates, files and passwords are excluded on purpose. */
const TEXT_INPUTS = new Set([
	"text",
	"search",
	"url",
	"tel",
	"email"
]);
/** The composer owns its own microphone, so nothing inside it is ours. */
/**
* Ignore controls that are present but unusable: hidden inputs, zero-size
* terminal and editor textareas, and anything the composer owns.
* @param element - candidate control.
* @returns whether the control can receive dictated text.
*/
function usable(element) {
	const rect = element.getBoundingClientRect();
	return rect.width >= 60 && rect.height >= 16 && element.getClientRects().length > 0;
}
/**
* Classify the element that just received focus.
* @param node - focus target, possibly a descendant of an editor.
* @returns the editable to dictate into, or null when this element is not ours.
*/
function classify(node) {
	if (!(node instanceof HTMLElement)) return null;
	if (node.closest(SELECTORS.composer)) return null;
	if (node instanceof HTMLInputElement) {
		if (!TEXT_INPUTS.has(node.type) || node.disabled || node.readOnly || !usable(node)) return null;
		return {
			element: node,
			kind: "field"
		};
	}
	if (node instanceof HTMLTextAreaElement) {
		if (node.disabled || node.readOnly || !usable(node)) return null;
		return {
			element: node,
			kind: "field"
		};
	}
	const editor = node.closest("[contenteditable=\"true\"], [contenteditable=\"\"]");
	if (editor instanceof HTMLElement && !editor.closest(SELECTORS.composer) && usable(editor)) return {
		element: editor,
		kind: "editor"
	};
	return null;
}
/**
* Write dictated text into a target at its caret.
* @param target - editable captured when recording started.
* @param text - transcript.
* @returns whether the text landed in the target.
*/
function insertText(target, text) {
	if (!target.element.isConnected) return false;
	return target.kind === "field" ? insertField(target.element, text) : insertEditor(target.element, text);
}
/**
* React controls read their value back from the DOM on the native `input`
* event, so the prototype setter (which bypasses React's value tracker) plus
* one bubbling event is the path that keeps the component's own state in sync.
* @param element - input or textarea.
* @param text - transcript.
* @returns true after the event is dispatched.
*/
function insertField(element, text) {
	const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
	if (setter === void 0) return false;
	const current = element.value;
	const next = current + (current.length > 0 && !/\s$/u.test(current) ? " " : "") + text;
	setter.call(element, next);
	element.focus({ preventScroll: true });
	const caret = next.length;
	try {
		element.setSelectionRange(caret, caret);
	} catch {}
	element.dispatchEvent(new Event("input", { bubbles: true }));
	return true;
}
/**
* Rich editors (Lexical among them) commit a `beforeinput` insertion in a
* microtask, so a synchronous "unchanged" reading proves nothing: insert once,
* and only a still-unchanged editor after three macrotasks gets one plain DOM
* insert, which must not dispatch `input` or the text lands twice.
* @param element - contenteditable host.
* @param text - transcript.
* @returns true after the first insertion attempt.
*/
function insertEditor(element, text) {
	if (document.activeElement !== element) element.focus({ preventScroll: true });
	const selection = document.getSelection();
	if (selection !== null) {
		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(false);
		selection.removeAllRanges();
		selection.addRange(range);
	}
	const before = readEditor(element);
	let executed = false;
	try {
		executed = document.execCommand("insertText", false, text);
	} catch {
		executed = false;
	}
	if (!executed) {
		appendPlain(element, text);
		return true;
	}
	setTimeout(() => setTimeout(() => setTimeout(() => {
		if (element.isConnected && readEditor(element) === before) appendPlain(element, text);
	}, 0), 0), 0);
	return true;
}
/**
* Read editor text without relying on layout.
* @param element - contenteditable host.
* @returns its current text.
*/
function readEditor(element) {
	return element.innerText ?? element.textContent ?? "";
}
/**
* Insert at the caret without touching the editor's event pipeline.
* @param element - contenteditable host.
* @param text - transcript.
*/
function appendPlain(element, text) {
	const selection = document.getSelection();
	const range = document.createRange();
	const current = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
	if (current !== null && element.contains(current.endContainer)) {
		range.setStart(current.endContainer, current.endOffset);
		range.collapse(true);
	} else {
		range.selectNodeContents(element);
		range.collapse(false);
	}
	range.insertNode(document.createTextNode(text));
	const caret = document.createRange();
	caret.selectNodeContents(element);
	caret.collapse(false);
	selection?.removeAllRanges();
	selection?.addRange(caret);
}
//#endregion
//#region src/surfaces.ts
/**
* Which surface the current focus belongs to.
*
* A surface is the smallest thing that decides both whether the microphone may
* appear and where it goes: the official composer (never ours), the question
* card, a dialog, the shortcut reference, or a plain field.
*/
/** Hosts worth scanning when nothing has focus; the card, every dialog, the reference. */
const DOCK_HOSTS = `${SELECTORS.questionCard}, ${SELECTORS.dialog}, ${SELECTORS.shortcuts}`;
/**
* Find the first editable inside a host.
* @param host - question card, dialog, or shortcut reference.
* @returns the editable, or null when the host offers none.
*/
function fieldWithin(host) {
	for (const element of host.querySelectorAll("textarea, input, [contenteditable=\"true\"], [contenteditable=\"\"]")) {
		const found = classify(element);
		if (found !== null) return {
			element: found.element,
			kind: found.kind
		};
	}
	return null;
}
/**
* Name the surface an editable belongs to.
* @param element - the editable.
* @param fieldKind - its classification.
* @param focused - whether it holds focus.
* @returns the resolved surface.
*/
function surfaceOf(element, fieldKind, focused) {
	const card = element.closest(SELECTORS.questionCard);
	if (card instanceof HTMLElement) return {
		kind: "question-card",
		focused,
		host: card,
		field: element,
		fieldKind
	};
	const shortcuts = element.closest(SELECTORS.shortcuts);
	if (shortcuts instanceof HTMLElement) return {
		kind: "shortcuts",
		focused,
		host: shortcuts,
		field: element,
		fieldKind
	};
	const dialog = element.closest(SELECTORS.dialog);
	if (dialog instanceof HTMLElement) return {
		kind: "dialog",
		focused,
		host: dialog,
		field: element,
		fieldKind
	};
	return {
		kind: "plain",
		focused,
		host: null,
		field: element,
		fieldKind
	};
}
/**
* Name a host scanned by selector, without asking the field for its ancestry.
* @param host - element matched by `DOCK_HOSTS`.
* @returns its surface kind.
*/
function kindOfHost(host) {
	if (host.matches(SELECTORS.questionCard)) return "question-card";
	if (host.matches(SELECTORS.shortcuts)) return "shortcuts";
	if (host.matches(SELECTORS.dialog)) return "dialog";
	return "plain";
}
/**
* Resolve the surface that owns the control right now.
*
* Focus decides first. Without focus, only a host can carry the control, so the
* highest host with an editable is considered — newest first, because dialogs
* are appended to the body.
* @param config - configuration in force.
* @returns the visible surface, or null when nothing may show the control.
*/
function findSurface(config = currentConfig()) {
	const focused = classify(document.activeElement);
	if (focused !== null) {
		const surface = surfaceOf(focused.element, focused.kind, true);
		return isSurfaceVisible(surface.field, surface.kind, config) ? surface : null;
	}
	const hosts = document.querySelectorAll(DOCK_HOSTS);
	for (let index = hosts.length - 1; index >= 0; index -= 1) {
		const host = hosts[index];
		const field = fieldWithin(host);
		if (field === null) continue;
		const surface = {
			kind: kindOfHost(host),
			focused: false,
			host,
			field: field.element,
			fieldKind: field.kind
		};
		if (isSurfaceVisible(surface.field, surface.kind, config)) return surface;
	}
	return null;
}
//#endregion
//#region src/activate.ts
/**
* The one activation both triggers share.
*
* A key, a mouse button and the official shortcut must agree on what "toggle
* the microphone" means, so all three plan the same action here: stop whatever
* is capturing, otherwise press whichever control the current focus owns.
*/
/** The composer card owns its own microphone; ancestry decides which one to press. */
/** Frames to wait for the floating control to mount after we move focus. */
const FOCUS_ATTEMPTS = 8;
/**
* Dictate into a field that does not have focus yet: move focus there, wait for
* the floating control to mount, then press it exactly as a click would.
* @param element - editable inside a visible host.
*/
function focusAndPress(element) {
	element.focus({ preventScroll: true });
	let attempts = 0;
	const step = () => {
		if (floatingControl.press()) return;
		if (attempts < FOCUS_ATTEMPTS) {
			attempts += 1;
			requestAnimationFrame(step);
		}
	};
	requestAnimationFrame(step);
}
/**
* Plan the activation for this keypress or click.
* @param target - the event target, when a shortcut supplies one.
* @returns the action to run, or null when nothing should happen.
*/
function planActivation(target) {
	const focused = target ?? document.activeElement;
	const inComposer = focused instanceof Element && focused.closest(SELECTORS.composer) !== null;
	const composerState = composerControl.state();
	const floatingState = floatingControl.state();
	const states = {
		focused: focused instanceof Element ? focused.tagName : String(focused),
		inComposer,
		composerState,
		floatingState,
		field: classify(focused) !== null
	};
	if (composerState === "recording") {
		note({
			...states,
			branch: "composer-recording"
		});
		return () => {
			composerControl.press();
		};
	}
	if (floatingState === "recording") {
		note({
			...states,
			branch: "floating-recording"
		});
		return () => {
			floatingControl.press();
		};
	}
	if (inComposer && composerState === "idle") {
		note({
			...states,
			branch: "composer-idle"
		});
		return () => {
			composerControl.press();
		};
	}
	if (!inComposer && floatingState === "idle") {
		note({
			...states,
			branch: "floating-idle"
		});
		return () => {
			floatingControl.press();
		};
	}
	if (floatingState === "none") {
		if (classify(focused) !== null) {
			note({
				...states,
				branch: "denied-field"
			});
			return null;
		}
		const surface = findSurface();
		if (surface !== null) {
			note({
				...states,
				branch: `surface:${surface.kind}`
			});
			return () => focusAndPress(surface.field);
		}
		note({
			...states,
			branch: "no-surface"
		});
	}
	if (focused instanceof Element && (focused.closest(SELECTORS.settings) !== null || focused.closest(SELECTORS.platform) !== null)) {
		note({
			...states,
			branch: "settings-context"
		});
		return null;
	}
	if (floatingState === "none" && composerState === "idle") {
		note({
			...states,
			branch: "composer-fallback"
		});
		return () => {
			composerControl.press();
		};
	}
	note({
		...states,
		branch: "nothing"
	});
	return null;
}
//#endregion
//#region src/capture-state.ts
/**
* Whether the settings page is recording a trigger.
*
* The engine must go quiet while a trigger is being recorded, otherwise the
* very combination the user is adding would fire dictation on the way in.
*/
let capturing = false;
/** @returns whether a trigger is being recorded right now. */
function isCapturing() {
	return capturing;
}
/**
* Mark the recorder as active or idle.
* @param value - whether the page is capturing.
*/
function setCapturing(value) {
	capturing = value;
}
//#endregion
//#region src/face.ts
/** The bundle whose detail page hosts the setup guidance. */
const VOICE_BUNDLE = "@deepseek-ai/dsh-experimental-voice-input-bundle";
/**
* Build the injected face.
* @param sources - context, speech, recorder and the navigation mirror.
* @returns the object the slot injects.
*/
function createFace({ ctx, speech, recorder, navigation }) {
	return {
		hooks: {
			speechReadiness: speech.store,
			microphoneDevice: recorder.devices,
			pluginNavigation: navigation
		},
		createRecording: () => recorder.createRecording(),
		transcribe: (request, signal) => speech.transcribe(request, signal),
		openSettings: () => {
			try {
				ctx.get("pluginNavigation")?.openBundle(VOICE_BUNDLE);
			} catch (error) {
				report("open-settings", error);
			}
		},
		prepare: (providerId, options) => speech.prepare(providerId, options),
		cancelPreparation: (providerId) => speech.cancelPreparation(providerId),
		configure: (patch) => speech.configure(patch),
		selectMicrophone: (device) => {
			recorder.devices.set(device);
		},
		refreshReadiness: () => speech.refresh()
	};
}
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/audio.ts
/** Browser-owned microphone capture and native Web Audio resampling. */
/** Capture failure whose message is localized by the caller. */
var RecordingError = class extends Error {
	kind;
	constructor(kind) {
		super(kind);
		this.kind = kind;
		this.name = "RecordingError";
	}
};
/**
* Encode mono floating-point samples as the canonical PCM16 WAV accepted by the Host.
* @param samples - native-resampled 16 kHz mono samples.
* @returns complete little-endian WAV bytes.
*/
function encodeWave(samples) {
	const bytes = new Uint8Array(44 + samples.length * 2);
	const view = new DataView(bytes.buffer);
	const text = (at, value) => {
		for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i);
	};
	text(0, "RIFF");
	view.setUint32(4, bytes.length - 8, true);
	text(8, "WAVE");
	text(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, 16e3, true);
	view.setUint32(28, 32e3, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	text(36, "data");
	view.setUint32(40, samples.length * 2, true);
	for (const [i, sample] of samples.entries()) {
		const value = Math.max(-1, Math.min(1, sample));
		view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
	}
	return bytes;
}
/**
* Encode the binary recording for the existing JSON Remote carrier.
* @param bytes - complete recording.
* @returns base64 with no data URL prefix.
*/
function audioBase64(bytes) {
	let text = "";
	for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
	return btoa(text);
}
/** One microphone acquisition, including a permission prompt that may settle after cancellation. */
var Recording = class {
	onDispose;
	deviceId;
	stream;
	recorder;
	context;
	analyser;
	samples = new Float32Array(256);
	chunks = [];
	lifetime = new AbortController();
	disposal;
	constructor(onDispose, deviceId = "") {
		this.onDispose = onDispose;
		this.deviceId = deviceId;
	}
	/**
	* Acquire the selected microphone without recording or playing audio.
	* @param onError - receives device interruptions before resource release completes.
	* @returns after the level analyser starts; cancelled grants release their tracks immediately.
	*/
	async preview(onError) {
		const devices = navigator.mediaDevices;
		if (!devices) throw new RecordingError("unavailable");
		let stream;
		try {
			stream = await devices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					...this.deviceId === "" ? {} : { deviceId: { exact: this.deviceId } }
				},
				video: false
			});
		} catch (error) {
			if (error instanceof DOMException) {
				if (error.name === "NotAllowedError") throw new RecordingError("permission");
				if (error.name === "NotFoundError" || error.name === "OverconstrainedError") throw new RecordingError("deviceMissing");
			}
			throw error;
		}
		if (this.lifetime.signal.aborted) {
			stream.getTracks().forEach((track) => {
				track.stop();
			});
			throw new RecordingError("cancelled");
		}
		this.stream = stream;
		try {
			this.context = new AudioContext();
			this.analyser = this.context.createAnalyser();
			this.analyser.fftSize = this.samples.length;
			this.context.createMediaStreamSource(stream).connect(this.analyser);
			for (const track of stream.getTracks()) track.addEventListener("ended", () => {
				this.interrupted(onError);
			}, { signal: this.lifetime.signal });
		} catch (error) {
			await this.dispose();
			throw error;
		}
	}
	/**
	* Acquire the selected microphone and record audio for transcription.
	* @param onError - receives failures during capture, before asynchronous resource release finishes.
	* @returns after capture starts; a cancelled permission grant immediately releases its tracks.
	*/
	async start(onError) {
		if (typeof MediaRecorder === "undefined") throw new RecordingError("unavailable");
		await this.preview(onError);
		if (this.lifetime.signal.aborted) throw new RecordingError("cancelled");
		try {
			this.recorder = new MediaRecorder(this.stream);
			this.recorder.ondataavailable = (event) => {
				if (!this.lifetime.signal.aborted && event.data.size > 0) this.chunks.push(event.data);
			};
			this.recorder.onerror = () => {
				this.interrupted(onError);
			};
			this.recorder.start();
		} catch (error) {
			await this.dispose();
			throw error;
		}
	}
	interrupted(onError) {
		if (this.lifetime.signal.aborted) return;
		this.dispose().catch(() => void 0);
		try {
			onError?.(new RecordingError("interrupted"));
		} catch (error) {
			console.error("Speech recording error handler failed", error);
		}
	}
	/**
	* Read the live microphone signal.
	* @returns the measured RMS level, or zero outside capture.
	*/
	amplitude() {
		if (!this.analyser) return 0;
		this.analyser.getFloatTimeDomainData(this.samples);
		let sum = 0;
		for (const sample of this.samples) sum += sample * sample;
		return Math.sqrt(sum / this.samples.length);
	}
	/**
	* Identify the input actually acquired by this operation.
	* @returns the audio track's name and device group, or undefined outside capture.
	*/
	deviceInfo() {
		const track = this.stream?.getAudioTracks()[0];
		return track ? {
			label: track.label,
			groupId: track.getSettings().groupId ?? ""
		} : void 0;
	}
	/**
	* Finish capture and resample the recording.
	* @param maxDurationSeconds - truncate timer overshoot to the Host limit.
	* @returns one recording after the final MediaRecorder chunk arrives.
	*/
	async stop(maxDurationSeconds) {
		const recorder = this.recorder;
		const context = this.context;
		if (!recorder || !context || recorder.state !== "recording") {
			await this.dispose();
			throw new RecordingError("empty");
		}
		try {
			await new Promise((resolve, reject) => {
				recorder.onstop = () => {
					resolve();
				};
				recorder.onerror = () => {
					reject(new RecordingError("empty"));
				};
				recorder.stop();
			});
			this.stream?.getTracks().forEach((track) => {
				track.stop();
			});
			this.lifetime.signal.throwIfAborted();
			const blob = new Blob(this.chunks, { type: recorder.mimeType });
			if (blob.size === 0) throw new RecordingError("empty");
			const decoded = await context.decodeAudioData(await blob.arrayBuffer());
			this.lifetime.signal.throwIfAborted();
			const offline = new OfflineAudioContext(1, Math.max(1, Math.floor(Math.min(decoded.duration, maxDurationSeconds) * 16e3)), 16e3);
			const source = offline.createBufferSource();
			source.buffer = decoded;
			source.connect(offline.destination);
			source.start();
			const resampled = await offline.startRendering();
			this.lifetime.signal.throwIfAborted();
			return encodeWave(resampled.getChannelData(0));
		} finally {
			await this.dispose();
		}
	}
	/**
	* Release this recording and invalidate pending permission grants.
	* @returns the shared release promise, including any AudioContext close failure.
	*/
	dispose() {
		if (!this.disposal) {
			const closing = Promise.withResolvers();
			this.disposal = closing.promise;
			this.release().then(closing.resolve, closing.reject);
		}
		return this.disposal;
	}
	async release() {
		this.lifetime.abort(new RecordingError("cancelled"));
		if (this.recorder?.state === "recording") this.recorder.stop();
		this.stream?.getTracks().forEach((track) => {
			track.stop();
		});
		this.stream = void 0;
		const context = this.context;
		this.context = void 0;
		this.analyser = void 0;
		this.chunks = [];
		try {
			if (context && context.state !== "closed") await context.close();
		} finally {
			this.onDispose();
		}
	}
};
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/failure-text.ts
/**
* Translate a capture or transcription failure.
* @param failure - the rejected value.
* @param t - the active voice-input translator.
* @returns localized failure text.
*/
function failureText(failure, t) {
	return failure instanceof RecordingError ? t(failure.kind) : t("failed", { message: failure instanceof Error ? failure.message : String(failure) });
}
//#endregion
//#region \0voice-anywhere-css:/home/yanhongbin/deepseek-harness/packages/experimental/client-ui-voice-input/src/client/VoiceInput.module.css?va-module
var VoiceInput_module_default = {
	"preparationActions": "qU0WNq_preparationActions",
	"setupEstimate": "qU0WNq_setupEstimate",
	"roundButton": "qU0WNq_roundButton",
	"inlineAction": "qU0WNq_inlineAction",
	"metric": "qU0WNq_metric",
	"summaryTitle": "qU0WNq_summaryTitle",
	"deviceSelectMeter": "qU0WNq_deviceSelectMeter",
	"deviceError": "qU0WNq_deviceError",
	"deviceMeter": "qU0WNq_deviceMeter",
	"summaryRow": "qU0WNq_summaryRow",
	"steps": "qU0WNq_steps",
	"waveform": "qU0WNq_waveform",
	"preparation": "qU0WNq_preparation",
	"preferences": "qU0WNq_preferences",
	"triggerAnchor": "qU0WNq_triggerAnchor",
	"captureRow": "qU0WNq_captureRow",
	"activityMessage": "qU0WNq_activityMessage",
	"preparationError": "qU0WNq_preparationError",
	"downloadFailure": "qU0WNq_downloadFailure",
	"trigger": "qU0WNq_trigger",
	"stepBody": "qU0WNq_stepBody",
	"deviceRow": "qU0WNq_deviceRow",
	"sourceChoice": "qU0WNq_sourceChoice",
	"progress": "qU0WNq_progress",
	"settingsCard": "qU0WNq_settingsCard",
	"deviceField": "qU0WNq_deviceField",
	"stepProgress": "qU0WNq_stepProgress",
	"inputLevel": "qU0WNq_inputLevel"
};
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/Waveform.tsx
/** Live microphone amplitude history; animation updates SVG geometry without React state churn. */
/** Render recent measured microphone levels; silent audio remains a dotted baseline. */
function Waveform({ recording, label }) {
	const svg = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		const bars = Array.from(svg.current.querySelectorAll("line")).reverse().map((element) => ({
			element,
			level: 0
		}));
		let frame, previous = -Infinity;
		const draw = (now) => {
			if (now - previous >= 50) {
				previous = now;
				let next = recording?.amplitude() ?? 0;
				for (const bar of bars) {
					const previousLevel = bar.level;
					bar.level = next;
					next = previousLevel;
					const height = 1 + Math.min(1, bar.level * 5) * 17;
					bar.element.setAttribute("y1", String(20 - height));
					bar.element.setAttribute("y2", String(20 + height));
				}
			}
			frame = requestAnimationFrame(draw);
		};
		frame = requestAnimationFrame(draw);
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [recording]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		ref: svg,
		className: VoiceInput_module_default.waveform,
		viewBox: "0 0 640 40",
		preserveAspectRatio: "none",
		role: "img",
		"aria-label": label,
		children: Array.from({ length: 80 }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
			x1: index * 8 + 4,
			x2: index * 8 + 4,
			y1: "19",
			y2: "21",
			stroke: "currentColor",
			strokeWidth: "3",
			strokeLinecap: "round",
			opacity: .25 + index / 120
		}, index))
	});
}
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/VoiceSetupDialog.tsx
/** Shared modal for voice activation and unavailable recognition. */
/**
* Guide activation or microphone clicks to the existing plugin details.
* @param props - visibility, installation need and navigation callbacks.
* @returns a dismissible prompt that never starts preparation or recording.
*/
function VoiceSetupDialog({ open, needsInstallation, onDismiss, onOpenDetails, t }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
		open,
		title: t(needsInstallation ? "setupPrompt.title" : "setupPrompt.unavailableTitle"),
		closeLabel: t("cancel"),
		onClose: onDismiss,
		description: t(needsInstallation ? "setupPrompt.body" : "setupPrompt.unavailableBody"),
		footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
			variant: "ghost",
			onClick: onDismiss,
			children: t("setupPrompt.later")
		}), onOpenDetails !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
			variant: "primary",
			"data-modal-autofocus": true,
			onClick: onOpenDetails,
			children: t(needsInstallation ? "setupPrompt.open" : "setupPrompt.details")
		})] })
	});
}
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/VoiceInput.tsx
/** Click-to-record toolbar activity; transcripts remain in the original Session draft. */
async function disposeRecording(capture) {
	try {
		await capture.dispose();
	} catch (_error) {}
}
/** Render a compact microphone or an expanded capture, transcription, or retry row. */
function VoiceInput({ sessionId, inputActions, locked, onActiveChange, createRecording, transcribe, openSettings, useSpeechReadiness, usePluginNavigation, t }) {
	const readiness = useSpeechReadiness((value) => value), catalog = readiness.catalog;
	const navigable = usePluginNavigation((present) => present);
	const provider = catalog?.providers.find((item) => item.id === catalog.selection.providerId);
	const usable = readiness.connected && (provider?.preparation.phase === "ready" || provider?.preparation.phase === "standby" || provider?.preparation.phase === "waking");
	const [phase, setPhase] = (0, react.useState)("idle"), [message, setMessage] = (0, react.useState)(""), [pending, setPending] = (0, react.useState)("");
	const [setupOpen, setSetupOpen] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		if (usable) setSetupOpen(false);
	}, [usable]);
	const current = (0, react.useRef)(), generation = (0, react.useRef)(0);
	const expanded = phase !== "idle";
	(0, react.useLayoutEffect)(() => {
		onActiveChange(expanded);
		return () => {
			onActiveChange(false);
		};
	}, [expanded, onActiveChange]);
	const cancel = () => {
		generation.current++;
		const active = current.current;
		current.current = void 0;
		if (active) {
			clearTimeout(active.timer);
			active.abort.abort();
			disposeRecording(active.capture);
		}
		setPending("");
		setMessage("");
		setPhase("idle");
		setSetupOpen(false);
	};
	(0, react.useEffect)(() => {
		setPending("");
		setMessage("");
		setPhase("idle");
		setSetupOpen(false);
		const blur = () => {
			if (current.current?.phase === "recording") cancel();
		};
		const visibility = () => {
			if (document.hidden && current.current && current.current.phase !== "transcribing") cancel();
		};
		const escape = (event) => {
			if (event.key === "Escape" && current.current) {
				event.preventDefault();
				cancel();
			}
		};
		window.addEventListener("blur", blur);
		document.addEventListener("visibilitychange", visibility);
		document.addEventListener("keydown", escape);
		return () => {
			window.removeEventListener("blur", blur);
			document.removeEventListener("visibilitychange", visibility);
			document.removeEventListener("keydown", escape);
			generation.current++;
			const active = current.current;
			current.current = void 0;
			if (active) {
				clearTimeout(active.timer);
				active.abort.abort();
				disposeRecording(active.capture);
			}
		};
	}, [sessionId]);
	const feedback = (text) => {
		setMessage(text);
		setPhase("feedback");
	};
	const finish = async () => {
		const active = current.current;
		if (!active || active.phase !== "recording") return;
		active.phase = "transcribing";
		const run = generation.current;
		clearTimeout(active.timer);
		setPhase("transcribing");
		try {
			const audio = await active.capture.stop(active.maxDurationSeconds);
			if (run !== generation.current) return;
			if (audio.byteLength > active.maxAudioBytes) {
				feedback(t("tooLarge"));
				return;
			}
			const result = await transcribe({
				audioBase64: audioBase64(audio),
				...active.selection
			}, active.abort.signal);
			if (run !== generation.current) return;
			if (!result.ok) {
				feedback(t("failed", { message: result.error.message }));
				return;
			}
			if (result.value.text === "") {
				feedback(t("empty"));
				return;
			}
			if (!inputActions.insertText(result.value.text, active.span)) {
				setPending(result.value.text);
				feedback(t("conflict"));
				return;
			}
			setPhase("idle");
		} catch (failure) {
			await disposeRecording(active.capture);
			if (run === generation.current) feedback(failureText(failure, t));
		} finally {
			if (run === generation.current) current.current = void 0;
		}
	};
	const start = async () => {
		if (!catalog || !usable || locked || current.current) return;
		const run = ++generation.current;
		const active = {
			capture: createRecording(),
			abort: new AbortController(),
			span: inputActions.captureInsertion(),
			selection: catalog.selection,
			maxDurationSeconds: catalog.maxDurationSeconds,
			maxAudioBytes: catalog.maxAudioBytes,
			phase: "requesting"
		};
		current.current = active;
		setMessage("");
		setPending("");
		setPhase("requesting");
		try {
			await active.capture.start((failure) => {
				if (run !== generation.current || current.current !== active || active.phase === "transcribing") return;
				current.current = void 0;
				clearTimeout(active.timer);
				active.abort.abort();
				feedback(failureText(failure, t));
			});
			if (run !== generation.current || current.current !== active) return;
			active.phase = "recording";
			setPhase("recording");
			active.timer = setTimeout(() => {
				finish();
			}, active.maxDurationSeconds * 1e3);
		} catch (failure) {
			await disposeRecording(active.capture);
			if (run === generation.current) {
				current.current = void 0;
				feedback(failureText(failure, t));
			}
		}
	};
	if (!expanded) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
		label: t("dictate"),
		disabled: !usable,
		side: "top",
		portal: true,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: VoiceInput_module_default.triggerAnchor,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				className: VoiceInput_module_default.trigger,
				size: "sm",
				disabled: locked,
				"aria-label": t(usable ? "start" : "setupPrompt.trigger"),
				"aria-haspopup": usable ? void 0 : "dialog",
				onMouseDown: (event) => {
					event.preventDefault();
				},
				onClick: () => {
					if (usable) start();
					else setSetupOpen(true);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconMicrophoneOutlineRegular, { size: 18 })
			})
		})
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoiceSetupDialog, {
		open: setupOpen && !usable,
		needsInstallation: readiness.connected && provider?.location === "host-local" && provider.preparation.phase === "unprepared",
		onDismiss: () => {
			setSetupOpen(false);
		},
		onOpenDetails: navigable ? () => {
			setSetupOpen(false);
			openSettings();
		} : void 0,
		t
	})] });
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: VoiceInput_module_default.captureRow,
		"data-voice-activity": phase,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				type: "button",
				className: VoiceInput_module_default.roundButton,
				size: "sm",
				"aria-label": t(pending ? "discard" : "cancel"),
				onClick: cancel,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
			}),
			phase === "recording" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Waveform, {
				recording: current.current?.capture,
				label: t("recording")
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: VoiceInput_module_default.activityMessage,
				role: "status",
				title: pending || message,
				children: [(phase === "requesting" || phase === "transcribing") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }), phase === "feedback" ? message : t(phase === "requesting" ? "requesting" : provider?.preparation.phase === "waking" ? "wakingShort" : "transcribingShort")]
			}),
			phase === "recording" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				type: "button",
				className: VoiceInput_module_default.roundButton,
				size: "sm",
				"aria-label": t("stop"),
				onClick: () => {
					finish();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFillRegular, { size: 14 })
			}),
			phase === "feedback" && (pending ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				className: VoiceInput_module_default.inlineAction,
				size: "sm",
				type: "button",
				onClick: () => {
					if (inputActions.insertText(pending, inputActions.captureInsertion())) {
						setPending("");
						setPhase("idle");
					}
				},
				children: t("insert")
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				className: VoiceInput_module_default.roundButton,
				size: "sm",
				type: "button",
				"aria-label": t("retryRecording"),
				disabled: !usable || locked,
				onClick: () => {
					start();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconMicrophoneOutlineRegular, { size: 18 })
			}))
		]
	});
}
//#endregion
//#region src/placement.ts
const BUTTON_SIZE = 30;
const ACTION_GAP = 8;
const MIN_ROW_WIDTH = 120;
/** Buttons within this vertical distance belong to one visual row. */
const CELL_TOLERANCE = 6;
/** Buttons closer than this horizontally belong to one cluster. */
const CLUSTER_GAP = 24;
/** An action row has at least this many buttons. */
const MIN_ACTION_BUTTONS = 2;
/**
* Group the host's visible buttons into rows and return the rightmost cluster
* of its lowest row. The question pager's chevrons sit far from the footer
* actions, so the cluster split keeps them out automatically.
* @param host - question card or dialog.
* @returns the cluster, or null when the host has no action row.
*/
function actionCluster(host) {
	const items = [...host.querySelectorAll("button")].map((element) => ({
		element,
		rect: element.getBoundingClientRect()
	})).filter((item) => item.rect.width > 0 && item.rect.height > 0);
	if (items.length === 0) return null;
	const rows = [];
	for (const item of [...items].sort((left, right) => left.rect.top - right.rect.top)) {
		const row = rows.find((candidate) => Math.abs(candidate.top - item.rect.top) <= CELL_TOLERANCE);
		if (row !== void 0) row.items.push(item);
		else rows.push({
			top: item.rect.top,
			items: [item]
		});
	}
	const lowest = rows[rows.length - 1];
	const clusters = [];
	for (const item of [...lowest.items].sort((left, right) => left.rect.left - right.rect.left)) {
		const current = clusters[clusters.length - 1];
		const last = current?.[current.length - 1];
		if (current !== void 0 && last !== void 0 && item.rect.left - last.rect.right <= CLUSTER_GAP) current.push(item);
		else clusters.push([item]);
	}
	const cluster = clusters[clusters.length - 1];
	const first = cluster?.[0];
	const parent = first?.element.parentElement;
	if (cluster === void 0 || cluster.length < MIN_ACTION_BUTTONS || first === void 0 || parent === null || parent === void 0) return null;
	const top = Math.min(...cluster.map((item) => item.rect.top));
	const bottom = Math.max(...cluster.map((item) => item.rect.bottom));
	return {
		left: Math.min(...cluster.map((item) => item.rect.left)),
		top,
		height: bottom - top,
		parent
	};
}
/**
* Bound the docked row on the left by what the row already shows.
* @param rowElement - the action cluster's grandparent row (holds the pager).
* @param band - the action row's vertical band.
* @param right - the row's right edge.
* @returns the leftmost usable x.
*/
function leftBoundary(rowElement, band, right) {
	const rowRect = rowElement.getBoundingClientRect();
	let left = rowRect.left + ACTION_GAP;
	for (const child of [...rowElement.children]) {
		if (!(child instanceof HTMLElement)) continue;
		const rect = child.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0 || rect.right > right) continue;
		if (rect.width > rowRect.width * .5) continue;
		if (rect.bottom < band.top - 10 || rect.top > band.bottom + 10) continue;
		left = Math.max(left, rect.right + ACTION_GAP);
	}
	return left;
}
/**
* Dock the control into a host's action row.
* @param host - question card or dialog.
* @param expanded - whether the capture row is showing.
* @returns the box, or null when the host has no usable action row.
*/
function dockBox(host, expanded) {
	const cluster = actionCluster(host);
	if (cluster === null) return null;
	const right = cluster.left - ACTION_GAP;
	const left = leftBoundary(cluster.parent.parentElement ?? cluster.parent, {
		top: cluster.top,
		bottom: cluster.top + cluster.height
	}, right);
	const top = cluster.top + cluster.height / 2;
	if (expanded) {
		if (right - left < MIN_ROW_WIDTH) return null;
		return {
			left,
			top,
			width: right - left
		};
	}
	return {
		left: right - BUTTON_SIZE,
		top,
		width: BUTTON_SIZE
	};
}
/**
* Follow the field itself.
* @param element - the focused editable.
* @param expanded - whether the capture row is showing.
* @returns the box, or null when the field has no usable geometry.
*/
function fieldBox(element, expanded) {
	const rect = element.getBoundingClientRect();
	if (rect.width < 60 || rect.height < 16) return null;
	if (!expanded) return {
		left: Math.max(8, Math.min(rect.right - BUTTON_SIZE - 4, window.innerWidth - BUTTON_SIZE - 6)),
		top: rect.top + rect.height / 2,
		width: BUTTON_SIZE
	};
	const width = Math.max(160, Math.min(rect.width, window.innerWidth - 16));
	return {
		left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
		top: rect.top + rect.height / 2,
		width
	};
}
function placementFor(surface, expanded) {
	if (surface.kind === "plain") {
		const box = fieldBox(surface.field, expanded);
		return box === null ? null : {
			box,
			mode: "field"
		};
	}
	const docked = surface.host === null ? null : dockBox(surface.host, expanded);
	if (docked !== null) return {
		box: docked,
		mode: "dock"
	};
	if (!surface.focused) return null;
	const box = fieldBox(surface.field, expanded);
	return box === null ? null : {
		box,
		mode: "field"
	};
}
/**
* Report the numbers behind a dock decision, for diagnostics.
* @param host - question card or dialog.
* @returns cluster geometry and the resulting band.
*/
function dockProbe(host) {
	const cluster = actionCluster(host);
	if (cluster === null) return { host: "no-action-row" };
	const right = cluster.left - ACTION_GAP;
	const rowElement = cluster.parent.parentElement ?? cluster.parent;
	const left = leftBoundary(rowElement, {
		top: cluster.top,
		bottom: cluster.top + cluster.height
	}, right);
	return {
		actionLeft: Math.round(cluster.left),
		right: Math.round(right),
		left: Math.round(left),
		width: Math.round(right - left),
		band: Math.round(cluster.top),
		children: [...rowElement.children].map((child) => ({
			right: Math.round(child.getBoundingClientRect().right),
			width: Math.round(child.getBoundingClientRect().width)
		}))
	};
}
//#endregion
//#region src/floating/use-surface-control.ts
/**
* The control's state: which editable it serves, where it sits, and whether the
* capture row is open.
*
* Kept out of the component so the rendering file stays a description of the
* portal, and so this state machine can be reasoned about (and later tested)
* without a renderer.
*/
/** How often the surface is re-resolved when no event fires. */
const SYNC_MS = 300;
/**
* Track the surface the control belongs to.
* @param refreshReadiness - speech readiness refresh, run once on mount.
* @returns the state the view renders from.
*/
function useSurfaceControl(refreshReadiness) {
	const [target, setTarget] = (0, react.useState)(null);
	const [box, setBox] = (0, react.useState)(null);
	const [expanded, setExpanded] = (0, react.useState)(false);
	const [locked, setLocked] = (0, react.useState)(false);
	const [mode, setMode] = (0, react.useState)("field");
	const expandedRef = (0, react.useRef)(false);
	const rootRef = (0, react.useRef)(null);
	const signature = (0, react.useRef)("");
	const syncRef = (0, react.useRef)(() => {});
	const identity = (0, react.useRef)(/* @__PURE__ */ new WeakMap());
	const identities = (0, react.useRef)(0);
	const identityOf = (element) => {
		const known = identity.current.get(element);
		if (known !== void 0) return known;
		identities.current += 1;
		identity.current.set(element, identities.current);
		return identities.current;
	};
	expandedRef.current = expanded;
	(0, react.useEffect)(() => {
		const sync = () => {
			const surface = findSurface();
			let next = null;
			let placement = null;
			let resolvedMode = "field";
			if (surface !== null) {
				next = {
					element: surface.field,
					kind: surface.fieldKind
				};
				const resolved = placementFor(surface, expandedRef.current);
				placement = resolved?.box ?? null;
				resolvedMode = resolved?.mode ?? "field";
				if (surface.host !== null) note({ dock: {
					kind: surface.kind,
					focused: surface.focused,
					...dockProbe(surface.host)
				} });
				note({ last: {
					expanded: expandedRef.current,
					kind: surface.kind,
					focused: surface.focused,
					box: placement === null ? null : {
						left: Math.round(placement.left),
						top: Math.round(placement.top),
						width: Math.round(placement.width)
					}
				} });
			}
			if (next !== null && !next.element.isConnected && !expandedRef.current) {
				next = null;
				placement = null;
			}
			if (expandedRef.current && (next === null || placement === null)) return;
			const key = next === null || placement === null ? "" : `${resolvedMode}|${placement.left}|${placement.top}|${placement.width}|${identityOf(next.element)}`;
			if (key !== signature.current) {
				signature.current = key;
				setTarget(next);
				setBox(placement);
				setMode(resolvedMode);
			}
			setLocked(hasForeignRecording(rootRef.current));
		};
		syncRef.current = sync;
		sync();
		refreshReadiness();
		document.addEventListener("focusin", sync, true);
		document.addEventListener("focusout", sync, true);
		window.addEventListener("scroll", sync, true);
		window.addEventListener("resize", sync);
		const timer = window.setInterval(sync, SYNC_MS);
		return () => {
			document.removeEventListener("focusin", sync, true);
			document.removeEventListener("focusout", sync, true);
			window.removeEventListener("scroll", sync, true);
			window.removeEventListener("resize", sync);
			window.clearInterval(timer);
			syncRef.current = () => {};
		};
	}, [refreshReadiness]);
	(0, react.useEffect)(() => {
		const element = target?.element ?? null;
		if (element === null) return void 0;
		if (expanded && mode === "field") element.setAttribute("data-voice-anywhere-capturing", "");
		else element.removeAttribute("data-voice-anywhere-capturing");
		return () => {
			element.removeAttribute("data-voice-anywhere-capturing");
		};
	}, [
		target,
		expanded,
		mode
	]);
	(0, react.useLayoutEffect)(() => {
		syncRef.current();
	}, [expanded]);
	return {
		target,
		box,
		expanded,
		mode,
		locked,
		setExpanded,
		rootRef
	};
}
//#endregion
//#region src/floating/view.ts
/**
* The floating control's rendering: the official microphone in a portal, sized
* and positioned by `use-surface-control`.
*
* Nothing about the button, its capture row or its feedback is reimplemented.
*/
/** The component only uses the id to reset its capture state. */
const FIXED_SESSION = "voice-anywhere";
/**
* Copy as the last resort so a transcript is never lost when its field closed.
* @param text - transcript.
*/
function copyToClipboard(text) {
	navigator.clipboard?.writeText(text).catch(() => void 0);
}
/**
* Render the official microphone where the current editable needs it.
* @param props - injected speech face, synthesized readiness hooks, translator.
* @returns the portal, or null while no editable is available.
*/
function FloatingMic(props) {
	const { createRecording, transcribe, openSettings, prepare, cancelPreparation, configure, selectMicrophone, refreshReadiness, useSpeechReadiness, useMicrophoneDevice, usePluginNavigation, t } = props;
	const { target, box, locked, setExpanded, rootRef } = useSurfaceControl(refreshReadiness);
	if (target === null || box === null) return null;
	return (0, react_dom.createPortal)((0, react.createElement)("div", {
		"data-voice-anywhere-root": "",
		ref: rootRef,
		style: {
			position: "fixed",
			left: `${box.left}px`,
			top: `${box.top}px`,
			width: `${box.width}px`,
			transform: "translateY(-50%)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			zIndex: 1050,
			pointerEvents: "none"
		}
	}, (0, react.createElement)("div", { style: {
		pointerEvents: "auto",
		width: "100%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		boxSizing: "border-box"
	} }, (0, react.createElement)(VoiceInput, {
		sessionId: FIXED_SESSION,
		inputActions: {
			captureInsertion: () => target.element.isConnected ? {
				element: target.element,
				kind: target.kind
			} : null,
			insertText: (text, span) => {
				if (span !== null) return span.element.isConnected && insertText({
					element: span.element,
					kind: span.kind
				}, text);
				copyToClipboard(text);
				return true;
			}
		},
		locked,
		onActiveChange: setExpanded,
		createRecording,
		transcribe,
		openSettings,
		prepare,
		cancelPreparation,
		configure,
		selectMicrophone,
		useSpeechReadiness,
		useMicrophoneDevice,
		usePluginNavigation,
		t
	}))), document.body);
}
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/locales.ts
/** Chinese dictionary and key source. */
const zh = {
	dictate: "听写",
	"setupPrompt.title": "使用语音输入前需要安装",
	"setupPrompt.body": "语音输入插件已开启。首次使用需要在本机下载并准备识别模型，请前往插件详情页查看空间、内存和时间说明，再开始安装。",
	"setupPrompt.later": "稍后",
	"setupPrompt.open": "前往安装",
	"setupPrompt.trigger": "打开语音输入引导",
	"setupPrompt.details": "前往语音插件设置",
	"setupPrompt.unavailableTitle": "语音识别尚未就绪",
	"setupPrompt.unavailableBody": "请前往语音插件详情页查看识别服务状态、准备进度或错误信息",
	"setup.local": "将在运行 DSH 的机器上下载本地模型，无需安装 Python 或编译工具。",
	"setup.disk": "硬盘空间",
	"setup.diskValue": "建议预留约 {gb} GB，包含模型、运行时和下载缓存",
	"setup.memory": "运行内存",
	"setup.memoryValue": "模型加载后约 {gb} GB，识别时可能更高",
	"setup.time": "首次准备",
	"setup.timeValue": "参考 {min}–{max} 分钟，取决于网络和机器性能",
	"setup.estimateNote": "以上为估算；网络较慢时可能更久。已下载的资源会复用，默认在闲置后释放模型内存。",
	"step.check": "检查本地资源",
	"step.model": "准备语音识别模型",
	"step.vad": "准备语音检测模型",
	"step.verify": "校验模型文件",
	"step.load": "加载 {name}",
	"stepStatus.pending": "未开始",
	"stepStatus.running": "进行中",
	"stepStatus.complete": "已完成",
	"stepStatus.failed": "失败",
	"stepStatus.cancelled": "已取消",
	"short.downloading": "下载中",
	"short.failed": "准备失败",
	retryRecording: "重新录音",
	preparationSteps: "准备步骤",
	"prepare": "下载并准备",
	"retryPrepare": "重试准备",
	"cancelPrepare": "取消准备",
	"downloadProgress": "下载进度",
	"downloadBytes": "下载：{completed} / {total} MB，{percent}%",
	"downloadUnknown": "已下载 {completed} MB",
	"elapsed": "已等待 {seconds} 秒",
	"preparationFailed": "准备失败：{message}",
	"download.network": "无法下载 {resource}：连接下载服务失败。",
	"download.dns": "无法下载 {resource}：无法解析下载地址。",
	"download.timeout": "下载 {resource} 超时。",
	"download.certificate": "无法下载 {resource}：安全连接的证书校验失败。",
	"download.http": "无法下载 {resource}：下载服务返回 HTTP {status}。",
	"download.integrity": "{resource} 下载不完整或文件校验失败。",
	"download.storage": "无法保存 {resource}：磁盘空间不足或没有写入权限。",
	"download.unknown": "准备 {resource} 失败。",
	"downloadAdvice.network": "请检查运行 DSH 的机器能否访问下载来源及其模型下载服务；如需代理，请在该机器上配置后重试。",
	"downloadAdvice.dns": "请检查运行 DSH 的机器的 DNS 和代理设置，确认可以解析下载来源的域名后重试。",
	"downloadAdvice.timeout": "请检查运行 DSH 的机器的网络或代理连接，稍后重试。已下载并通过校验的文件会保留。",
	"downloadAdvice.certificate": "请检查运行 DSH 的机器的系统时间、受信任证书和代理设置后重试。",
	"downloadAdvice.http": "请确认下载地址可用、代理可正常连接下载服务，或稍后重试。",
	"downloadAdvice.integrity": "请重试下载。已完成并通过校验的其他文件会保留。",
	"downloadAdvice.storage": "请检查运行 DSH 的机器的剩余磁盘空间，以及模型目录的写入权限后重试。",
	"downloadAdvice.unknown": "请检查运行 DSH 的机器的网络、磁盘空间和模型目录权限后重试。",
	downloadSource: "下载来源：{source}",
	sourceChoice: "模型下载源",
	sourceAuto: "自动选择（推荐）",
	sourceHuggingFace: "Hugging Face",
	sourceMirror: "HF-Mirror（国内镜像）",
	sourceAutoHelp: "优先使用响应较快的源，下载失败时自动尝试其他源。",
	sourceManualHelp: "仅从所选源下载；已下载并通过校验的文件会复用。",
	downloadCode: "错误码：{code}",
	"reconnecting": "正在连接语音服务…",
	"preparation.unprepared": "首次使用需要下载本地识别模型。",
	"preparation.checking": "正在检查本地资源…",
	"preparation.loading": "正在加载 {name}…",
	"preparation.waking": "正在唤醒本地语音…",
	"preparation.ready": "本地语音已就绪。",
	"preparation.standby": "本地资源已准备，录音时自动唤醒。",
	"preparation.cancelled": "准备已取消，已完成的下载会保留。",
	"preparation.cancelling": "正在取消准备…",
	cloudReady: "云端语音识别已就绪。",
	discard: "丢弃识别文字",
	transcribingShort: "识别中…",
	wakingShort: "唤醒中…",
	provider: "识别服务",
	language: "识别语言",
	inputDevice: "输入设备",
	systemMicrophone: "系统默认",
	systemMicrophoneNamed: "系统默认（{name}）",
	unnamedSelectedMicrophone: "麦克风",
	unnamedMicrophone: "麦克风 {number}",
	inputLevel: "麦克风输入电平",
	deviceUnavailable: "不可用",
	deviceMissing: "麦克风不可用，请选择其他输入设备",
	auto: "自动识别",
	zh: "中文",
	en: "英语",
	yue: "粤语",
	ja: "日语",
	es: "西班牙语",
	fr: "法语",
	de: "德语",
	ru: "俄语",
	pt: "葡萄牙语",
	ko: "韩语",
	start: "开始录音",
	stop: "停止并识别",
	cancel: "取消",
	insert: "插入文字",
	loading: "正在读取识别服务…",
	requesting: "请允许使用麦克风…",
	recording: "正在录音…",
	interrupted: "录音中断，请重试。",
	local: "音频在运行 DSH 的机器上识别。需要下载模型时，请确保该机器能访问所选下载源及其文件服务。如需代理，请在该机器上配置。",
	cloud: "音频将发送至所选云端服务。",
	empty: "未识别到语音",
	cancelled: "已取消语音输入。",
	conflict: "草稿已被修改。识别文字已保留，可在当前光标位置插入。",
	failed: "语音识别失败：{message}",
	unavailable: "当前浏览器不支持录音，请使用支持麦克风的浏览器。",
	permission: "麦克风权限未开启，请在浏览器和系统设置中允许访问。",
	tooLarge: "录音超过服务限制，请缩短录音后重试。"
};
/** English dictionary with the same complete key set. */
const en = {
	dictate: "Dictate",
	"setupPrompt.title": "Set up voice input before recording",
	"setupPrompt.body": "Voice input is enabled. First use requires downloading and preparing local recognition models. Open the plugin details to review disk space, memory and time estimates before starting setup.",
	"setupPrompt.later": "Later",
	"setupPrompt.open": "Go to setup",
	"setupPrompt.trigger": "Open voice input setup",
	"setupPrompt.details": "Open voice plugin settings",
	"setupPrompt.unavailableTitle": "Speech recognition is not ready",
	"setupPrompt.unavailableBody": "Open the voice plugin details to check recognition status, preparation progress, or errors.",
	"setup.local": "Local models will be downloaded to the machine running DSH. No Python or compiler is required.",
	"setup.disk": "Disk space",
	"setup.diskValue": "Allow about {gb} GB for models, runtime, and download caches",
	"setup.memory": "Memory",
	"setup.memoryValue": "About {gb} GB with the model loaded; recognition may use more",
	"setup.time": "First setup",
	"setup.timeValue": "Allow roughly {min}–{max} minutes, depending on the network and machine",
	"setup.estimateNote": "These are estimates; slow networks may take longer. Downloads are reused; idle models release memory by default.",
	"step.check": "Check local resources",
	"step.model": "Prepare recognition model",
	"step.vad": "Prepare voice detection model",
	"step.verify": "Verify model files",
	"step.load": "Load {name}",
	"stepStatus.pending": "Not started",
	"stepStatus.running": "In progress",
	"stepStatus.complete": "Completed",
	"stepStatus.failed": "Failed",
	"stepStatus.cancelled": "Cancelled",
	"short.downloading": "Downloading",
	"short.failed": "Setup failed",
	retryRecording: "Record again",
	preparationSteps: "Preparation steps",
	"prepare": "Download and prepare",
	"retryPrepare": "Retry preparation",
	"cancelPrepare": "Cancel preparation",
	"downloadProgress": "Download progress",
	"downloadBytes": "Download: {completed} / {total} MB, {percent}%",
	"downloadUnknown": "Downloaded {completed} MB",
	"elapsed": "Waiting {seconds} seconds",
	"preparationFailed": "Preparation failed: {message}",
	"download.network": "Cannot download {resource}: connection to the download service failed.",
	"download.dns": "Cannot download {resource}: the download address could not be resolved.",
	"download.timeout": "The download of {resource} timed out.",
	"download.certificate": "Cannot download {resource}: certificate verification failed.",
	"download.http": "Cannot download {resource}: the download service returned HTTP {status}.",
	"download.integrity": "The download of {resource} is incomplete or failed verification.",
	"download.storage": "Cannot save {resource}: insufficient disk space or write permission.",
	"download.unknown": "Could not prepare {resource}.",
	"downloadAdvice.network": "Check that the machine running DSH can reach the download source and its model download services. Configure a proxy on that machine if needed, then retry.",
	"downloadAdvice.dns": "Check DNS and proxy settings on the machine running DSH. Confirm that it can resolve the download source domain, then retry.",
	"downloadAdvice.timeout": "Check the network or proxy connection on the machine running DSH, then retry later. Verified downloaded files are retained.",
	"downloadAdvice.certificate": "Check the system clock, trusted certificates and proxy settings on the machine running DSH, then retry.",
	"downloadAdvice.http": "Confirm that the download address is available and the proxy can reach the download service, or retry later.",
	"downloadAdvice.integrity": "Retry the download. Other completed and verified files are retained.",
	"downloadAdvice.storage": "Check available disk space and write permission for the model directory on the machine running DSH, then retry.",
	"downloadAdvice.unknown": "Check the network, disk space and model directory permissions on the machine running DSH, then retry.",
	downloadSource: "Download source: {source}",
	sourceChoice: "Model download source",
	sourceAuto: "Automatic (recommended)",
	sourceHuggingFace: "Hugging Face",
	sourceMirror: "HF-Mirror (China mirror)",
	sourceAutoHelp: "Prefer the first responding source and try another if a download fails.",
	sourceManualHelp: "Download only from the selected source. Verified downloaded files are reused.",
	downloadCode: "Error code: {code}",
	"reconnecting": "Connecting to speech recognition…",
	"preparation.unprepared": "First use downloads the local recognition models.",
	"preparation.checking": "Checking local resources…",
	"preparation.loading": "Loading {name}…",
	"preparation.waking": "Waking local speech recognition…",
	"preparation.ready": "Local speech recognition is ready.",
	"preparation.standby": "Local resources are prepared. Recording wakes the recognizer.",
	"preparation.cancelled": "Preparation cancelled. Completed downloads are retained.",
	"preparation.cancelling": "Cancelling preparation…",
	cloudReady: "Cloud speech recognition is ready.",
	discard: "Discard transcript",
	transcribingShort: "Transcribing…",
	wakingShort: "Waking…",
	provider: "Recognition service",
	language: "Recognition language",
	inputDevice: "Input device",
	systemMicrophone: "System default",
	systemMicrophoneNamed: "System default ({name})",
	unnamedSelectedMicrophone: "Microphone",
	unnamedMicrophone: "Microphone {number}",
	inputLevel: "Microphone input level",
	deviceUnavailable: "Unavailable",
	deviceMissing: "Microphone unavailable. Choose another input device.",
	auto: "Detect automatically",
	zh: "Chinese",
	en: "English",
	yue: "Cantonese",
	ja: "Japanese",
	es: "Spanish",
	fr: "French",
	de: "German",
	ru: "Russian",
	pt: "Portuguese",
	ko: "Korean",
	start: "Start recording",
	stop: "Stop and transcribe",
	cancel: "Cancel",
	insert: "Insert text",
	loading: "Loading recognition services…",
	requesting: "Allow microphone access to continue…",
	recording: "Recording…",
	interrupted: "Recording was interrupted. Please try again.",
	local: "Audio is recognized on the machine running DSH. If models need downloading, that machine must be able to reach the selected source and its file services. Configure a proxy on that machine if needed.",
	cloud: "Audio will be sent to the selected cloud service.",
	empty: "No speech recognized",
	cancelled: "Voice input cancelled.",
	conflict: "Your draft changed. The transcript is preserved and can be inserted at the current cursor.",
	failed: "Speech recognition failed: {message}",
	unavailable: "This browser cannot record audio. Use a browser with microphone support.",
	permission: "Microphone access is disabled. Allow it in browser and system settings.",
	tooLarge: "The recording exceeds the service limit. Try a shorter recording."
};
/** Japanese copy, checked against the English keys. */
const ja = {
	"dictate": "ディクテーション",
	"setupPrompt.title": "録音前に音声入力を設定してください",
	"setupPrompt.body": "音声入力が有効です。初回利用時はローカル認識モデルのダウンロードと準備が必要です。プラグインの詳細を開き、セットアップを開始する前にディスク容量、メモリ、所要時間の目安を確認してください。",
	"setupPrompt.later": "後で",
	"setupPrompt.open": "セットアップへ",
	"setupPrompt.trigger": "音声入力のセットアップを開く",
	"setupPrompt.details": "音声プラグイン設定を開く",
	"setupPrompt.unavailableTitle": "音声認識の準備ができていません",
	"setupPrompt.unavailableBody": "音声プラグインの詳細を開き、認識状態、準備の進捗、エラーを確認してください。",
	"setup.local": "ローカルモデルはDSHを実行しているマシンにダウンロードされます。Pythonやコンパイラは不要です。",
	"setup.disk": "ディスク容量",
	"setup.diskValue": "モデル、ランタイム、ダウンロードキャッシュに約{gb} GBを確保してください",
	"setup.memory": "メモリ",
	"setup.memoryValue": "モデル読み込み時で約{gb} GB。認識処理ではさらに使用する場合があります",
	"setup.time": "初回セットアップ",
	"setup.timeValue": "ネットワークとマシンに応じて、おおよそ{min}〜{max}分かかります",
	"setup.estimateNote": "これらは目安です。ネットワークが遅い場合はさらに時間がかかることがあります。ダウンロード済みデータは再利用され、アイドル状態のモデルはデフォルトでメモリを解放します。",
	"step.check": "ローカルリソースを確認",
	"step.model": "認識モデルを準備",
	"step.vad": "音声検出モデルを準備",
	"step.verify": "モデルファイルを検証",
	"step.load": "{name}を読み込み",
	"stepStatus.pending": "未開始",
	"stepStatus.running": "進行中",
	"stepStatus.complete": "完了",
	"stepStatus.failed": "失敗",
	"stepStatus.cancelled": "キャンセル済み",
	"short.downloading": "ダウンロード中",
	"short.failed": "セットアップに失敗しました",
	"retryRecording": "もう一度録音",
	"preparationSteps": "準備手順",
	"prepare": "ダウンロードして準備",
	"retryPrepare": "準備を再試行",
	"cancelPrepare": "準備をキャンセル",
	"downloadProgress": "ダウンロード進捗",
	"downloadBytes": "ダウンロード: {completed} / {total} MB、{percent}%",
	"downloadUnknown": "{completed} MBダウンロード済み",
	"elapsed": "{seconds}秒待機中",
	"preparationFailed": "準備に失敗しました: {message}",
	"download.network": "{resource}をダウンロードできません: ダウンロードサービスへの接続に失敗しました。",
	"download.dns": "{resource}をダウンロードできません: ダウンロード先のアドレスを解決できませんでした。",
	"download.timeout": "{resource}のダウンロードがタイムアウトしました。",
	"download.certificate": "{resource}をダウンロードできません: 証明書の検証に失敗しました。",
	"download.http": "{resource}をダウンロードできません: ダウンロードサービスがHTTP {status}を返しました。",
	"download.integrity": "{resource}のダウンロードが不完全か、検証に失敗しました。",
	"download.storage": "{resource}を保存できません: ディスク容量不足または書き込み権限がありません。",
	"download.unknown": "{resource}を準備できませんでした。",
	"downloadAdvice.network": "DSHを実行しているマシンがダウンロード元とそのモデルダウンロードサービスに到達できることを確認してください。必要に応じてそのマシンでプロキシを設定してから再試行してください。",
	"downloadAdvice.dns": "DSHを実行しているマシンのDNSとプロキシ設定を確認してください。ダウンロード元ドメインを解決できることを確認してから再試行してください。",
	"downloadAdvice.timeout": "DSHを実行しているマシンのネットワークまたはプロキシ接続を確認してから、後で再試行してください。検証済みのダウンロード済みファイルは保持されます。",
	"downloadAdvice.certificate": "DSHを実行しているマシンのシステム時計、信頼された証明書、プロキシ設定を確認してから再試行してください。",
	"downloadAdvice.http": "ダウンロード先のアドレスが利用可能で、プロキシがダウンロードサービスに到達できることを確認するか、後で再試行してください。",
	"downloadAdvice.integrity": "ダウンロードを再試行してください。完了かつ検証済みの他のファイルは保持されます。",
	"downloadAdvice.storage": "DSHを実行しているマシンのモデルディレクトリの空き容量と書き込み権限を確認してから再試行してください。",
	"downloadAdvice.unknown": "DSHを実行しているマシンのネットワーク、ディスク容量、モデルディレクトリの権限を確認してから再試行してください。",
	"downloadSource": "ダウンロード元: {source}",
	"sourceChoice": "モデルのダウンロード元",
	"sourceAuto": "自動（推奨）",
	"sourceHuggingFace": "Hugging Face",
	"sourceMirror": "HF-Mirror（中国ミラー）",
	"sourceAutoHelp": "最初に応答したダウンロード元を優先し、ダウンロードに失敗した場合は別のダウンロード元を試します。",
	"sourceManualHelp": "選択したダウンロード元からのみダウンロードします。検証済みのダウンロード済みファイルは再利用されます。",
	"downloadCode": "エラーコード: {code}",
	"reconnecting": "音声認識に接続しています…",
	"preparation.unprepared": "初回利用時にローカル認識モデルをダウンロードします。",
	"preparation.checking": "ローカルリソースを確認しています…",
	"preparation.loading": "{name}を読み込んでいます…",
	"preparation.waking": "ローカル音声認識を起動中…",
	"preparation.ready": "ローカル音声認識の準備ができました。",
	"preparation.standby": "ローカルリソースの準備が完了しました。録音を開始すると認識エンジンが起動します。",
	"preparation.cancelled": "準備をキャンセルしました。完了済みのダウンロードは保持されます。",
	"preparation.cancelling": "準備をキャンセル中…",
	"cloudReady": "クラウド音声認識の準備ができました。",
	"discard": "文字起こしを破棄",
	"transcribingShort": "文字起こし中…",
	"wakingShort": "起動中…",
	"provider": "認識サービス",
	"language": "認識言語",
	"inputDevice": "入力デバイス",
	"systemMicrophone": "システムデフォルト",
	"systemMicrophoneNamed": "システムデフォルト（{name}）",
	"unnamedSelectedMicrophone": "マイク",
	"unnamedMicrophone": "マイク {number}",
	"inputLevel": "マイク入力レベル",
	"deviceUnavailable": "利用不可",
	"deviceMissing": "マイクを利用できません。別の入力デバイスを選択してください。",
	"auto": "自動検出",
	"zh": "中国語",
	"en": "英語",
	"yue": "広東語",
	"ja": "日本語",
	es: "スペイン語",
	fr: "フランス語",
	de: "ドイツ語",
	ru: "ロシア語",
	pt: "ポルトガル語",
	"ko": "韓国語",
	"start": "録音を開始",
	"stop": "停止して文字起こし",
	"cancel": "キャンセル",
	"insert": "テキストを挿入",
	"loading": "認識サービスを読み込み中…",
	"requesting": "続行するにはマイクへのアクセスを許可してください…",
	"recording": "録音中…",
	"interrupted": "録音が中断されました。もう一度お試しください。",
	"local": "音声はDSHを実行しているマシン上で認識されます。モデルのダウンロードが必要な場合、そのマシンは選択したソースとそのファイルサービスに接続できる必要があります。必要に応じてそのマシンでプロキシを設定してください。",
	"cloud": "音声は選択したクラウドサービスに送信されます。",
	"empty": "音声が認識されませんでした",
	"cancelled": "音声入力をキャンセルしました。",
	"conflict": "下書きが変更されました。文字起こしは保持されており、現在のカーソル位置に挿入できます。",
	"failed": "音声認識に失敗しました: {message}",
	"unavailable": "このブラウザは音声を録音できません。マイクに対応したブラウザを使用してください。",
	"permission": "マイクへのアクセスが無効になっています。ブラウザとシステムの設定で許可してください。",
	"tooLarge": "録音がサービスの上限を超えています。短い録音をお試しください。"
};
/** Spanish dictionary, checked against the English keys. */
const es = {
	dictate: "Dictar",
	"setupPrompt.title": "Configurar la entrada de voz antes de grabar",
	"setupPrompt.body": "La entrada de voz está habilitada. El primer uso requiere descargar y preparar modelos de reconocimiento local. Abra los detalles del complemento para revisar las estimaciones de espacio en disco, memoria y tiempo antes de comenzar la configuración.",
	"setupPrompt.later": "Más tarde",
	"setupPrompt.open": "Ir a configuración",
	"setupPrompt.trigger": "Abrir configuración de entrada de voz",
	"setupPrompt.details": "Abrir la configuración del complemento de voz",
	"setupPrompt.unavailableTitle": "El reconocimiento de voz no está listo",
	"setupPrompt.unavailableBody": "Abra los detalles del complemento de voz para verificar el estado del reconocimiento, el progreso de la preparación o los errores.",
	"setup.local": "Los modelos locales se descargarán en la máquina que ejecuta DSH. No se requiere Python ni compilador.",
	"setup.disk": "Espacio en disco",
	"setup.diskValue": "Permitir aproximadamente {gb} GB para modelos, tiempo de ejecución y cachés de descarga",
	"setup.memory": "Memoria",
	"setup.memoryValue": "Aproximadamente {gb} GB con el modelo cargado; el reconocimiento puede utilizar más",
	"setup.time": "Primera configuración",
	"setup.timeValue": "Espere aproximadamente {min}–{max} minutos, dependiendo de la red y la máquina",
	"setup.estimateNote": "Éstas son estimaciones; las redes lentas pueden tardar más. Las descargas se reutilizan; Los modelos inactivos liberan memoria de forma predeterminada.",
	"step.check": "Consulta los recursos locales",
	"step.model": "Preparar modelo de reconocimiento.",
	"step.vad": "Preparar modelo de detección de voz.",
	"step.verify": "Verificar archivos de modelo",
	"step.load": "Cargar {name}",
	"stepStatus.pending": "No iniciado",
	"stepStatus.running": "En progreso",
	"stepStatus.complete": "Completado",
	"stepStatus.failed": "Fallido",
	"stepStatus.cancelled": "Cancelado",
	"short.downloading": "Descargando",
	"short.failed": "Error de configuración",
	retryRecording: "Grabar de nuevo",
	preparationSteps: "Pasos de preparación",
	"prepare": "Descargar y preparar",
	"retryPrepare": "Reintentar la preparación",
	"cancelPrepare": "Cancelar preparación",
	"downloadProgress": "Descargar progreso",
	"downloadBytes": "Descargar: {completed} / {total} MB, {percent}%",
	"downloadUnknown": "Descargado {completed} MB",
	"elapsed": "Esperando {seconds} segundos",
	"preparationFailed": "Error de preparación: {message}",
	"download.network": "No se puede descargar {resource}: falló la conexión al servicio de descarga.",
	"download.dns": "No se puede descargar {resource}: no se pudo resolver la dirección de descarga.",
	"download.timeout": "Se agotó el tiempo de descarga de {resource}.",
	"download.certificate": "No se puede descargar {resource}: falló la verificación del certificado.",
	"download.http": "No se puede descargar {resource}: el servicio de descarga devolvió HTTP {status}.",
	"download.integrity": "La descarga de {resource} está incompleta o falló la verificación.",
	"download.storage": "No se puede guardar {resource}: espacio en disco insuficiente o permiso de escritura.",
	"download.unknown": "No se pudo preparar {resource}.",
	"downloadAdvice.network": "Verifique que la máquina que ejecuta DSH pueda acceder a la fuente de descarga y sus servicios de descarga de modelos. Configure un proxy en esa máquina si es necesario y luego vuelva a intentarlo.",
	"downloadAdvice.dns": "Verifique la configuración de DNS y proxy en la máquina que ejecuta DSH. Confirme que puede resolver el dominio de origen de la descarga y luego vuelva a intentarlo.",
	"downloadAdvice.timeout": "Verifique la conexión de red o proxy en la máquina que ejecuta DSH y vuelva a intentarlo más tarde. Los archivos descargados verificados se conservan.",
	"downloadAdvice.certificate": "Verifique el reloj del sistema, los certificados confiables y la configuración del proxy en la máquina que ejecuta DSH, luego vuelva a intentarlo.",
	"downloadAdvice.http": "Confirme que la dirección de descarga esté disponible y que el proxy pueda comunicarse con el servicio de descarga, o vuelva a intentarlo más tarde.",
	"downloadAdvice.integrity": "Vuelva a intentar la descarga. Se conservan otros archivos completos y verificados.",
	"downloadAdvice.storage": "Verifique el espacio disponible en disco y el permiso de escritura para el directorio del modelo en la máquina que ejecuta DSH, luego vuelva a intentarlo.",
	"downloadAdvice.unknown": "Verifique los permisos de red, espacio en disco y directorio de modelos en la máquina que ejecuta DSH, luego vuelva a intentarlo.",
	downloadSource: "Fuente de descarga: {source}",
	sourceChoice: "Fuente de descarga del modelo",
	sourceAuto: "Automático (recomendado)",
	sourceHuggingFace: "abrazando la cara",
	sourceMirror: "Espejo HF (espejo chino)",
	sourceAutoHelp: "Prefiere la primera fuente que respondió y prueba con otra si falla la descarga.",
	sourceManualHelp: "Descargue solo desde la fuente seleccionada. Los archivos descargados verificados se reutilizan.",
	downloadCode: "Código de error: {code}",
	"reconnecting": "Conectándose al reconocimiento de voz...",
	"preparation.unprepared": "El primer uso descarga los modelos de reconocimiento local.",
	"preparation.checking": "Comprobando los recursos locales...",
	"preparation.loading": "Cargando {name}…",
	"preparation.waking": "Activando el reconocimiento de voz local...",
	"preparation.ready": "El reconocimiento de voz local está listo.",
	"preparation.standby": "Los recursos locales están preparados. La grabación despierta el reconocedor.",
	"preparation.cancelled": "Preparación cancelada. Las descargas completadas se conservan.",
	"preparation.cancelling": "Cancelando preparación…",
	cloudReady: "El reconocimiento de voz en la nube está listo.",
	discard: "Descartar transcripción",
	transcribingShort: "Transcribiendo…",
	wakingShort: "Despertando…",
	provider: "Servicio de reconocimiento",
	language: "Idioma de reconocimiento",
	inputDevice: "Dispositivo de entrada",
	systemMicrophone: "Valor predeterminado del sistema",
	systemMicrophoneNamed: "Valor predeterminado del sistema ({name})",
	unnamedSelectedMicrophone: "micrófono",
	unnamedMicrophone: "Micrófono {number}",
	inputLevel: "Nivel de entrada del micrófono",
	deviceUnavailable: "No disponible",
	deviceMissing: "Micrófono no disponible. Elija otro dispositivo de entrada.",
	auto: "Detectar automáticamente",
	zh: "chino",
	en: "ingles",
	yue: "cantonés",
	ja: "japonés",
	es: "español",
	fr: "francés",
	de: "alemán",
	ru: "ruso",
	pt: "portugués",
	ko: "coreano",
	start: "Empezar a grabar",
	stop: "Detener y transcribir",
	cancel: "Cancelar",
	insert: "Insertar texto",
	loading: "Cargando servicios de reconocimiento…",
	requesting: "Permitir el acceso al micrófono para continuar...",
	recording: "Grabando…",
	interrupted: "La grabación fue interrumpida. Por favor inténtalo de nuevo.",
	local: "El audio se reconoce en la máquina que ejecuta DSH. Si es necesario descargar modelos, esa máquina debe poder acceder a la fuente seleccionada y sus servicios de archivos. Configure un proxy en esa máquina si es necesario.",
	cloud: "El audio se enviará al servicio en la nube seleccionado.",
	empty: "No se reconoce ningún discurso",
	cancelled: "Entrada de voz cancelada.",
	conflict: "Tu borrador cambió. La transcripción se conserva y se puede insertar en el cursor actual.",
	failed: "Error en el reconocimiento de voz: {message}",
	unavailable: "Este navegador no puede grabar audio. Utilice un navegador compatible con micrófono.",
	permission: "El acceso al micrófono está deshabilitado. Permitirlo en la configuración del navegador y del sistema.",
	tooLarge: "La grabación excede el límite del servicio. Pruebe con una grabación más corta."
};
/** French dictionary, checked against the English keys. */
const fr = {
	dictate: "Dicter",
	"setupPrompt.title": "Configurer la saisie vocale avant l'enregistrement",
	"setupPrompt.body": "La saisie vocale est activée. La première utilisation nécessite le téléchargement et la préparation de modèles de reconnaissance locaux. Ouvrez les détails du plugin pour consulter les estimations d'espace disque, de mémoire et de temps avant de démarrer l'installation.",
	"setupPrompt.later": "Plus tard",
	"setupPrompt.open": "Aller à la configuration",
	"setupPrompt.trigger": "Ouvrir la configuration de la saisie vocale",
	"setupPrompt.details": "Ouvrir les paramètres du plugin vocal",
	"setupPrompt.unavailableTitle": "La reconnaissance vocale n'est pas prête",
	"setupPrompt.unavailableBody": "Ouvrez les détails du plug-in vocal pour vérifier l'état de reconnaissance, la progression de la préparation ou les erreurs.",
	"setup.local": "Les modèles locaux seront téléchargés sur la machine exécutant DSH. Aucun Python ou compilateur n'est requis.",
	"setup.disk": "Espace disque",
	"setup.diskValue": "Autoriser environ {gb}\xA0Go pour les modèles, l'environnement d'exécution et les caches de téléchargement",
	"setup.memory": "Mémoire",
	"setup.memoryValue": "À propos de {gb} GB avec le modèle chargé\xA0; la reconnaissance peut utiliser plus",
	"setup.time": "Première configuration",
	"setup.timeValue": "Prévoyez environ des minutes {min} à {max}, en fonction du réseau et de la machine.",
	"setup.estimateNote": "Ce sont des estimations\xA0; les réseaux lents peuvent prendre plus de temps. Les téléchargements sont réutilisés\xA0; les modèles inactifs libèrent de la mémoire par défaut.",
	"step.check": "Vérifiez les ressources locales",
	"step.model": "Préparer le modèle de reconnaissance",
	"step.vad": "Préparer le modèle de détection vocale",
	"step.verify": "Vérifier les fichiers de modèle",
	"step.load": "Charger {name}",
	"stepStatus.pending": "Pas démarré",
	"stepStatus.running": "En cours",
	"stepStatus.complete": "Terminé",
	"stepStatus.failed": "Échec",
	"stepStatus.cancelled": "Annulé",
	"short.downloading": "Téléchargement",
	"short.failed": "Échec de l'installation",
	retryRecording: "Enregistrer à nouveau",
	preparationSteps: "Étapes de préparation",
	"prepare": "Téléchargez et préparez",
	"retryPrepare": "Réessayer la préparation",
	"cancelPrepare": "Annuler la préparation",
	"downloadProgress": "Progression du téléchargement",
	"downloadBytes": "Télécharger : {completed} / {total} MB, {percent}%",
	"downloadUnknown": "Téléchargé {completed} MB",
	"elapsed": "En attente de {seconds} secondes",
	"preparationFailed": "Échec de la préparation\xA0: {message}",
	"download.network": "Impossible de télécharger {resource}\xA0: la connexion au service de téléchargement a échoué.",
	"download.dns": "Impossible de télécharger {resource}\xA0: l'adresse de téléchargement n'a pas pu être résolue.",
	"download.timeout": "Le téléchargement de {resource} a expiré.",
	"download.certificate": "Impossible de télécharger {resource}\xA0: la vérification du certificat a échoué.",
	"download.http": "Impossible de télécharger {resource}\xA0: le service de téléchargement a renvoyé HTTP {status}.",
	"download.integrity": "Le téléchargement de {resource} est incomplet ou la vérification a échoué.",
	"download.storage": "Impossible d'enregistrer {resource}\xA0: espace disque ou autorisation d'écriture insuffisante.",
	"download.unknown": "Impossible de préparer {resource}.",
	"downloadAdvice.network": "Vérifiez que la machine exécutant DSH peut accéder à la source de téléchargement et à ses services de téléchargement de modèles. Configurez un proxy sur cette machine si nécessaire, puis réessayez.",
	"downloadAdvice.dns": "Vérifiez les paramètres DNS et proxy sur la machine exécutant DSH. Confirmez qu'il peut résoudre le domaine source de téléchargement, puis réessayez.",
	"downloadAdvice.timeout": "Vérifiez la connexion réseau ou proxy sur la machine exécutant DSH, puis réessayez plus tard. Les fichiers téléchargés vérifiés sont conservés.",
	"downloadAdvice.certificate": "Vérifiez l'horloge système, les certificats de confiance et les paramètres de proxy sur la machine exécutant DSH, puis réessayez.",
	"downloadAdvice.http": "Confirmez que l'adresse de téléchargement est disponible et que le proxy peut accéder au service de téléchargement, ou réessayez plus tard.",
	"downloadAdvice.integrity": "Réessayez le téléchargement. Les autres dossiers complétés et vérifiés sont conservés.",
	"downloadAdvice.storage": "Vérifiez l'espace disque disponible et les autorisations d'écriture pour le répertoire modèle sur la machine exécutant DSH, puis réessayez.",
	"downloadAdvice.unknown": "Vérifiez les autorisations du réseau, de l'espace disque et du répertoire modèle sur la machine exécutant DSH, puis réessayez.",
	downloadSource: "Source du téléchargement\xA0: {source}",
	sourceChoice: "Source de téléchargement du modèle",
	sourceAuto: "Automatique (recommandé)",
	sourceHuggingFace: "Visage câlin",
	sourceMirror: "Miroir HF (miroir chinois)",
	sourceAutoHelp: "Préférez la première source qui répond et essayez-en une autre si un téléchargement échoue.",
	sourceManualHelp: "Téléchargez uniquement à partir de la source sélectionnée. Les fichiers téléchargés vérifiés sont réutilisés.",
	downloadCode: "Code d'erreur\xA0: {code}",
	"reconnecting": "Connexion à la reconnaissance vocale…",
	"preparation.unprepared": "La première utilisation télécharge les modèles de reconnaissance locaux.",
	"preparation.checking": "Vérification des ressources locales…",
	"preparation.loading": "Chargement de {name}…",
	"preparation.waking": "Réveiller la reconnaissance vocale locale…",
	"preparation.ready": "La reconnaissance vocale locale est prête.",
	"preparation.standby": "Des ressources locales sont préparées. L'enregistrement réveille le module de reconnaissance.",
	"preparation.cancelled": "Préparation annulée. Les téléchargements terminés sont conservés.",
	"preparation.cancelling": "Annulation de la préparation…",
	cloudReady: "La reconnaissance vocale dans le cloud est prête.",
	discard: "Supprimer la transcription",
	transcribingShort: "Transcription…",
	wakingShort: "Le réveil…",
	provider: "Service de reconnaissance",
	language: "Langue de reconnaissance",
	inputDevice: "Périphérique d'entrée",
	systemMicrophone: "Valeur par défaut du système",
	systemMicrophoneNamed: "Valeur par défaut du système ({name})",
	unnamedSelectedMicrophone: "Micro",
	unnamedMicrophone: "Micro {number}",
	inputLevel: "Niveau d'entrée du microphone",
	deviceUnavailable: "Indisponible",
	deviceMissing: "Micro indisponible. Choisissez un autre périphérique d'entrée.",
	auto: "Détecter automatiquement",
	zh: "Chinois",
	en: "Anglais",
	yue: "Cantonais",
	ja: "Japonais",
	es: "Espagnol",
	fr: "Français",
	de: "Allemand",
	ru: "Russe",
	pt: "Portugais",
	ko: "Coréen",
	start: "Commencer l'enregistrement",
	stop: "Arrêtez et transcrivez",
	cancel: "Annuler",
	insert: "Insérer du texte",
	loading: "Chargement des services de reconnaissance…",
	requesting: "Autoriser l’accès au microphone pour continuer…",
	recording: "Enregistrement…",
	interrupted: "L'enregistrement a été interrompu. Veuillez réessayer.",
	local: "L'audio est reconnu sur la machine exécutant DSH. Si les modèles doivent être téléchargés, cette machine doit pouvoir accéder à la source sélectionnée et à ses services de fichiers. Configurez un proxy sur cette machine si nécessaire.",
	cloud: "L'audio sera envoyé au service cloud sélectionné.",
	empty: "Aucun discours reconnu",
	cancelled: "Saisie vocale annulée.",
	conflict: "Votre brouillon a changé. La transcription est conservée et peut être insérée au niveau du curseur actuel.",
	failed: "Échec de la reconnaissance vocale\xA0: {message}",
	unavailable: "Ce navigateur ne peut pas enregistrer de son. Utilisez un navigateur prenant en charge le microphone.",
	permission: "L'accès au microphone est désactivé. Autorisez-le dans les paramètres du navigateur et du système.",
	tooLarge: "L'enregistrement dépasse la limite du service. Essayez un enregistrement plus court."
};
/** German dictionary, checked against the English keys. */
const de = {
	dictate: "Diktieren",
	"setupPrompt.title": "Richten Sie vor der Aufnahme die Spracheingabe ein",
	"setupPrompt.body": "Die Spracheingabe ist aktiviert. Für die erste Verwendung müssen lokale Erkennungsmodelle heruntergeladen und vorbereitet werden. Öffnen Sie die Plugin-Details, um die Schätzungen zu Speicherplatz, Speicher und Zeit zu überprüfen, bevor Sie mit der Einrichtung beginnen.",
	"setupPrompt.later": "Später",
	"setupPrompt.open": "Gehen Sie zum Setup",
	"setupPrompt.trigger": "Öffnen Sie die Einrichtung der Spracheingabe",
	"setupPrompt.details": "Öffnen Sie die Sprach-Plugin-Einstellungen",
	"setupPrompt.unavailableTitle": "Die Spracherkennung ist noch nicht bereit",
	"setupPrompt.unavailableBody": "Öffnen Sie die Details des Sprach-Plugins, um den Erkennungsstatus, den Vorbereitungsfortschritt oder Fehler zu überprüfen.",
	"setup.local": "Lokale Modelle werden auf den Computer heruntergeladen, auf dem DSH ausgeführt wird. Es ist kein Python oder Compiler erforderlich.",
	"setup.disk": "Speicherplatz",
	"setup.diskValue": "Planen Sie etwa {gb} GB für Modelle, Laufzeit und Download-Caches ein",
	"setup.memory": "Erinnerung",
	"setup.memoryValue": "Über {gb} GB mit geladenem Modell; Anerkennung kann mehr gebrauchen",
	"setup.time": "Erste Einrichtung",
	"setup.timeValue": "Planen Sie je nach Netzwerk und Maschine etwa {min}–{max} Minuten ein",
	"setup.estimateNote": "Es handelt sich hierbei um Schätzungen; Bei langsamen Netzwerken kann es länger dauern. Downloads werden wiederverwendet; Leerlaufmodelle geben standardmäßig Speicher frei.",
	"step.check": "Überprüfen Sie lokale Ressourcen",
	"step.model": "Erkennungsmodell vorbereiten",
	"step.vad": "Bereiten Sie ein Spracherkennungsmodell vor",
	"step.verify": "Modelldateien überprüfen",
	"step.load": "Laden Sie {name}",
	"stepStatus.pending": "Nicht gestartet",
	"stepStatus.running": "In Bearbeitung",
	"stepStatus.complete": "Abgeschlossen",
	"stepStatus.failed": "Fehlgeschlagen",
	"stepStatus.cancelled": "Abgesagt",
	"short.downloading": "Herunterladen",
	"short.failed": "Die Einrichtung ist fehlgeschlagen",
	retryRecording: "Nochmals aufnehmen",
	preparationSteps: "Vorbereitungsschritte",
	"prepare": "Herunterladen und vorbereiten",
	"retryPrepare": "Wiederholen Sie die Vorbereitung",
	"cancelPrepare": "Vorbereitung abbrechen",
	"downloadProgress": "Download-Fortschritt",
	"downloadBytes": "Herunterladen: {completed} / {total} MB, {percent}%",
	"downloadUnknown": "{completed} MB heruntergeladen",
	"elapsed": "Warten {seconds} Sekunden",
	"preparationFailed": "Vorbereitung fehlgeschlagen: {message}",
	"download.network": "{resource} kann nicht heruntergeladen werden: Die Verbindung zum Download-Dienst ist fehlgeschlagen.",
	"download.dns": "{resource} kann nicht heruntergeladen werden: Die Download-Adresse konnte nicht aufgelöst werden.",
	"download.timeout": "Beim Herunterladen von {resource} ist eine Zeitüberschreitung aufgetreten.",
	"download.certificate": "{resource} kann nicht heruntergeladen werden: Zertifikatüberprüfung fehlgeschlagen.",
	"download.http": "{resource} kann nicht heruntergeladen werden: Der Download-Dienst hat HTTP {status} zurückgegeben.",
	"download.integrity": "Der Download von {resource} ist unvollständig oder die Überprüfung ist fehlgeschlagen.",
	"download.storage": "{resource} kann nicht gespeichert werden: nicht genügend Speicherplatz oder Schreibberechtigung.",
	"download.unknown": "{resource} konnte nicht vorbereitet werden.",
	"downloadAdvice.network": "Überprüfen Sie, ob der Computer, auf dem DSH ausgeführt wird, die Download-Quelle und ihre Modell-Download-Dienste erreichen kann. Konfigurieren Sie bei Bedarf einen Proxy auf diesem Computer und versuchen Sie es dann erneut.",
	"downloadAdvice.dns": "Überprüfen Sie die DNS- und Proxy-Einstellungen auf dem Computer, auf dem DSH ausgeführt wird. Bestätigen Sie, dass die Download-Quelldomäne aufgelöst werden kann, und versuchen Sie es dann erneut.",
	"downloadAdvice.timeout": "Überprüfen Sie die Netzwerk- oder Proxy-Verbindung auf dem Computer, auf dem DSH ausgeführt wird, und versuchen Sie es später erneut. Verifizierte heruntergeladene Dateien bleiben erhalten.",
	"downloadAdvice.certificate": "Überprüfen Sie die Systemuhr, vertrauenswürdige Zertifikate und Proxy-Einstellungen auf dem Computer, auf dem DSH ausgeführt wird, und versuchen Sie es dann erneut.",
	"downloadAdvice.http": "Bestätigen Sie, dass die Download-Adresse verfügbar ist und der Proxy den Download-Dienst erreichen kann, oder versuchen Sie es später noch einmal.",
	"downloadAdvice.integrity": "Versuchen Sie den Download erneut. Andere abgeschlossene und überprüfte Dateien bleiben erhalten.",
	"downloadAdvice.storage": "Überprüfen Sie den verfügbaren Speicherplatz und die Schreibberechtigung für das Modellverzeichnis auf dem Computer, auf dem DSH ausgeführt wird, und versuchen Sie es dann erneut.",
	"downloadAdvice.unknown": "Überprüfen Sie die Netzwerk-, Festplattenspeicher- und Modellverzeichnisberechtigungen auf dem Computer, auf dem DSH ausgeführt wird, und versuchen Sie es dann erneut.",
	downloadSource: "Download-Quelle: {source}",
	sourceChoice: "Modell-Downloadquelle",
	sourceAuto: "Automatisch (empfohlen)",
	sourceHuggingFace: "Umarmendes Gesicht",
	sourceMirror: "HF-Spiegel (China-Spiegel)",
	sourceAutoHelp: "Bevorzugen Sie die erste antwortende Quelle und versuchen Sie es mit einer anderen, wenn ein Download fehlschlägt.",
	sourceManualHelp: "Nur von der ausgewählten Quelle herunterladen. Verifizierte heruntergeladene Dateien werden wiederverwendet.",
	downloadCode: "Fehlercode: {code}",
	"reconnecting": "Verbindung zur Spracherkennung herstellen…",
	"preparation.unprepared": "Bei der ersten Verwendung werden die lokalen Erkennungsmodelle heruntergeladen.",
	"preparation.checking": "Lokale Ressourcen prüfen…",
	"preparation.loading": "Laden {name}…",
	"preparation.waking": "Lokale Spracherkennung aktivieren…",
	"preparation.ready": "Die lokale Spracherkennung ist bereit.",
	"preparation.standby": "Lokale Ressourcen werden vorbereitet. Durch die Aufnahme wird der Erkenner aktiviert.",
	"preparation.cancelled": "Vorbereitung abgebrochen. Abgeschlossene Downloads bleiben erhalten.",
	"preparation.cancelling": "Vorbereitung abbrechen…",
	cloudReady: "Die Cloud-Spracherkennung ist fertig.",
	discard: "Transkript verwerfen",
	transcribingShort: "Transkribieren…",
	wakingShort: "Aufwachen…",
	provider: "Anerkennungsdienst",
	language: "Erkennungssprache",
	inputDevice: "Eingabegerät",
	systemMicrophone: "Systemstandard",
	systemMicrophoneNamed: "Systemstandard ({name})",
	unnamedSelectedMicrophone: "Mikrofon",
	unnamedMicrophone: "Mikrofon {number}",
	inputLevel: "Mikrofoneingangspegel",
	deviceUnavailable: "Nicht verfügbar",
	deviceMissing: "Mikrofon nicht verfügbar. Wählen Sie ein anderes Eingabegerät.",
	auto: "Automatisch erkennen",
	zh: "Chinesisch",
	en: "Englisch",
	yue: "Kantonesisch",
	ja: "Japanisch",
	es: "Spanisch",
	fr: "Französisch",
	de: "Deutsch",
	ru: "Russisch",
	pt: "Portugiesisch",
	ko: "Koreanisch",
	start: "Starten Sie die Aufnahme",
	stop: "Stoppen Sie und transkribieren Sie",
	cancel: "Abbrechen",
	insert: "Text einfügen",
	loading: "Erkennungsdienste werden geladen…",
	requesting: "Mikrofonzugriff erlauben, um fortzufahren…",
	recording: "Aufnahme…",
	interrupted: "Die Aufnahme wurde unterbrochen. Bitte versuchen Sie es erneut.",
	local: "Audio wird auf dem Computer erkannt, auf dem DSH ausgeführt wird. Wenn Modelle heruntergeladen werden müssen, muss dieser Computer in der Lage sein, die ausgewählte Quelle und ihre Dateidienste zu erreichen. Konfigurieren Sie bei Bedarf einen Proxy auf diesem Computer.",
	cloud: "Audio wird an den ausgewählten Cloud-Dienst gesendet.",
	empty: "Keine Sprache erkannt",
	cancelled: "Spracheingabe abgebrochen.",
	conflict: "Ihr Entwurf wurde geändert. Das Transkript bleibt erhalten und kann am aktuellen Cursor eingefügt werden.",
	failed: "Spracherkennung fehlgeschlagen: {message}",
	unavailable: "Dieser Browser kann keine Audiodaten aufzeichnen. Verwenden Sie einen Browser mit Mikrofonunterstützung.",
	permission: "Der Mikrofonzugriff ist deaktiviert. Erlauben Sie es in den Browser- und Systemeinstellungen.",
	tooLarge: "Die Aufnahme überschreitet das Dienstlimit. Versuchen Sie es mit einer kürzeren Aufnahme."
};
/** Russian dictionary, checked against the English keys. */
const ru = {
	dictate: "Диктовать",
	"setupPrompt.title": "Настройте голосовой ввод перед записью",
	"setupPrompt.body": "Голосовой ввод включен. Для первого использования требуется загрузка и подготовка моделей локального распознавания. Откройте сведения о плагине, чтобы просмотреть оценки дискового пространства, памяти и времени перед началом установки.",
	"setupPrompt.later": "Позже",
	"setupPrompt.open": "Перейти к настройке",
	"setupPrompt.trigger": "Открыть настройку голосового ввода",
	"setupPrompt.details": "Открыть настройки голосового плагина",
	"setupPrompt.unavailableTitle": "Распознавание речи не готово",
	"setupPrompt.unavailableBody": "Откройте сведения о голосовом плагине, чтобы проверить статус распознавания, ход подготовки или наличие ошибок.",
	"setup.local": "Локальные модели будут загружены на машину под управлением DSH. Никакой Python или компилятор не требуется.",
	"setup.disk": "Дисковое пространство",
	"setup.diskValue": "Разрешить около {gb} ГБ для моделей, среды выполнения и кешей загрузки.",
	"setup.memory": "Память",
	"setup.memoryValue": "О {gb} ГБ с загруженной моделью; признание может использовать больше",
	"setup.time": "Первая настройка",
	"setup.timeValue": "Разрешите примерно {min}–{max} минут, в зависимости от сети и машины.",
	"setup.estimateNote": "Это оценки; медленные сети могут занять больше времени. Загрузки используются повторно; Неработающие модели освобождают память по умолчанию.",
	"step.check": "Проверьте местные ресурсы",
	"step.model": "Подготовьте модель распознавания",
	"step.vad": "Подготовьте модель обнаружения голоса",
	"step.verify": "Проверка файлов модели",
	"step.load": "Загрузить {name}",
	"stepStatus.pending": "Не запущено",
	"stepStatus.running": "В процессе",
	"stepStatus.complete": "Завершено",
	"stepStatus.failed": "Не удалось",
	"stepStatus.cancelled": "Отменено",
	"short.downloading": "Загрузка",
	"short.failed": "Установка не удалась",
	retryRecording: "Записать еще раз",
	preparationSteps: "Этапы подготовки",
	"prepare": "Скачайте и подготовьте",
	"retryPrepare": "Повторить подготовку",
	"cancelPrepare": "Отменить подготовку",
	"downloadProgress": "Прогресс загрузки",
	"downloadBytes": "Скачать: {completed} / {total} MB, {percent}%",
	"downloadUnknown": "Скачал {completed} МБ.",
	"elapsed": "Ожидание {seconds} секунд.",
	"preparationFailed": "Подготовка не удалась: {message}",
	"download.network": "Невозможно загрузить {resource}: не удалось подключиться к службе загрузки.",
	"download.dns": "Невозможно загрузить {resource}: не удалось определить адрес загрузки.",
	"download.timeout": "Время загрузки {resource} истекло.",
	"download.certificate": "Невозможно загрузить {resource}: проверка сертификата не удалась.",
	"download.http": "Невозможно загрузить {resource}: служба загрузки вернула HTTP {status}.",
	"download.integrity": "Загрузка {resource} является неполной или не прошла проверку.",
	"download.storage": "Невозможно сохранить {resource}: недостаточно места на диске или разрешения на запись.",
	"download.unknown": "Не удалось подготовить {resource}.",
	"downloadAdvice.network": "Убедитесь, что машина, на которой работает DSH, может получить доступ к источнику загрузки и службам загрузки своей модели. При необходимости настройте прокси-сервер на этом компьютере, а затем повторите попытку.",
	"downloadAdvice.dns": "Проверьте настройки DNS и прокси на машине под управлением DSH. Убедитесь, что он может разрешить домен источника загрузки, затем повторите попытку.",
	"downloadAdvice.timeout": "Проверьте сетевое или прокси-соединение на компьютере, на котором работает DSH, затем повторите попытку позже. Проверенные загруженные файлы сохраняются.",
	"downloadAdvice.certificate": "Проверьте системные часы, доверенные сертификаты и настройки прокси-сервера на компьютере, на котором работает DSH, затем повторите попытку.",
	"downloadAdvice.http": "Убедитесь, что адрес загрузки доступен и прокси-сервер может связаться со службой загрузки, или повторите попытку позже.",
	"downloadAdvice.integrity": "Повторите загрузку. Остальные заполненные и проверенные файлы сохраняются.",
	"downloadAdvice.storage": "Проверьте доступное дисковое пространство и разрешение на запись для каталога модели на компьютере, на котором работает DSH, затем повторите попытку.",
	"downloadAdvice.unknown": "Проверьте сеть, дисковое пространство и права доступа к каталогу модели на компьютере, на котором работает DSH, затем повторите попытку.",
	downloadSource: "Источник загрузки: {source}",
	sourceChoice: "Источник загрузки модели",
	sourceAuto: "Автоматический (рекомендуется)",
	sourceHuggingFace: "Обнимающее лицо",
	sourceMirror: "ВЧ-Зеркало (Китайское зеркало)",
	sourceAutoHelp: "Отдайте предпочтение первому ответившему источнику и попробуйте другой, если загрузка не удалась.",
	sourceManualHelp: "Скачивайте только из выбранного источника. Проверенные загруженные файлы используются повторно.",
	downloadCode: "Код ошибки: {code}",
	"reconnecting": "Подключение к распознаванию речи…",
	"preparation.unprepared": "При первом использовании загружаются модели локального распознавания.",
	"preparation.checking": "Проверка местных ресурсов…",
	"preparation.loading": "Загрузка {name}…",
	"preparation.waking": "Пробуждение локального распознавания речи…",
	"preparation.ready": "Локальное распознавание речи готово.",
	"preparation.standby": "Подготовлены местные ресурсы. Запись будит распознаватель.",
	"preparation.cancelled": "Подготовка отменена. Завершенные загрузки сохраняются.",
	"preparation.cancelling": "Отмена подготовки…",
	cloudReady: "Облачное распознавание речи готово.",
	discard: "Удалить расшифровку",
	transcribingShort: "Расшифровка…",
	wakingShort: "Пробуждение…",
	provider: "Служба распознавания",
	language: "Язык распознавания",
	inputDevice: "Устройство ввода",
	systemMicrophone: "Система по умолчанию",
	systemMicrophoneNamed: "Системное значение по умолчанию ({name})",
	unnamedSelectedMicrophone: "Микрофон",
	unnamedMicrophone: "Микрофон {number}",
	inputLevel: "Входной уровень микрофона",
	deviceUnavailable: "Недоступно",
	deviceMissing: "Микрофон недоступен. Выберите другое устройство ввода.",
	auto: "Обнаруживать автоматически",
	zh: "китайский",
	en: "английский",
	yue: "Кантонский диалект",
	ja: "японский",
	es: "испанский",
	fr: "французский",
	de: "немецкий",
	ru: "русский",
	pt: "португальский",
	ko: "корейский",
	start: "Начать запись",
	stop: "Остановись и перепиши",
	cancel: "Отмена",
	insert: "Вставить текст",
	loading: "Загрузка служб распознавания…",
	requesting: "Разрешите доступ к микрофону, чтобы продолжить…",
	recording: "Запись…",
	interrupted: "Запись была прервана. Пожалуйста, попробуйте еще раз.",
	local: "Звук распознается на машине под управлением DSH. Если модели необходимо загрузить, этот компьютер должен иметь доступ к выбранному источнику и его файловым службам. При необходимости настройте прокси-сервер на этом компьютере.",
	cloud: "Аудио будет отправлено в выбранный облачный сервис.",
	empty: "Речь не распознается",
	cancelled: "Голосовой ввод отменен.",
	conflict: "Ваш черновик изменился. Транскрипт сохраняется и может быть вставлен под текущий курсор.",
	failed: "Не удалось распознать речь: {message}.",
	unavailable: "Этот браузер не может записывать звук. Используйте браузер с поддержкой микрофона.",
	permission: "Доступ к микрофону отключен. Разрешите это в настройках браузера и системы.",
	tooLarge: "Запись превышает лимит обслуживания. Попробуйте более короткую запись."
};
/** Portuguese dictionary, checked against the English keys. */
const pt = {
	dictate: "Ditar",
	"setupPrompt.title": "Configure a entrada de voz antes de gravar",
	"setupPrompt.body": "A entrada de voz está habilitada. A primeira utilização requer o download e a preparação de modelos de reconhecimento local. Abra os detalhes do plug-in para revisar as estimativas de espaço em disco, memória e tempo antes de iniciar a configuração.",
	"setupPrompt.later": "Mais tarde",
	"setupPrompt.open": "Vá para configuração",
	"setupPrompt.trigger": "Abra a configuração de entrada de voz",
	"setupPrompt.details": "Abra as configurações do plugin de voz",
	"setupPrompt.unavailableTitle": "O reconhecimento de fala não está pronto",
	"setupPrompt.unavailableBody": "Abra os detalhes do plugin de voz para verificar o status do reconhecimento, o progresso da preparação ou erros.",
	"setup.local": "Os modelos locais serão baixados para a máquina que executa DSH. Nenhum Python ou compilador é necessário.",
	"setup.disk": "Espaço em disco",
	"setup.diskValue": "Permitir cerca de {gb} GB para modelos, tempo de execução e caches de download",
	"setup.memory": "Memória",
	"setup.memoryValue": "Cerca de {gb} GB com o modelo carregado; o reconhecimento pode usar mais",
	"setup.time": "Primeira configuração",
	"setup.timeValue": "Aguarde aproximadamente {min}–{max} minutos, dependendo da rede e da máquina",
	"setup.estimateNote": "Estas são estimativas; redes lentas podem demorar mais. Os downloads são reutilizados; modelos inativos liberam memória por padrão.",
	"step.check": "Verifique os recursos locais",
	"step.model": "Preparar modelo de reconhecimento",
	"step.vad": "Preparar modelo de detecção de voz",
	"step.verify": "Verifique os arquivos do modelo",
	"step.load": "Carregar {name}",
	"stepStatus.pending": "Não iniciado",
	"stepStatus.running": "Em andamento",
	"stepStatus.complete": "Concluído",
	"stepStatus.failed": "Falha",
	"stepStatus.cancelled": "Cancelado",
	"short.downloading": "Baixando",
	"short.failed": "Falha na configuração",
	retryRecording: "Grave novamente",
	preparationSteps: "Etapas de preparação",
	"prepare": "Baixe e prepare",
	"retryPrepare": "Tentar novamente a preparação",
	"cancelPrepare": "Cancelar preparação",
	"downloadProgress": "Progresso do download",
	"downloadBytes": "Baixar: {completed} / {total} MB, {percent}%",
	"downloadUnknown": "Download de {completed} MB",
	"elapsed": "Aguardando {seconds} segundos",
	"preparationFailed": "Falha na preparação: {message}",
	"download.network": "Não é possível fazer download de {resource}: falha na conexão com o serviço de download.",
	"download.dns": "Não é possível fazer download de {resource}: o endereço de download não pôde ser resolvido.",
	"download.timeout": "O download de {resource} expirou.",
	"download.certificate": "Não é possível fazer download de {resource}: falha na verificação do certificado.",
	"download.http": "Não é possível fazer download de {resource}: o serviço de download retornou HTTP {status}.",
	"download.integrity": "O download de {resource} está incompleto ou falhou na verificação.",
	"download.storage": "Não é possível salvar {resource}: espaço em disco ou permissão de gravação insuficientes.",
	"download.unknown": "Não foi possível preparar {resource}.",
	"downloadAdvice.network": "Verifique se a máquina que executa DSH pode acessar a origem de download e seus serviços de download de modelo. Configure um proxy nessa máquina, se necessário, e tente novamente.",
	"downloadAdvice.dns": "Verifique as configurações de DNS e proxy na máquina que executa DSH. Confirme se ele pode resolver o domínio de origem do download e tente novamente.",
	"downloadAdvice.timeout": "Verifique a conexão de rede ou proxy na máquina que executa DSH e tente novamente mais tarde. Os arquivos baixados verificados são retidos.",
	"downloadAdvice.certificate": "Verifique o relógio do sistema, os certificados confiáveis e as configurações de proxy na máquina que executa DSH e tente novamente.",
	"downloadAdvice.http": "Confirme se o endereço de download está disponível e se o proxy pode acessar o serviço de download ou tente novamente mais tarde.",
	"downloadAdvice.integrity": "Tente novamente o download. Outros arquivos concluídos e verificados são retidos.",
	"downloadAdvice.storage": "Verifique o espaço em disco disponível e a permissão de gravação para o diretório de modelo na máquina que executa DSH e tente novamente.",
	"downloadAdvice.unknown": "Verifique as permissões de rede, espaço em disco e diretório de modelo na máquina que executa DSH e tente novamente.",
	downloadSource: "Fonte de download: {source}",
	sourceChoice: "Fonte de download do modelo",
	sourceAuto: "Automático (recomendado)",
	sourceHuggingFace: "Abraçando o rosto",
	sourceMirror: "Espelho HF (espelho da China)",
	sourceAutoHelp: "Prefira a primeira fonte de resposta e tente outra se o download falhar.",
	sourceManualHelp: "Baixe apenas da fonte selecionada. Os arquivos baixados verificados são reutilizados.",
	downloadCode: "Código de erro: {code}",
	"reconnecting": "Conectando ao reconhecimento de fala…",
	"preparation.unprepared": "O primeiro uso baixa os modelos de reconhecimento local.",
	"preparation.checking": "Verificando recursos locais…",
	"preparation.loading": "Carregando {name}…",
	"preparation.waking": "Ativando o reconhecimento de fala local…",
	"preparation.ready": "O reconhecimento de fala local está pronto.",
	"preparation.standby": "Os recursos locais estão preparados. A gravação desperta o reconhecedor.",
	"preparation.cancelled": "Preparação cancelada. Os downloads concluídos são retidos.",
	"preparation.cancelling": "Cancelando a preparação…",
	cloudReady: "O reconhecimento de fala na nuvem está pronto.",
	discard: "Descartar transcrição",
	transcribingShort: "Transcrevendo…",
	wakingShort: "Acordando…",
	provider: "Serviço de reconhecimento",
	language: "Linguagem de reconhecimento",
	inputDevice: "Dispositivo de entrada",
	systemMicrophone: "Padrão do sistema",
	systemMicrophoneNamed: "Padrão do sistema ({name})",
	unnamedSelectedMicrophone: "Microfone",
	unnamedMicrophone: "Microfone {number}",
	inputLevel: "Nível de entrada do microfone",
	deviceUnavailable: "Indisponível",
	deviceMissing: "Microfone indisponível. Escolha outro dispositivo de entrada.",
	auto: "Detectar automaticamente",
	zh: "Chinês",
	en: "Inglês",
	yue: "cantonês",
	ja: "Japonês",
	es: "espanhol",
	fr: "francês",
	de: "alemão",
	ru: "russo",
	pt: "português",
	ko: "Coreano",
	start: "Comece a gravar",
	stop: "Pare e transcreva",
	cancel: "Cancelar",
	insert: "Inserir texto",
	loading: "Carregando serviços de reconhecimento…",
	requesting: "Permitir que o acesso ao microfone continue…",
	recording: "Gravando…",
	interrupted: "A gravação foi interrompida. Por favor, tente novamente.",
	local: "O áudio é reconhecido na máquina que executa DSH. Se os modelos precisarem ser baixados, essa máquina deverá ser capaz de acessar a fonte selecionada e seus serviços de arquivo. Configure um proxy nessa máquina, se necessário.",
	cloud: "O áudio será enviado para o serviço de nuvem selecionado.",
	empty: "Nenhuma fala reconhecida",
	cancelled: "Entrada de voz cancelada.",
	conflict: "Seu rascunho foi alterado. A transcrição é preservada e pode ser inserida no cursor atual.",
	failed: "Falha no reconhecimento de fala: {message}",
	unavailable: "Este navegador não pode gravar áudio. Use um navegador com suporte para microfone.",
	permission: "O acesso ao microfone está desativado. Permita nas configurações do navegador e do sistema.",
	tooLarge: "A gravação excede o limite de serviço. Experimente uma gravação mais curta."
};
//#endregion
//#region src/locales.ts
/**
* Every string this plugin adds to the locale service.
*
* The official voice component ships its own dictionaries; these overlay the
* command label and the settings page's copy. Keys are flat: the locale service
* indexes dictionaries literally, so `'settings.label'` is the key, not a path.
*/
/** The plugin's locale namespace. */
const NAMESPACE = "voice-anywhere";
const COMMAND_LABEL = {
	zh: "任意输入框语音输入",
	en: "Voice input in any text field",
	ja: "任意の入力欄で音声入力",
	es: "Dictado en cualquier campo de texto",
	fr: "Dictée dans n’importe quel champ",
	de: "Spracheingabe in jedem Textfeld",
	ru: "Голосовой ввод в любом поле",
	pt: "Ditado em qualquer campo de texto"
};
/** The settings page's own copy; English carries every language written by hand here. */
const SETTINGS_TEXT = {
	zh: {
		"settings.label": "语音输入",
		"settings.hint": "为不使用键盘的场景录制触发键：键盘组合、鼠标键、遥控器发出的键都可以。",
		"settings.voice": "语音输入",
		"settings.voiceHint": "按下它开始录音，再按一次停止并转写。",
		"settings.submit": "提交",
		"settings.submitHint": "按下它等同按回车：把当前输入框的内容提交出去。",
		"settings.empty": "还没有自定义触发键。",
		"settings.capture": "录制按键",
		"settings.capturing": "请按下按键或鼠标键…",
		"settings.captured": "已添加：",
		"settings.rejected": "这个组合无法用作触发键：",
		"settings.remove": "删除",
		"settings.close": "关闭此设置页"
	},
	en: {
		"settings.label": "Voice input",
		"settings.hint": "Record triggers for keyboard-free use: a key combination, a mouse button, or a key sent by a remote.",
		"settings.voice": "Voice input",
		"settings.voiceHint": "Press it to start recording, press it again to stop and transcribe.",
		"settings.submit": "Submit",
		"settings.submitHint": "Press it to send what a plain Enter would send from the current field.",
		"settings.empty": "No custom trigger yet.",
		"settings.capture": "Record a trigger",
		"settings.capturing": "Press a key or a mouse button…",
		"settings.captured": "Added:",
		"settings.rejected": "That combination cannot be a trigger:",
		"settings.remove": "Remove",
		"settings.close": "Close this page"
	}
};
/** Locale dictionaries installed for every shipped language. */
const DICTS = {
	zh: {
		...zh,
		command: COMMAND_LABEL.zh,
		...SETTINGS_TEXT.zh
	},
	en: {
		...en,
		command: COMMAND_LABEL.en,
		...SETTINGS_TEXT.en
	},
	ja: {
		...ja,
		command: COMMAND_LABEL.ja,
		...SETTINGS_TEXT.en
	},
	es: {
		...es,
		command: COMMAND_LABEL.es,
		...SETTINGS_TEXT.en
	},
	fr: {
		...fr,
		command: COMMAND_LABEL.fr,
		...SETTINGS_TEXT.en
	},
	de: {
		...de,
		command: COMMAND_LABEL.de,
		...SETTINGS_TEXT.en
	},
	ru: {
		...ru,
		command: COMMAND_LABEL.ru,
		...SETTINGS_TEXT.en
	},
	pt: {
		...pt,
		command: COMMAND_LABEL.pt,
		...SETTINGS_TEXT.en
	}
};
//#endregion
//#region ../../deepseek-harness/packages/experimental/client-ui-voice-input/src/client/microphone-device.ts
/** Browser-local microphone preference shared by settings previews and dictation. */
/**
* Restore the browser preference independently of Host recognition settings.
* @returns validated device selection, persisted through the shared Client store.
*/
function createMicrophoneDeviceStore() {
	const store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
		id: "",
		label: ""
	}, { persist: { name: "dsh.voice-input.microphone" } });
	const saved = store.getSnapshot();
	if (!saved || typeof saved !== "object" || !("id" in saved) || typeof saved.id !== "string" || !("label" in saved) || typeof saved.label !== "string") store.set({
		id: "",
		label: ""
	});
	return store;
}
//#endregion
//#region src/recording.ts
/**
* Microphone capture, reused from the official client source.
*
* `Recording` owns permission, MediaRecorder and the 16 kHz mono WAV encoding
* the Host validates, so duplicating it would only add a way to drift from the
* official button. The device preference is the one the official picker saved:
* it is re-read on every capture because that picker writes the same key.
*/
/** Persistence key owned by the official microphone picker. */
const DEVICE_KEY = "dsh.voice-input.microphone";
function createRecorder() {
	const devices = createMicrophoneDeviceStore();
	const live = /* @__PURE__ */ new Set();
	/**
	* Read the currently chosen microphone; the store is only a fallback because
	* another plugin instance may have written the key after we mounted.
	* @returns a device id, or an empty string for the system default.
	*/
	const currentDeviceId = () => {
		try {
			const saved = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "null");
			if (saved !== null && typeof saved === "object" && "id" in saved) {
				const id = saved.id;
				if (typeof id === "string") return id;
			}
		} catch {}
		return devices.getSnapshot().id;
	};
	return {
		devices,
		/** @returns one capture owned by this plugin's lifetime. */
		createRecording: () => {
			let recording;
			recording = new Recording(() => {
				live.delete(recording);
			}, currentDeviceId());
			live.add(recording);
			return recording;
		},
		/** Release every capture still open when the plugin unloads. */
		dispose: () => {
			for (const recording of live) recording.dispose();
			live.clear();
		}
	};
}
//#endregion
//#region src/storage.ts
/**
* What the settings page owns in the browser.
*
* The configuration file decides whether the page exists at all; the chosen
* triggers are per client, so a profile edit cannot silently overwrite them.
*/
const TRIGGERS_KEY = "dsh.voice-anywhere.triggers";
const SUBMIT_KEY = "dsh.voice-anywhere.submit";
/** Shape version of the stored value; a legacy bare array is migrated on read. */
const STORAGE_VERSION = 1;
const CLOSED_KEY = "dsh.voice-anywhere.settings-closed";
/**
* Key for one profile's close mark; a shared origin must not let one profile
* hide another's page.
* @param profile - profile name from the configuration.
* @returns the storage key.
*/
function closedKey(profile) {
	return `${CLOSED_KEY}:${profile}`;
}
/**
* Parse a stored value, accepting both the versioned envelope and the legacy
* bare array written before 0.1.2.
* @param raw - raw storage text, or null when nothing was stored.
* @returns the list, or null when the value is absent or unusable.
*/
function parseStored(raw) {
	if (raw === null) return null;
	const parsed = JSON.parse(raw);
	const list = Array.isArray(parsed) ? parsed : parsed !== null && typeof parsed === "object" && Array.isArray(parsed.triggers) ? parsed.triggers : null;
	return list === null ? null : list.filter((entry) => typeof entry === "string");
}
/**
* Build the reader and writer for one list key.
* @param key - storage key.
* @returns the two accessors.
*/
function listStore(key) {
	return {
		load(fallback) {
			try {
				return parseStored(localStorage.getItem(key)) ?? [...fallback];
			} catch {
				return [...fallback];
			}
		},
		save(values) {
			try {
				localStorage.setItem(key, JSON.stringify({
					v: STORAGE_VERSION,
					triggers: [...values]
				}));
			} catch {}
		}
	};
}
const triggers = listStore(TRIGGERS_KEY);
const submits = listStore(SUBMIT_KEY);
/** Read the dictation triggers. */
const loadTriggerText = triggers.load;
/** Persist the dictation triggers. */
const saveTriggerText = triggers.save;
/** Read the submit triggers. */
const loadSubmitText = submits.load;
/** Persist the submit triggers. */
const saveSubmitText = submits.save;
/**
* Whether the page was closed from inside for this exact configuration version.
* @param revision - host revision of the file.
* @returns whether the page should stay hidden.
*/
function isPageClosed(revision, profile) {
	try {
		return localStorage.getItem(closedKey(profile)) === revision;
	} catch {
		return false;
	}
}
/**
* Remember that the page was closed for this configuration version. Editing the
* file produces a new revision, which re-opens the page.
* @param revision - host revision of the file.
*/
function closePage(revision, profile) {
	try {
		localStorage.setItem(closedKey(profile), revision);
	} catch {}
}
//#endregion
//#region src/trigger/expression.ts
const MODIFIER_NAMES = {
	ctrl: "ctrl",
	control: "ctrl",
	alt: "alt",
	option: "alt",
	shift: "shift",
	meta: "meta",
	cmd: "meta",
	command: "meta",
	super: "meta",
	win: "meta"
};
const MOUSE_BUTTONS = {
	back: 3,
	forward: 4,
	middle: 1,
	"3": 3,
	"4": 4
};
/** Key names whose browser spelling is not the single character the user typed. */
const NAMED_CODES = {
	space: "Space",
	enter: "Enter",
	esc: "Escape",
	escape: "Escape",
	tab: "Tab",
	backspace: "Backspace",
	delete: "Delete",
	insert: "Insert",
	home: "Home",
	end: "End",
	pageup: "PageUp",
	pagedown: "PageDown",
	arrowup: "ArrowUp",
	arrowdown: "ArrowDown",
	arrowleft: "ArrowLeft",
	arrowright: "ArrowRight",
	slash: "Slash",
	comma: "Comma",
	period: "Period",
	backslash: "Backslash",
	backquote: "Backquote",
	minus: "Minus",
	equal: "Equal",
	semicolon: "Semicolon",
	quote: "Quote",
	bracketleft: "BracketLeft",
	bracketright: "BracketRight"
};
/** Punctuation the user types as itself rather than by name. */
const PUNCTUATION = {
	",": "Comma",
	".": "Period",
	"/": "Slash",
	"\\": "Backslash",
	"`": "Backquote",
	"-": "Minus",
	"=": "Equal",
	";": "Semicolon",
	"'": "Quote",
	"[": "BracketLeft",
	"]": "BracketRight"
};
/**
* Normalize one key token to `KeyboardEvent.code`.
* @param token - token from the configuration.
* @returns the code, or null when the token is not a key this plugin knows.
*/
function codeOf(token) {
	const lower = token.toLowerCase();
	const named = NAMED_CODES[lower] ?? PUNCTUATION[token];
	if (named !== void 0) return named;
	if (/^f([1-9]|1[0-9]|2[0-4])$/u.test(lower)) return token.toUpperCase();
	if (/^[a-z]$/u.test(lower)) return `Key${lower.toUpperCase()}`;
	if (/^numpad[a-z0-9]+$/u.test(lower)) return token;
	if (/^[0-9]$/u.test(lower)) return `Digit${lower}`;
	if (lower.startsWith("media")) return token;
	return null;
}
/**
* Parse one trigger expression.
* @param text - e.g. `Ctrl+Shift+Space`, `Mouse:Back`, `MediaPlayPause`.
* @returns the trigger, or null when the expression is not usable.
*/
function parseTrigger(text) {
	const trimmed = text.trim();
	if (trimmed === "") return null;
	const mouse = /^mouse:(.+)$/iu.exec(trimmed);
	if (mouse !== null) {
		const button = MOUSE_BUTTONS[mouse[1].trim().toLowerCase()];
		return button === void 0 ? null : {
			kind: "mouse",
			button
		};
	}
	const parts = trimmed.split("+").map((part) => part.trim()).filter((part) => part !== "");
	const keyPart = parts[parts.length - 1];
	if (keyPart === void 0) return null;
	const code = codeOf(keyPart);
	if (code === null) return null;
	const modifiers = {
		ctrl: false,
		alt: false,
		shift: false,
		meta: false
	};
	for (const part of parts.slice(0, -1)) {
		const modifier = MODIFIER_NAMES[part.toLowerCase()];
		if (modifier === void 0) return null;
		modifiers[modifier] = true;
	}
	if (!/^(Media|F\d)/iu.test(code) && !modifiers.ctrl && !modifiers.alt && !modifiers.shift && !modifiers.meta) return null;
	return {
		kind: "key",
		code,
		...modifiers
	};
}
/**
* Parse a configured list, dropping unusable entries.
* @param values - trigger expressions.
* @returns the parsed triggers.
*/
function parseTriggers(values) {
	const parsed = [];
	for (const value of values) {
		const trigger = parseTrigger(value);
		if (trigger !== null) parsed.push(trigger);
	}
	return parsed;
}
/**
* Whether a keyboard event matches one trigger.
* @param trigger - parsed trigger.
* @param event - the keydown.
* @returns whether it matches on code and modifiers.
*/
function matchesKey(trigger, event) {
	if (trigger.kind !== "key") return false;
	const key = event.key ?? "";
	if (!(event.code !== "" ? event.code === trigger.code : key !== "" && key === trigger.code)) return false;
	return event.ctrlKey === trigger.ctrl && event.altKey === trigger.alt && event.shiftKey === trigger.shift && event.metaKey === trigger.meta;
}
/**
* Whether a mouse event matches one trigger.
* @param trigger - parsed trigger.
* @param event - the mousedown.
* @returns whether it matches the configured button.
*/
function matchesMouse(trigger, event) {
	return trigger.kind === "mouse" && event.button === trigger.button;
}
/** Modifier keys produce no expression of their own. */
const MODIFIER_CODES = new Set([
	"ShiftLeft",
	"ShiftRight",
	"ControlLeft",
	"ControlRight",
	"AltLeft",
	"AltRight",
	"MetaLeft",
	"MetaRight"
]);
/**
* Describe a captured event as a configuration expression.
* @param event - the keydown or mousedown that was captured.
* @returns the expression, or null for a bare modifier or an unusable event.
*/
function expressionOf(event) {
	if ("button" in event) {
		if (event.button === 3) return "Mouse:Back";
		if (event.button === 4) return "Mouse:Forward";
		return null;
	}
	if (MODIFIER_CODES.has(event.code)) return null;
	const tokens = [];
	if (event.ctrlKey) tokens.push("Ctrl");
	if (event.altKey) tokens.push("Alt");
	if (event.shiftKey) tokens.push("Shift");
	if (event.metaKey) tokens.push("Meta");
	const code = event.code;
	if (code === "") return null;
	const token = code.startsWith("Key") ? code.slice(3) : code.startsWith("Digit") ? code.slice(5) : code;
	tokens.push(token);
	const expression = tokens.join("+");
	return parseTrigger(expression) === null ? null : expression;
}
//#endregion
//#region src/settings/styles.ts
/**
* Inline spacing for the settings page.
*
* The component describes behaviour; the numbers live here so the layout can be
* read (and changed) without scanning the render tree.
*/
const STYLE = {
	page: {
		display: "flex",
		flexDirection: "column",
		gap: "14px",
		padding: "4px 0"
	},
	hint: {
		margin: 0,
		opacity: .72
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: "8px"
	},
	row: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "12px"
	},
	actions: {
		display: "flex",
		gap: "8px",
		flexWrap: "wrap"
	}
};
//#endregion
//#region src/settings/section.ts
/**
* The plugin's own settings page.
*
* It exists to record triggers, nothing else: the configuration file stays the
* single place that decides where dictation may happen, so this page can never
* become a second, silently divergent policy editor.
*/
/**
* Render one editable trigger list.
* @param props - translator, copy, values and the three callbacks.
* @returns the column.
*/
function TriggerColumn(props) {
	const { t, title, hint, values, capturing, onToggle, onRemove } = props;
	return (0, react.createElement)("section", { style: STYLE.list }, (0, react.createElement)("div", { style: STYLE.row }, (0, react.createElement)("strong", null, title), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
		variant: capturing ? "primary" : "outline",
		onClick: onToggle
	}, capturing ? t("settings.capturing") : t("settings.capture"))), (0, react.createElement)("p", { style: STYLE.hint }, hint), values.length === 0 ? (0, react.createElement)("p", { style: STYLE.hint }, t("settings.empty")) : (0, react.createElement)("div", { style: STYLE.list }, values.map((value) => (0, react.createElement)("div", {
		key: value,
		style: STYLE.row
	}, (0, react.createElement)("code", null, value), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
		variant: "outline",
		onClick: () => onRemove(value)
	}, t("settings.remove"))))));
}
/**
* Render the trigger editor.
* @param props - translator, profile name, and the callback that removes the page.
* @returns the section body.
*/
function SettingsSection(props) {
	const { t, profile, onClose } = props;
	const [voice, setVoice] = (0, react.useState)(() => loadTriggerText(currentConfig().triggers));
	const [submit, setSubmit] = (0, react.useState)(() => loadSubmitText(currentConfig().submit));
	const [capturing, setCapturing$1] = (0, react.useState)(null);
	const [message, setMessage] = (0, react.useState)("");
	(0, react.useEffect)(() => {
		if (capturing === null) return void 0;
		setCapturing(true);
		const capture = (event) => {
			const expression = expressionOf(event);
			if (expression === null) {
				if ("button" in event || !event.code) return;
				setMessage(`${t("settings.rejected")} ${event.code}`);
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			if (capturing === "voice") {
				const next = [...voice.filter((entry) => entry !== expression), expression];
				setVoice(next);
				saveTriggerText(next);
			} else {
				const next = [...submit.filter((entry) => entry !== expression), expression];
				setSubmit(next);
				saveSubmitText(next);
			}
			setMessage(`${t("settings.captured")} ${expression}`);
			setCapturing$1(null);
		};
		window.addEventListener("keydown", capture, true);
		window.addEventListener("mousedown", capture, true);
		return () => {
			window.removeEventListener("keydown", capture, true);
			window.removeEventListener("mousedown", capture, true);
			setCapturing(false);
		};
	}, [
		capturing,
		voice,
		submit,
		t
	]);
	const remove = (column, value) => {
		if (column === "voice") {
			const next = voice.filter((entry) => entry !== value);
			setVoice(next);
			saveTriggerText(next);
		} else {
			const next = submit.filter((entry) => entry !== value);
			setSubmit(next);
			saveSubmitText(next);
		}
	};
	const toggle = (column) => {
		setMessage("");
		setCapturing$1((current) => current === column ? null : column);
	};
	const close = () => {
		const config = currentConfig();
		closePage(config.revision, profile ?? config.profile);
		onClose?.();
	};
	return (0, react.createElement)("div", { style: STYLE.page }, (0, react.createElement)("p", { style: STYLE.hint }, t("settings.hint")), (0, react.createElement)(TriggerColumn, {
		t,
		title: t("settings.voice"),
		hint: t("settings.voiceHint"),
		values: voice,
		capturing: capturing === "voice",
		onToggle: () => toggle("voice"),
		onRemove: (value) => remove("voice", value)
	}), (0, react.createElement)(TriggerColumn, {
		t,
		title: t("settings.submit"),
		hint: t("settings.submitHint"),
		values: submit,
		capturing: capturing === "submit",
		onToggle: () => toggle("submit"),
		onRemove: (value) => remove("submit", value)
	}), (0, react.createElement)("div", { style: STYLE.actions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
		variant: "outline",
		onClick: close
	}, t("settings.close"))), message === "" ? null : (0, react.createElement)("p", { style: STYLE.hint }, message));
}
//#endregion
//#region src/speech.ts
/**
* Access to the official speech capability.
*
* The voice package mounts its Remote namespace under its own plugin scope, so
* a sibling plugin reads it by service name (`ctx.get`) and may find nothing
* until that plugin has mounted. Nothing here is a hard dependency: a missing
* service leaves the readiness snapshot unavailable, and the reused component
* then shows its own setup affordance instead of failing.
*/
/** The namespace the official voice plugin mounts at startup. */
const SPEECH_SERVICE = "remote.speech";
/**
* Describe a failed Remote result without leaking its shape into callers.
* @param result - Remote result or transport error.
* @returns a short reason for the readiness snapshot.
*/
function reasonOf(result) {
	if (result !== null && typeof result === "object" && "error" in result) return result.error?.message ?? "speech request failed";
	return "speech request failed";
}
/**
* Bind the speech Remote namespace lazily.
* @param ctx - plugin context used for service lookup.
* @returns readiness snapshot plus the calls the button needs.
*/
function createSpeech(ctx) {
	const store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
		catalog: null,
		connected: false,
		error: null
	});
	const service = () => {
		try {
			return ctx.get("remote.speech") ?? null;
		} catch {
			return null;
		}
	};
	const requireService = () => {
		const speech = service();
		if (speech === null) throw new Error(`speech service unavailable (${SPEECH_SERVICE})`);
		return speech;
	};
	/**
	* Read one catalog snapshot: the same provider selection and limits the
	* official button uses, which is why no preference logic lives here.
	* @returns after the snapshot settles.
	*/
	const refresh = async () => {
		const speech = service();
		if (speech === null) {
			store.set({
				catalog: null,
				connected: false,
				error: "unavailable"
			});
			return;
		}
		try {
			const result = await speech.catalog();
			if (result !== null && typeof result === "object" && result.ok === true) {
				store.set({
					catalog: result.value,
					connected: true,
					error: null
				});
				return;
			}
			store.set({
				...store.getSnapshot(),
				connected: false,
				error: reasonOf(result)
			});
		} catch (error) {
			store.set({
				...store.getSnapshot(),
				connected: false,
				error: String(error)
			});
		}
	};
	let disposed = false;
	const timers = /* @__PURE__ */ new Set();
	/**
	* Keep readiness live instead of reading one snapshot.
	*
	* The official namespace exposes `follow`; a quiet stream, a missing method,
	* or a transport failure all fall back to a bounded retry, so a speech plugin
	* that mounts after this one still turns the button on without a reload.
	* @param attempt - retry depth, used only to space the backoff.
	*/
	const observe = async (attempt = 0) => {
		const speech = service();
		if (speech === null || typeof speech.follow !== "function") {
			await refresh();
			if (!disposed) {
				const id = setTimeout(() => {
					timers.delete(id);
					observe(attempt);
				}, Math.min(3e4, 1e3 * 2 ** attempt));
				timers.add(id);
			}
			return;
		}
		const controller = new AbortController();
		try {
			for await (const item of speech.follow(controller.signal)) {
				if (disposed) {
					controller.abort();
					return;
				}
				const value = item.value;
				if (value !== void 0) {
					store.set({
						catalog: value,
						connected: true,
						error: null
					});
					item.accept?.();
				}
			}
		} catch (error) {
			store.set({
				...store.getSnapshot(),
				connected: false,
				error: String(error)
			});
		}
		if (!disposed) {
			const id = setTimeout(() => {
				timers.delete(id);
				observe(attempt + 1);
			}, Math.min(15e3, 500 * 2 ** attempt));
			timers.add(id);
		}
	};
	/**
	* Stop observing.
	* @returns nothing.
	*/
	const dispose = () => {
		disposed = true;
		for (const id of timers) clearTimeout(id);
		timers.clear();
	};
	return {
		store,
		refresh,
		observe,
		dispose,
		transcribe: (request, signal) => requireService().transcribe(request, signal),
		configure: async (patch) => {
			const result = await requireService().configure(patch);
			if (result?.ok === false) throw result.error;
		},
		prepare: async (providerId, options) => {
			const result = await requireService().prepare(providerId, options);
			if (result?.ok === false) throw result.error;
		},
		cancelPreparation: async (providerId) => {
			const result = await requireService().cancelPreparation(providerId);
			if (result?.ok === false) throw result.error;
		}
	};
}
//#endregion
//#region src/shortcut.ts
/**
* The one shortcut, registered in the official shortcut catalog.
*
* It owns no recording logic: pressing the shortcut resolves the same control
* the mouse would press — the composer's official microphone or our floating
* instance — so "one key" and "one click" can never diverge.
*
* The command is registered **unbound** on purpose: the key is the user's
* choice, made once in Settings → Shortcuts. Declaring a default here would
* both decide for them and risk the host rejecting the whole command because
* one platform profile reserves the combination.
*/
/** Modal identifiers our command may run inside; unlabelled dialogs report `other`. */
const MODALS = [
	"settings",
	"shortcuts",
	"platform",
	"sidebar",
	"other"
];
/**
* Register the toggle command without a binding.
* @param ctx - client context carrying the shortcuts service.
* @param t - translator for this plugin's namespace.
* @param report - diagnostic sink for a rejected registration.
* @returns the registration disposer.
*/
function registerShortcut(ctx, t, report) {
	const command = {
		id: "voice.anywhere.toggle",
		label: () => t("command"),
		aliases: [
			"语音",
			"听写",
			"voice",
			"dictate",
			"speech"
		],
		defaults: {},
		regions: ["page", "editable"],
		modals: MODALS,
		resolve: (context) => {
			const activation = planActivation(context.target);
			return activation === null ? { status: "pass" } : {
				status: "handled",
				run: activation
			};
		}
	};
	try {
		return ctx.shortcuts.register(command);
	} catch (error) {
		report("shortcut-register", error);
		return () => {};
	}
}
//#endregion
//#region src/trigger/engine.ts
/**
* The trigger engine: the one place that subscribes to keyboard and mouse
* events, and hands a match to the shared activation.
*/
/**
* Listen for every configured binding.
*
* One listener pair serves all bindings: two independent engines would race on
* the same event and could fire twice.
* @param bindings - groups in priority order; the first match wins.
* @returns the removal function.
*/
function startTriggers(bindings) {
	/**
	* Dispatch one event to the first matching binding.
	* @param event - the captured event.
	* @param matches - matcher for this event kind.
	* @returns whether something matched.
	*/
	const dispatch = (event, matches) => {
		for (const binding of bindings) for (const trigger of binding.triggers()) {
			if (!matches(trigger)) continue;
			event.preventDefault();
			event.stopPropagation();
			binding.fire();
			return true;
		}
		return false;
	};
	const onKeyDown = (event) => {
		if (event.repeat || event.isComposing) return;
		if (event.getModifierState?.("AltGraph") === true) return;
		dispatch(event, (trigger) => matchesKey(trigger, event));
	};
	const onMouseDown = (event) => {
		dispatch(event, (trigger) => matchesMouse(trigger, event));
	};
	const onAuxClick = (event) => {
		for (const binding of bindings) {
			if (!binding.triggers().some((trigger) => matchesMouse(trigger, event))) continue;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
	};
	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("mousedown", onMouseDown, true);
	window.addEventListener("auxclick", onAuxClick, true);
	return () => {
		window.removeEventListener("keydown", onKeyDown, true);
		window.removeEventListener("mousedown", onMouseDown, true);
		window.removeEventListener("auxclick", onAuxClick, true);
	};
}
//#endregion
//#region src/submit.ts
/**
* Submit, exactly as pressing Enter would.
*
* The trigger exists so a remote or a mouse can finish what dictation started;
* it therefore reproduces the key rather than guessing which button the user
* meant. A synthetic Enter reaches the same handlers a real one does, including
* React's delegated listeners.
*/
/** The key sequence a submit reproduces. */
const ENTER = {
	key: "Enter",
	code: "Enter",
	bubbles: true,
	cancelable: true,
	composed: true
};
/**
* Resolve the editable that should receive Enter.
*
* The focused field wins because that is where a real Enter would land; the
* visible surface's field is the fallback for the case where focus wandered to
* a button after dictation inserted its text.
* @returns the editable, or null when there is nothing to submit into.
*/
function submitTarget() {
	const focused = classify(document.activeElement);
	if (focused !== null) return focused.element;
	const active = document.activeElement;
	if (active instanceof Element && active.closest(SELECTORS.composer) !== null) {
		const input = composerEditable(active.closest(SELECTORS.composer));
		if (input !== null) return input;
	}
	const surface = findSurface();
	if (surface !== null) return surface.field;
	if (document.querySelector(SELECTORS.settings) !== null || document.querySelector(SELECTORS.platform) !== null) return null;
	return composerEditable(document.querySelector(SELECTORS.composer));
}
/**
* Find the node the composer's key handler listens on.
*
* Lexical attaches its root listener to the contenteditable it creates, which
* can sit inside the marked wrapper; dispatching on the wrapper would never
* reach it, because the event only bubbles upwards.
* @param card - the composer card, or null when it is not rendered.
* @returns the editable root, or null.
*/
function composerEditable(card) {
	if (card === null) return null;
	const editable = card.querySelector("[contenteditable=\"true\"], [contenteditable=\"\"]");
	if (editable instanceof HTMLElement) return editable;
	const marked = card.querySelector(SELECTORS.composerInput);
	return marked instanceof HTMLElement ? marked : null;
}
/**
* Send one Enter key sequence to an element.
* @param element - the editable that receives it.
*/
function dispatchEnter(element) {
	for (const type of ["keydown", "keyup"]) {
		const event = new KeyboardEvent(type, ENTER);
		Object.defineProperty(event, "keyCode", { get: () => 13 });
		Object.defineProperty(event, "which", { get: () => 13 });
		element.dispatchEvent(event);
	}
}
/**
* Plan the submit action.
* @returns the action to run, or null while a capture is in progress or when no
* editable can take the key.
*/
function planSubmit() {
	if (composerControl.state() === "recording" || floatingControl.state() === "recording") return null;
	const target = submitTarget();
	note({ submit: {
		target: target === null ? null : target.tagName + (target.closest(SELECTORS.composer) === null ? ":field" : ":composer"),
		recording: composerControl.state() === "recording" || floatingControl.state() === "recording"
	} });
	return target === null ? null : () => dispatchEnter(target);
}
//#endregion
//#region src/client.ts
/**
* Composition root.
*
* The plugin owns three things and nothing else: the readiness mirror of the
* official speech service, the floating instance of the official microphone,
* and the triggers that press whichever microphone the focus points at. It
* declares no runtime dependency on any official package: the button and the
* capture pipeline are compiled into this artifact by `build.mjs`.
*/
/** Rules this plugin adds on top of the reused stylesheet. */
const EXTRA_CSS = `
/* While a plain field is being recorded, the row replaces its text. */
[data-voice-anywhere-capturing] { color: transparent !important; caret-color: transparent !important; }
[data-voice-anywhere-capturing]::placeholder { color: transparent !important; }
`;
/** Services the plugin cannot work without; Cordis parks it until they exist. */
const inject = [
	"slots",
	"locale",
	"shortcuts"
];
/**
* Report one failure through the shared diagnostics surface.
* @param kind - failing step.
* @param error - thrown value.
*/
function fail(kind, error) {
	report(kind, error);
}
/**
* Mount the floating microphone, its triggers and its settings page.
* @param ctx - client plugin context.
*/
function apply(ctx) {
	installDiagnostics({ build: _voice_anywhere_build_default });
	try {
		const t = ctx.locale.bind(NAMESPACE);
		ctx.effect(() => ctx.locale.register(NAMESPACE, DICTS));
		ctx.effect(() => {
			const style = document.createElement("style");
			style.setAttribute("data-voice-anywhere-style", "");
			style.textContent = `${VOICE_ANYWHERE_CSS}${EXTRA_CSS}`;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		});
		const speech = createSpeech(ctx);
		const recorder = createRecorder();
		ctx.effect(() => recorder.dispose);
		const navigation = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(false);
		ctx.inject(["pluginNavigation"], (scope) => {
			navigation.set(true);
			scope.effect(() => () => {
				navigation.set(false);
			});
		});
		const face = createFace({
			ctx,
			speech,
			recorder,
			navigation
		});
		ctx.slots.inject("shell.overlay", () => ctx.slots.register({
			name: "shell.overlay",
			id: "voice-anywhere.button",
			locale: NAMESPACE,
			inject: () => face
		}, FloatingMic));
		ctx.effect(() => registerShortcut(ctx, t, fail));
		ctx.effect(() => {
			speech.observe();
			return () => speech.dispose();
		});
		let voiceTriggers = parseTriggers(loadTriggerText(currentConfig().triggers));
		let submitTriggers = parseTriggers(loadSubmitText(currentConfig().submit));
		const refreshTriggers = () => {
			voiceTriggers = parseTriggers(loadTriggerText(currentConfig().triggers));
			submitTriggers = parseTriggers(loadSubmitText(currentConfig().submit));
		};
		window.addEventListener("storage", refreshTriggers);
		ctx.effect(() => {
			const stop = startTriggers([{
				triggers: () => isCapturing() ? [] : voiceTriggers,
				fire: () => {
					planActivation()?.();
				}
			}, {
				triggers: () => isCapturing() ? [] : submitTriggers,
				fire: () => {
					planSubmit()?.();
				}
			}]);
			return () => {
				stop();
				window.removeEventListener("storage", refreshTriggers);
			};
		});
		ctx.effect(() => {
			let section = null;
			let cancelled = false;
			loadConfig().then((config) => {
				if (cancelled || !config.settingsPage || isPageClosed(config.revision, config.profile)) return;
				section = ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "voice-anywhere",
					order: 70,
					locale: NAMESPACE,
					label: () => t("settings.label")
				}, () => (0, react.createElement)(SettingsSection, {
					t,
					profile: config.profile,
					onClose: () => {
						section?.();
						section = null;
					}
				})));
				note({ section: "registered" });
			}).catch((error) => fail("config", error));
			return () => {
				cancelled = true;
				section?.();
			};
		});
	} catch (error) {
		fail("activate", error);
	}
}
//#endregion
exports.apply = apply;
exports.inject = inject;

    const VOICE_ANYWHERE_CSS = ".qU0WNq_trigger {\n  flex: none;\n  width: 28px;\n  padding: 0;\n}\n\n.qU0WNq_triggerAnchor {\n  flex: none;\n  display: inline-flex;\n}\n\n.qU0WNq_captureRow {\n  align-items: center;\n  gap: 12px;\n  width: 100%;\n  min-width: 0;\n  min-height: 34px;\n  display: flex;\n}\n\n.qU0WNq_roundButton {\n  corner-shape: round;\n  background: var(--dsw-specific-selector);\n  border-radius: 50%;\n  flex: none;\n  width: 32px;\n  height: 32px;\n  padding: 0;\n}\n\n@media (hover: hover) {\n  .qU0WNq_roundButton:hover:not(:disabled) {\n    background: var(--dsw-alias-interactive-bg-hover-solid);\n  }\n}\n\n.qU0WNq_waveform {\n  width: 0;\n  min-width: 24px;\n  height: 24px;\n  color: var(--dsw-alias-label-secondary);\n  flex: 1;\n  display: block;\n}\n\n.qU0WNq_activityMessage {\n  min-width: 0;\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  flex: 1;\n  align-items: center;\n  gap: 8px;\n  font-size: 12px;\n  display: flex;\n  overflow: hidden;\n}\n\n.qU0WNq_inlineAction {\n  flex: none;\n}\n\n.qU0WNq_preparation {\n  border: .5px solid var(--dsw-alias-border-l1);\n  border-radius: 10px;\n  flex-direction: column;\n  gap: 10px;\n  margin: 12px 0;\n  padding: 14px;\n  font-size: 13px;\n  display: flex;\n}\n\n.qU0WNq_preparation p {\n  margin: 0;\n}\n\n.qU0WNq_preparationActions {\n  gap: 8px;\n  display: flex;\n}\n\n.qU0WNq_preparationActions:empty {\n  display: none;\n}\n\n.qU0WNq_preparationError {\n  color: var(--dsw-alias-state-error-primary);\n  overflow-wrap: anywhere;\n  font-size: 12px;\n}\n\n.qU0WNq_downloadFailure {\n  overflow-wrap: anywhere;\n  gap: 6px;\n  display: grid;\n}\n\n.qU0WNq_summaryRow {\n  flex-wrap: wrap;\n  gap: 4px;\n  height: auto;\n  min-height: 28px;\n}\n\n.qU0WNq_summaryTitle {\n  flex: 1;\n  min-width: 0;\n}\n\n.qU0WNq_metric {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n}\n\n.qU0WNq_progress {\n  width: 100%;\n  height: 6px;\n  accent-color: var(--dsw-alias-state-business-primary);\n}\n\n.qU0WNq_steps {\n  flex-direction: column;\n  gap: 14px;\n  margin: 0;\n  padding: 16px 0 2px;\n  list-style: none;\n  display: flex;\n}\n\n.qU0WNq_steps li {\n  align-items: flex-start;\n  gap: 10px;\n  line-height: 18px;\n  display: flex;\n}\n\n.qU0WNq_steps li > :first-child {\n  margin-top: 1px;\n}\n\n.qU0WNq_steps li[data-step-state=\"pending\"] {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.qU0WNq_stepBody {\n  flex: 1;\n  min-width: 0;\n}\n\n.qU0WNq_stepProgress {\n  flex-direction: column;\n  gap: 6px;\n  margin-top: 6px;\n  display: flex;\n}\n\n.qU0WNq_stepProgress small {\n  color: var(--dsw-alias-label-tertiary);\n  overflow-wrap: anywhere;\n  font-size: 11px;\n}\n\n.qU0WNq_preferences {\n  gap: 12px;\n  margin: 18px 0;\n  font-size: 13px;\n  display: grid;\n}\n\n.qU0WNq_deviceRow, .qU0WNq_preferences label, .qU0WNq_sourceChoice label {\n  grid-template-columns: 100px minmax(120px, 280px);\n  align-items: center;\n  gap: 12px;\n  display: grid;\n}\n\n.qU0WNq_preferences select, .qU0WNq_sourceChoice select {\n  border: .5px solid var(--dsw-alias-border-l1);\n  color: inherit;\n  font: inherit;\n  background: none;\n  border-radius: 6px;\n  padding: 6px 10px;\n}\n\n.qU0WNq_sourceChoice {\n  gap: 6px;\n  display: grid;\n}\n\n.qU0WNq_preferences p {\n  margin: 0;\n}\n\n.qU0WNq_settingsCard {\n  border: .5px solid var(--dsw-alias-border-l1);\n  border-radius: 10px;\n  padding: 16px;\n  list-style: none;\n}\n\n.qU0WNq_settingsCard > p {\n  color: var(--dsw-alias-label-secondary);\n  margin: 8px 0 0;\n  font-size: 13px;\n}\n\n.qU0WNq_setupEstimate {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 8px;\n  gap: 10px;\n  padding: 12px;\n  line-height: 1.6;\n  display: grid;\n}\n\n.qU0WNq_setupEstimate dl {\n  gap: 6px;\n  margin: 0;\n  display: grid;\n}\n\n.qU0WNq_setupEstimate dl > div {\n  grid-template-columns: 72px minmax(0, 1fr);\n  gap: 10px;\n  display: grid;\n}\n\n.qU0WNq_setupEstimate dt {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.qU0WNq_setupEstimate dd {\n  margin: 0;\n}\n\n.qU0WNq_setupEstimate small {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n}\n\n.qU0WNq_deviceField {\n  min-width: 0;\n  display: block;\n  position: relative;\n}\n\n.qU0WNq_deviceField select {\n  width: 100%;\n}\n\n.qU0WNq_deviceField select.qU0WNq_deviceSelectMeter {\n  padding-right: 72px;\n}\n\n.qU0WNq_deviceMeter {\n  pointer-events: none;\n  display: inline-flex;\n  position: absolute;\n  top: 50%;\n  right: 24px;\n  transform: translateY(-50%);\n}\n\n.qU0WNq_deviceError {\n  min-width: 0;\n  color: var(--dsw-alias-state-error-primary);\n  overflow-wrap: anywhere;\n  grid-column: 2;\n  font-size: 12px;\n}\n\n.qU0WNq_inputLevel {\n  flex: none;\n  align-items: center;\n  gap: 3px;\n  display: inline-flex;\n}\n\n.qU0WNq_inputLevel > span {\n  background: var(--dsw-alias-border-l1);\n  border-radius: 1px;\n  width: 3px;\n  height: 12px;\n}\n\n.qU0WNq_inputLevel > span[data-active=\"true\"] {\n  background: var(--dsw-alias-state-success-primary);\n}\n\n@media (width <= 480px) {\n  .qU0WNq_deviceRow, .qU0WNq_preferences label, .qU0WNq_sourceChoice label {\n    grid-template-columns: minmax(0, 1fr);\n    gap: 6px;\n  }\n\n  .qU0WNq_deviceError {\n    grid-column: 1;\n  }\n}\n";
    return module.exports;
  },
});
