#!/usr/bin/env node
'use strict';

// Run the complete application scripts with a small DOM/media boundary fixture.
// Model adapters stand in for downloads/inference; camera lifecycle functions and
// navigation/change/click handlers are the production implementations.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function until(predicate, message) {
  for (let turn = 0; turn < 40; turn++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.ok(predicate(), message);
}

class EventTargetFixture {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatchEvent(event) {
    event.target ||= this;
    this.lastReturns = (this.listeners.get(event.type) || []).map(listener => listener.call(this, event));
    return true;
  }
}

class ElementFixture extends EventTargetFixture {
  constructor(tag, document) {
    super();
    Object.assign(this, {
      tagName: tag.toUpperCase(), ownerDocument: document, attributes: {}, dataset: {},
      children: [], style: {}, className: '', hidden: false, disabled: false,
      value: '', textContent: '', parentElement: null, scrollWidth: 100,
      clientWidth: 100, scrollLeft: 0, readyState: 4, videoWidth: 640,
      videoHeight: 480, srcObject: null,
    });
    const classes = () => this.className.split(/\s+/).filter(Boolean);
    this.classList = {
      contains: value => classes().includes(value),
      add: (...values) => { this.className = [...new Set([...classes(), ...values])].join(' '); },
      remove: (...values) => { this.className = classes().filter(value => !values.includes(value)).join(' '); },
      toggle: (value, force) => {
        const selected = force === undefined ? !classes().includes(value) : force;
        if (selected) this.classList.add(value); else this.classList.remove(value);
        return selected;
      },
    };
  }
  setAttribute(name, value) {
    value = String(value);
    this.attributes[name] = value;
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name === 'hidden') this.hidden = true;
    if (name === 'disabled') this.disabled = true;
    if (name === 'value' || name === 'min') this[name] = value;
    if (name.startsWith('data-')) {
      this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) {
    this.children.forEach(child => { child.parentElement = null; });
    this.children = [];
    this.append(...children);
  }
  matches(selector) {
    if (selector.includes(':not([hidden])')) return !this.hidden && this.matches(selector.replace(':not([hidden])', ''));
    const tag = selector.match(/^[a-zA-Z][\w-]*/)?.[0];
    if (tag && tag.toUpperCase() !== this.tagName) return false;
    for (const match of selector.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(match[1])) return false;
    for (const match of selector.matchAll(/#([\w-]+)/g)) if (this.id !== match[1]) return false;
    for (const match of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (!(match[1] in this.attributes) || match[2] !== undefined && this.attributes[match[1]] !== match[2]) return false;
    }
    return true;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = node => node.children.forEach(child => {
      if (child.matches(selector)) found.push(child);
      visit(child);
    });
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  click() {
    if (this.disabled) return [];
    this.dispatchEvent({ type: 'click', target: this });
    return this.lastReturns;
  }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
  play() { return this.ownerDocument.play(this); }
}

class DocumentFixture extends EventTargetFixture {
  constructor(html) {
    super();
    this.root = new ElementFixture('document', this);
    let current = this.root;
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    for (const match of markup.matchAll(/<\/?[a-zA-Z][^>]*>/g)) {
      const token = match[0];
      if (token.startsWith('</')) {
        const tag = token.slice(2, -1).trim().toUpperCase();
        for (let node = current; node !== this.root; node = node.parentElement) {
          if (node.tagName === tag) { current = node.parentElement; break; }
        }
        continue;
      }
      const tag = token.match(/^<([\w-]+)/)[1];
      const element = this.createElement(tag);
      for (const attribute of token.matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g)) {
        if (attribute.index !== 1) element.setAttribute(attribute[1], attribute[2] ?? attribute[3] ?? '');
      }
      current.appendChild(element);
      if (!voidTags.has(tag)) current = element;
    }
    this.body = this.querySelector('body');
    this.play = async () => {};
  }
  createElement(tag) { return new ElementFixture(tag, this); }
  getElementById(id) { return this.querySelector('#' + id); }
  querySelectorAll(selector) { return this.root.querySelectorAll(selector); }
  querySelector(selector) { return this.root.querySelector(selector); }
}

function mediaStream({ facing = 'environment', zoom = null } = {}) {
  const track = {
    readyState: 'live',
    stop() { this.readyState = 'ended'; },
    getSettings: () => ({ facingMode: facing, ...(zoom ? { zoom: 1 } : {}) }),
    getCapabilities: () => zoom ? { zoom } : {},
  };
  return { track, getTracks: () => [track], getVideoTracks: () => [track] };
}

function application(options = {}) {
  const document = new DocumentFixture(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const frames = [], mediaRequests = [], prepares = [], runs = [], errors = [];
  let deviceRequests = 0;
  const window = new EventTargetFixture();
  Object.assign(window, {
    window, document, location: { href: 'https://fixture.invalid/' },
    navigator: {
      userAgent: 'Lifecycle Test Browser', hardwareConcurrency: 4,
      mediaDevices: {
        getUserMedia: constraints => {
          mediaRequests.push(constraints);
          return options.media?.(mediaRequests.length) ?? Promise.resolve(mediaStream());
        },
        enumerateDevices: () => options.devices?.(++deviceRequests) ?? Promise.resolve([]),
      },
    },
    performance, WebAssembly, URL, setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, { detail } = {}) { this.type = type; this.detail = detail; } },
    ort: { env: { wasm: {} } },
    console: { ...console, error: (...args) => errors.push(args) },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
  });
  const context = vm.createContext(window);
  const load = file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  for (const file of ['src/models/models.js', 'src/core/model-runtime.js', 'src/core/model-loader.js']) load(file);
  for (const key of ['yolox', 'tinyyolo']) {
    window.VisionRuntimeRegistry.register(key, {
      prepare: (...args) => { prepares.push({ key, args }); return options.prepare?.(key, prepares.length); },
      run: (...args) => { runs.push({ key, args }); return Promise.resolve({ infMs: 1, totalMs: 2, visible: 0 }); },
      release: async () => {}, backend: () => 'wasm', runtimeInfo: () => ({ backend: 'wasm' }), inspectionData: () => null,
    });
  }
  document.play = options.play || (async () => {});
  load('src/app.js');
  const element = id => document.getElementById(id);
  const navigate = group => document.querySelector('[data-nav-group="' + group + '"]').click();
  const start = () => {
    const returns = element('camera-start').click();
    assert.equal(returns.length, 1, 'Start camera should be available');
    return returns[0];
  };
  const chooseModel = async key => {
    const select = element('live-model-select');
    assert.equal(select.disabled, false, 'Live model selection should be available');
    select.value = key;
    select.dispatchEvent({ type: 'change', target: select });
    await Promise.all(select.lastReturns);
  };
  const frame = async () => {
    assert.ok(frames.length, 'a live frame should be queued');
    frames.shift()(performance.now());
    await until(() => runs.length > 0, 'the camera should run one inference');
  };
  const idle = () => {
    assert.equal(window.VisionLab.isCameraActive(), false);
    assert.equal(element('camera-video').srcObject, null);
    assert.equal(element('camera-stop').disabled, true);
    assert.equal(element('camera-start').disabled, false);
    assert.equal(element('live-badge').classList.contains('on'), false);
  };
  return { window, document, element, navigate, start, chooseModel, frame, idle, frames, mediaRequests, prepares, runs, errors };
}

test('ordinary camera start runs the selected model and Stop closes the track', async () => {
  const stream = mediaStream();
  const app = application({ media: async () => stream });
  app.navigate('device');
  await app.chooseModel('tinyyolo');
  await app.start();
  assert.equal(app.window.VisionLab.getActiveModel(), 'yolox', 'Time Machine keeps its independent default');
  assert.equal(app.window.VisionLab.isCameraActive(), true);
  assert.equal(app.element('camera-video').srcObject, stream);
  assert.equal(app.element('camera-stop').disabled, false);
  assert.equal(app.element('camera-start').disabled, true);
  await app.frame();
  assert.equal(app.runs[0].key, 'tinyyolo');
  app.element('camera-stop').click();
  app.idle();
  assert.equal(stream.track.readyState, 'ended');
});

test('denied camera permission restores Start and clears camera busy state', async () => {
  const app = application({ media: async () => { throw new Error('Permission denied'); } });
  app.navigate('device');
  await app.start();
  app.idle();
  assert.equal(app.errors.length, 1);
  assert.match(app.element('live-model-status').textContent, /could not start/);
});

test('video playback failure closes the acquired track and restores Start', async () => {
  const stream = mediaStream();
  const app = application({ media: async () => stream, play: async () => { throw new Error('Playback failed'); } });
  app.navigate('device');
  await app.start();
  app.idle();
  assert.equal(stream.track.readyState, 'ended');
  assert.equal(app.errors.length, 1);
});

test('pagehide closes an active camera stream', async () => {
  const stream = mediaStream();
  const app = application({ media: async () => stream });
  app.navigate('device');
  await app.start();
  app.window.dispatchEvent({ type: 'pagehide' });
  app.idle();
  assert.equal(stream.track.readyState, 'ended');
});

test('camera flip attaches the other camera while retaining the selected runtime', async () => {
  const rear = mediaStream(), front = mediaStream({ facing: 'user' });
  const app = application({
    media: async count => count === 1 ? rear : front,
    devices: async () => [{ kind: 'videoinput' }, { kind: 'videoinput' }],
  });
  app.navigate('device');
  await app.start();
  assert.equal(app.element('camera-flip').hidden, false);
  app.element('camera-flip').click();
  await until(() => app.element('live-model-status').textContent.includes('Model runtime stayed loaded'), 'camera flip should finish');
  assert.equal(app.element('camera-video').srcObject, front);
  assert.equal(rear.track.readyState, 'ended');
  assert.equal(front.track.readyState, 'live');
  assert.equal(app.prepares.length, 1, 'camera flipping should retain the model runtime');
  assert.equal(app.element('camera-flip').disabled, false);
  app.element('camera-stop').click();
  assert.equal(front.track.readyState, 'ended');
  app.idle();
});

test('camera flip failure restores the previous facing mode', async () => {
  const rear = mediaStream(), restored = mediaStream();
  const app = application({
    media: async count => {
      if (count === 2) throw new Error('Front camera unavailable');
      return count === 1 ? rear : restored;
    },
    devices: async () => [{ kind: 'videoinput' }, { kind: 'videoinput' }],
  });
  app.navigate('device');
  await app.start();
  app.element('camera-flip').click();
  await until(() => app.element('live-model-status').textContent.includes('Rear camera was restored'), 'camera rollback should finish');
  assert.equal(app.element('camera-video').srcObject, restored);
  assert.equal(rear.track.readyState, 'ended');
  assert.equal(restored.track.readyState, 'live');
  assert.equal(app.prepares.length, 1);
  app.element('camera-stop').click();
  assert.equal(restored.track.readyState, 'ended');
  app.idle();
});

test('leaving Live Camera during model preparation cancels the pending start', async () => {
  const preparation = deferred();
  const app = application({ prepare: () => preparation.promise });
  app.navigate('device');
  const starting = app.start();
  await until(() => app.prepares.length === 1, 'model preparation should start');
  app.navigate('experiment');
  preparation.resolve();
  await starting;
  assert.equal(app.mediaRequests.length, 0, 'a hidden panel must not request camera access');
  app.idle();
  assert.equal(app.runs.length, 0);
});

test('leaving Live Camera during permission acquisition stops a late stream', async () => {
  const permission = deferred(), stream = mediaStream();
  const app = application({ media: () => permission.promise });
  app.navigate('device');
  const starting = app.start();
  await until(() => app.mediaRequests.length === 1, 'camera access should be requested');
  app.navigate('experiment');
  permission.resolve(stream);
  await starting;
  assert.equal(stream.track.readyState, 'ended', 'a late permission grant must not leave the camera open');
  app.idle();
  assert.equal(app.runs.length, 0);
});

test('pagehide cancels pending camera permission immediately and disposes its late stream', async () => {
  const permission = deferred(), stream = mediaStream();
  const app = application({ media: () => permission.promise });
  app.navigate('device');
  const starting = app.start();
  await until(() => app.mediaRequests.length === 1, 'camera access should be requested');
  app.window.dispatchEvent({ type: 'pagehide' });
  app.idle();
  permission.resolve(stream);
  await starting;
  assert.equal(stream.track.readyState, 'ended');
  app.idle();
});

test('a superseded start cannot clear the busy state of a newer preparation', async () => {
  const firstPreparation = deferred(), nextPreparation = deferred();
  const app = application({ prepare: key => key === 'yolox' ? firstPreparation.promise : nextPreparation.promise });
  app.navigate('device');
  const firstStart = app.start();
  await until(() => app.prepares.length === 1, 'first model preparation should start');
  await app.chooseModel('tinyyolo');
  const nextStart = app.start();
  await until(() => app.prepares.length === 2, 'new model preparation should start');
  firstPreparation.resolve();
  await firstStart;
  assert.equal(app.window.VisionLab.isCameraActive(), true, 'the current pending start owns the busy state');
  assert.equal(app.element('camera-start').disabled, true);
  nextPreparation.resolve();
  await nextStart;
  app.element('camera-stop').click();
  app.idle();
});

test('refreshing model controls during startup keeps Start disabled', async () => {
  const preparation = deferred();
  const app = application({ prepare: () => preparation.promise });
  app.navigate('device');
  const starting = app.start();
  await until(() => app.prepares.length === 1, 'model preparation should start');
  app.window.VisionLab.refreshLiveModels();
  assert.equal(app.element('camera-start').disabled, true);
  preparation.resolve();
  await starting;
  app.element('camera-stop').click();
});

test('leaving during video.play stops the attached track before play settles', async () => {
  const playback = deferred(), stream = mediaStream();
  let playing = false;
  const app = application({ media: async () => stream, play: () => { playing = true; return playback.promise; } });
  app.navigate('device');
  const starting = app.start();
  await until(() => playing, 'video playback should be pending');
  app.navigate('experiment');
  assert.equal(stream.track.readyState, 'ended', 'navigation should stop an already attached stream immediately');
  app.idle();
  playback.resolve();
  await starting;
  app.idle();
});

for (const outcome of ['resolve', 'reject']) {
  test('a canceled video.play that later ' + outcome + 's cannot detach a newer camera', async () => {
    const playback = deferred(), oldStream = mediaStream(), nextStream = mediaStream();
    let plays = 0;
    const app = application({
      media: async count => count === 1 ? oldStream : nextStream,
      play: () => ++plays === 1 ? playback.promise : Promise.resolve(),
    });
    app.navigate('device');
    const firstStart = app.start();
    await until(() => plays === 1, 'first video playback should be pending');
    app.window.dispatchEvent({ type: 'pagehide' });
    await app.start();
    if (outcome === 'resolve') playback.resolve(); else playback.reject(new Error('stale playback failed'));
    await firstStart;
    assert.equal(app.element('camera-video').srcObject, nextStream);
    assert.equal(nextStream.track.readyState, 'live');
    assert.equal(oldStream.track.readyState, 'ended');
    assert.equal(app.window.VisionLab.isCameraActive(), true);
    app.element('camera-stop').click();
    assert.equal(nextStream.track.readyState, 'ended', 'Stop must still own the replacement stream');
    app.idle();
  });
}

test('stale device metadata cannot overwrite controls or stop a replacement stream', async () => {
  const devices = deferred();
  const oldStream = mediaStream({ facing: 'user' });
  const nextStream = mediaStream({ zoom: { min: 1, max: 3, step: 1 } });
  let enumerations = 0;
  const app = application({
    media: async count => count === 1 ? oldStream : nextStream,
    devices: () => ++enumerations === 1 ? devices.promise : Promise.resolve([{ kind: 'videoinput' }, { kind: 'videoinput' }]),
  });
  app.navigate('device');
  const firstStart = app.start();
  await until(() => enumerations === 1, 'first camera metadata should be pending');
  app.window.dispatchEvent({ type: 'pagehide' });
  await app.start();
  assert.equal(app.element('camera-flip').hidden, false);
  assert.equal(app.element('camera-zoom-controls').hidden, false);
  devices.resolve([]);
  await firstStart;
  assert.equal(app.element('camera-video').srcObject, nextStream);
  assert.equal(nextStream.track.readyState, 'live');
  assert.equal(app.element('camera-flip').hidden, false, 'current camera metadata must be retained');
  assert.equal(app.element('camera-zoom-controls').hidden, false);
  app.element('camera-stop').click();
  assert.equal(nextStream.track.readyState, 'ended');
  app.idle();
});
