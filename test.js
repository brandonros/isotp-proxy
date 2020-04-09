const { Server } = require('ws')
const { setupDevice, transferDataIn, transferDataOut, buildFrame, parseFrame } = require('node-gs_usb')
const debug = require('debug')('isotp-proxy')
const { buildIsoTpFrames, drainConsecutiveFrames, extractIsotpPayload, waitForContinuationFrame } = require('./lib/isotp')
const { delay, highNibble } = require('./lib/utilities')
const queue = require('./lib/queue')

const FRAME_WAIT_DELAY = 10
const CONTROL_FLOW_FRAME = Buffer.from('3000000000000000', 'hex')
const PORT = 8080
const VENDOR_ID = 0x1D50
const DEVICE_ID = 0x606F
const SOURCE_ARBITRATION_ID = 0x7E5
const DESTINATION_ARBITRATION_ID = 0x7ED

let ws = null

const readLoop = async (inEndpoint, cb) => {
  const maxFrameLength = 32
  const frame = await transferDataIn(inEndpoint, maxFrameLength)
  cb(frame)
  readLoop(inEndpoint, cb)
}

const run = async () => {
  // setup USB device
  const { inEndpoint, outEndpoint } = await setupDevice(VENDOR_ID, DEVICE_ID)
  readLoop(inEndpoint, async (frame) => {
    console.log(frame)
    const { arbitrationId, payload } = parseFrame(frame)
    // skip error frames
    if (arbitrationId === 0x20000004 || arbitrationId === 0x2000000c) {
      return
    }
    if (arbitrationId === 0x7E0) { // ECU broadcast
      if (payload[1] === 0x01) { // service 1 (show current data)
        if (payload[2] === 0x00) { // PID 0 = PIDs supported
          await transferDataOut(outEndpoint, buildFrame(0x7E8, Buffer.from('064100bf9ca893aa', 'hex')))
        } else if (payload[2] === 0x02) { // PID 2 = Freeze DTC

        } else if (payload[2] === 0x0C) { // PID 0C = RPM
          await transferDataOut(outEndpoint, buildFrame(0x7E8, Buffer.from('04410C1213aaaaaa', 'hex')))
        } else {
          console.log(payload[2].toString(16))
        }
      }
    }
  })
}

run()
