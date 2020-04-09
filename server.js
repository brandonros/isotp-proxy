const WebSocket = require('ws')
const { setupDevice, transferDataIn, transferDataOut, buildFrame, parseFrame } = require('node-gs_usb')
const debug = require('debug')('isotp-proxy')
const ngrok = require('ngrok')
const { buildIsoTpFrames, drainConsecutiveFrames, extractIsotpPayload, waitForContinuationFrame } = require('./lib/isotp')
const { delay, highNibble } = require('./lib/utilities')
const queue = require('./lib/queue')

const FRAME_WAIT_DELAY = 10
const CONTROL_FLOW_FRAME = Buffer.from('3000000000000000', 'hex')
const VENDOR_ID = 0x1D50
const DEVICE_ID = 0x606F
const PORT = 8080
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
  if (!process.env.NGROK_AUTH_TOKEN) {
    console.error('usage: NGROK_AUTH_TOKEN=... server')
    process.exit(1)
  }
  // setup USB device
  debug('setting up device')
  const { inEndpoint, outEndpoint } = await setupDevice(VENDOR_ID, DEVICE_ID)
  debug('device setup')
  // setup websocket server
  const wss = new WebSocket.Server({ port: PORT })
    // setup ngrok
  await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN)
  const tunnelUrl = await ngrok.connect(PORT)
  console.log(`server live on: ${tunnelUrl.replace('https://', 'wss://')}`)
  // get one and only one websocket server connection
  debug('waiting for websocket connection')
  const ws = await new Promise(resolve => wss.once('connection', resolve))
  debug('websocket connected')
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
    const shouldSendFrame = arbitrationId === DESTINATION_ARBITRATION_ID
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
