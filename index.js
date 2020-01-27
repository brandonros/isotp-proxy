const { Server } = require('ws')
const { setupDevice, transferDataIn, transferDataOut, buildFrame, parseFrame } = require('node-gs_usb')
const { buildIsoTpFrames, drainConsecutiveFrames, reconstructIsoTpFrames, waitForContinuationFrame } = require('./isotp')
const { delay, highNibble } = require('./utilities')
const queue = require('./queue')

const readLoop = async (inEndpoint, cb) => {
  const maxFrameLength = 32
  const frame = await transferDataIn(inEndpoint, maxFrameLength)
  cb(frame)
  readLoop(inEndpoint, cb)
}

const run = async () => {
  const port = 8080
  const vendorId = 0x1D50
  const deviceId = 0x606F
  const wss = new Server({
    port
  })
  const { inEndpoint, outEndpoint } = await setupDevice(vendorId, deviceId)
  const ws = await new Promise(resolve => wss.once('connection', resolve))
  ws.on('message', async (message) => {
    const { arbitrationId, payload } = message
    const frames = buildIsoTpFrames(payload)
    for (let i = 0; i < frames.length; ++i) {
      const frame = frames[i]
      await transferDataOut(outEndpoint, buildFrame(arbitrationId, frame))
      if (i === 0 && frames.length > 1) {
        await waitForContinuationFrame()
      }
      await delay(50)
    }
  })
  readLoop(inEndpoint, async (frame) => {
    const parsedFrame = parseFrame(frame)
    const { arbitrationId, payload } = parsedFrame
    queue.push(parsedFrame)
    const pci = highNibble(payload[0])
    if (pci === 0x00) { // forward single frame messages to websocket
      ws.send(JSON.stringify({
        arbitrationId,
        payload: payload.slice(1)
      }))
    } else if (pci === 0x01) { // drain multi-frame messages, then send to websocket
      const firstFrame = frame
      const controlFlowFrame = '3000000000000000'
      await transferDataOut(outEndpoint, buildFrame(arbitrationId, controlFlowFrame))
      const consecutiveFrames = await drainConsecutiveFrames(frame)
      ws.send(JSON.stringify({
        arbitrationId,
        payload: reconstructIsoTpFrames(firstFrame, consecutiveFrames)
      }))
    }
  })
}

run()
