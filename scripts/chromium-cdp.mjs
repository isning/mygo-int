import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { closeSync, openSync } from 'node:fs'

export async function launchChromium({ scratch, profileName, logName, interactive = false }) {
  const profile = scratch + '/' + profileName
  await mkdir(profile, { recursive: true, mode: 0o700 })
  const log = openSync(scratch + '/' + logName, 'a', 0o600)
  const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium',
    ...interactive ? [] : ['--headless', '--disable-gpu'], '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
  closeSync(log)
  return { browser, profile }
}

export async function connectChromium({ profile, until }) {
  const port = await until(async () => {
    const value = Number((await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0])
    await fetch('http://127.0.0.1:' + value + '/json/version')
    return value
  })
  const page = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' }).then(response => response.json())
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let sequence = 0
  let terminalError
  const pending = new Map(), listeners = new Set()
  const rejectPending = reason => {
    const error = reason instanceof Error ? reason : Error('Chromium DevTools connection closed')
    terminalError ??= error
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  }
  socket.addEventListener('close', () => rejectPending(Error('Chromium DevTools connection closed')))
  socket.addEventListener('error', () => rejectPending(Error('Chromium DevTools connection failed')))
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (request) message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result)
    }
    for (const listener of listeners) listener(message)
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    if (terminalError) { reject(terminalError); return }
    const id = ++sequence
    pending.set(id, { resolve, reject })
    try { socket.send(JSON.stringify({ id, method, params })) }
    catch (error) { pending.delete(id); reject(error) }
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text)
    return result.result.value
  }
  return { socket, send, evaluate, onMessage(listener) { listeners.add(listener); return () => listeners.delete(listener) } }
}
