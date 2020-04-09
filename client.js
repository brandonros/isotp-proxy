const WebSocket = require('ws')
const { setupDevice, transferDataIn, transferDataOut, buildFrame, parseFrame } = require('node-gs_usb')
const debug = require('debug')('isotp-proxy')
const { buildIsoTpFrames, drainConsecutiveFrames, extractIsotpPayload, waitForContinuationFrame } = require('./lib/isotp')
const { delay, highNibble } = require('./lib/utilities')
const queue = require('./lib/queue')

const FRAME_WAIT_DELAY = 10
const CONTROL_FLOW_FRAME = Buffer.from('3000000000000000', 'hex')
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
  // validate arguments
  const peerUrl = process.argv[2]
  if (!peerUrl) {
    console.error('usage: client peerUrl')
    process.exit(1)
  }
  // setup USB device
  debug('setting up device')
  const { inEndpoint, outEndpoint } = await setupDevice(VENDOR_ID, DEVICE_ID)
  debug('device setup')
  // connect to client websocket
  debug('connecting to peer')
  const ws = new WebSocket(peerUrl)
  await new Promise(resolve => ws.on('open', resolve))
  debug('connected to peer')
  // receive message from websocket, send to device
  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message)
    const arbitrationId = parsedMessage.arbitrationId
    const data = Buffer.from(parsedMessage.data, 'hex')
    debug(`wsMessage/transferDataOut: ${arbitrationId.toString(16)} ${data.toString('hex')}`)
    await transferDataOut(outEndpoint, buildFrame(arbitrationId, data))
  })
  // setup exit handler
  ws.on('close', () => {
    debug('websocket closed')
    process.exit(0)
  })
  // receive message from device, send to websocket
  readLoop(inEndpoint, async (frame) => {
    const parsedFrame = parseFrame(frame)
    const { arbitrationId, payload } = parsedFrame
    const pci = highNibble(payload[0])
    const shouldSendFrame = (arbitrationId === DESTINATION_ARBITRATION_ID && pci === 0x03) ||
      arbitrationId === SOURCE_ARBITRATION_ID
    if (!shouldSendFrame) {
      debug(`dropping frame; pci = ${pci.toString(16)} arbitrationId = ${arbitrationId.toString(16)}`)
      return
    }
    debug(`wsSend/readLoop: ${arbitrationId.toString(16)} ${payload.toString('hex')}`)
    ws.send(JSON.stringify({
      arbitrationId,
      data: payload.toString('hex')
    }))
  })
}

run()
