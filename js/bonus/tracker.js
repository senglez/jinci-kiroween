// Webcam + MediaPipe Hand Landmarker, loaded lazily from the vendored files.
// Frames never leave this module except as landmark coordinates passed to `onFrame`;
// nothing is uploaded, stored, or logged. Spec: gesture-bonus-level, Requirements 2, 3, 8.

const VENDOR = new URL('../../vendor/mediapipe/', import.meta.url);

export class TrackerError extends Error {
  // code: nocameraapi | denied | nocamera | busy | unsupported | loadfailed
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

function cameraError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new TrackerError('denied', err);
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new TrackerError('nocamera', err);
    case 'NotReadableError':
    case 'AbortError':
      return new TrackerError('busy', err);
    default:
      return new TrackerError('nocamera', err);
  }
}

let landmarkerPromise = null; // the model is loaded once per page and reused

async function loadLandmarker() {
  let vision;
  try {
    vision = await import(new URL('vision_bundle.mjs', VENDOR).href);
  } catch (e) {
    throw new TrackerError('loadfailed', e);
  }
  const { FilesetResolver, HandLandmarker } = vision;
  if (typeof WebAssembly !== 'object' || !(await FilesetResolver.isSimdSupported())) {
    throw new TrackerError('unsupported');
  }
  const fileset = await FilesetResolver.forVisionTasks(new URL('wasm', VENDOR).href.replace(/\/$/, ''));
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: new URL('hand_landmarker.task', VENDOR).href, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  try {
    return await HandLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    try {
      return await HandLandmarker.createFromOptions(fileset, options('CPU'));
    } catch (e) {
      throw new TrackerError('loadfailed', e);
    }
  }
}

export function preloadLandmarker() {
  landmarkerPromise ??= loadLandmarker().catch((e) => {
    landmarkerPromise = null; // allow a retry later
    throw e;
  });
  return landmarkerPromise;
}

export class HandTracker {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.running = false;
    this.fps = 0;
  }

  // Asks for the camera, loads the model, then calls onFrame({ landmarks, t }) for every
  // new video frame. `landmarks` is an array of 21 {x, y, z} points or null (no hand).
  async start(onFrame, onStatus = () => {}) {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new TrackerError('nocameraapi');
    onStatus('camera');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e) {
      throw cameraError(e);
    }
    try {
      this.video.srcObject = this.stream;
      await this.video.play();
      onStatus('model');
      this.landmarker = await preloadLandmarker();
    } catch (e) {
      this.stop();
      throw e instanceof TrackerError ? e : new TrackerError('loadfailed', e);
    }
    if (!this.stream) return; // stop() was called while loading
    this.running = true;
    let lastVideoTime = -1;
    let frames = 0;
    let fpsSince = performance.now();
    const tick = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      const v = this.video;
      if (v.readyState < 2 || v.currentTime === lastVideoTime) return;
      lastVideoTime = v.currentTime;
      const now = performance.now();
      let landmarks = null;
      try {
        landmarks = this.landmarker.detectForVideo(v, now).landmarks?.[0] ?? null;
      } catch { /* a dropped frame is not fatal */ }
      frames++;
      if (now - fpsSince >= 1000) {
        this.fps = (frames * 1000) / (now - fpsSince);
        frames = 0;
        fpsSince = now;
      }
      onFrame({ landmarks, t: now });
    };
    this.raf = requestAnimationFrame(tick);
  }

  // Stops every camera track. Safe to call any number of times (Req 2.5).
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
  }

  isOn() {
    return !!this.stream;
  }
}
