const { Server } = require('ws')
const { setupDevice, transferDataIn, transferDataOut, buildFrame, parseFrame } = require('node-gs_usb')
const debug = require('debug')('isotp-proxy')
const { buildIsoTpFrames, drainConsecutiveFrames, extractIsotpPayload, waitForContinuationFrame } = require('./lib/isotp')
const { delay, highNibble } = require('./lib/utilities')
const queue = require('./lib/queue')

const CONTROL_FLOW_FRAME = Buffer.from('3000000000000000', 'hex')
const PORT = 8080
const VENDOR_ID = 0x1D50
const DEVICE_ID = 0x606F
const SOURCE_ARBITRATION_ID = 0x7E5
const DESTINATION_ARBITRATION_ID = 0x7ED

const readLoop = async (inEndpoint, cb) => {
  const maxFrameLength = 32
  const frame = await transferDataIn(inEndpoint, maxFrameLength)
  cb(frame)
  readLoop(inEndpoint, cb)
}

const run = async () => {
  // setup USB device
  const { inEndpoint, outEndpoint } = await setupDevice(VENDOR_ID, DEVICE_ID)
  // setup websocket server
  const wss = new Server({ port: PORT })
  // get one and only one websocket server connection
  const ws = await new Promise(resolve => wss.once('connection', resolve))
  // receive message from websocket, send to device
  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message)
    const arbitrationId = parsedMessage.arbitrationId
    const payload = Buffer.from(parsedMessage.payload, 'hex')
    const responseSid = payload[0]
    const data = payload.slice(1)
    const frames = buildIsoTpFrames(responseSid, data)
    for (let i = 0; i < frames.length; ++i) {
      const frame = frames[i]
      debug(`transferDataOut: ${frame.toString('hex')}`)
      await transferDataOut(outEndpoint, buildFrame(arbitrationId, frame))
      if (i === 0 && frames.length > 1) {
        await waitForContinuationFrame()
      }
      await delay(50)
    }
  })
  // setup exit handler
  ws.on('close', () => {
    process.exit(0)
  })
  // receive message from device, send to websocket
  readLoop(inEndpoint, async (frame) => {
    const parsedFrame = parseFrame(frame)
    const { arbitrationId, payload } = parsedFrame
    if (arbitrationId !== DESTINATION_ARBITRATION_ID) {
      return
    }
    debug(`readLoop: ${payload.toString('hex')}`)
    const pci = highNibble(payload[0])
    if (pci === 0x00) { // forward single frame messages to websocket
      const length = payload[0]
      ws.send(JSON.stringify({
        arbitrationId,
        payload: payload.slice(1, length + 1).toString('hex')
      }))
    } else if (pci === 0x01) { // drain multi-frame messages, then reconstruct + send to websocket
      const firstFrame = payload
      debug(`transferDataOut: ${CONTROL_FLOW_FRAME.toString('hex')}`)
      await transferDataOut(outEndpoint, buildFrame(SOURCE_ARBITRATION_ID, CONTROL_FLOW_FRAME))
      const consecutiveFrames = await drainConsecutiveFrames(payload)
      ws.send(JSON.stringify({
        arbitrationId,
        payload: extractIsotpPayload(firstFrame, consecutiveFrames).toString('hex')
      }))
    } else {
      queue.push(payload)
    }
  })
}

run()
