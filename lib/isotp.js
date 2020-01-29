const { delay, lowNibble, highNibble } = require('./utilities')
const queue = require('./queue')

const FIRST_FRAME_PCI_BYTE = 0x01
const CONSECUTIVE_FRAME_PCI_BYTE = 0x02
const FIRST_FRAME_DATA_LENGTH = 5
const CONSECUTIVE_FRAME_DATA_LENGTH = 7
const SINGLE_FRAME_DATA_LENGTH = 8
const PADDING_BYTE = 0x55
const FRAME_WAIT_DELAY = 10
const CONSECUTIVE_FRAME_TIMEOUT = 50

const buildFirstFrame = (serviceId, data) => {
  const responseLength = data.length + 1 // add a byte for response SID
  const firstFrameData = data.slice(0, FIRST_FRAME_DATA_LENGTH)
  const firstFrameHeader = Buffer.from([
    (FIRST_FRAME_PCI_BYTE << 4) ^ (responseLength >> 8),
    responseLength & 0xFF,
    serviceId
  ])
  return Buffer.concat([
    firstFrameHeader,
    firstFrameData
  ])
}

const buildConsecutiveFrame = (consecutiveFrameCounter, remainingData) => {
  let frameData = remainingData.slice(0, CONSECUTIVE_FRAME_DATA_LENGTH)
  // Pad last frame
  if (frameData.length < CONSECUTIVE_FRAME_DATA_LENGTH) {
    const paddingLength = 7 - frameData.length
    const padding = Buffer.from(new Array(paddingLength).fill(PADDING_BYTE))
    frameData = Buffer.concat([frameData, padding])
  }
  const consecutiveFrameHeader = Buffer.from([
    (CONSECUTIVE_FRAME_PCI_BYTE << 4) ^ consecutiveFrameCounter
  ])
  return Buffer.concat([
    consecutiveFrameHeader,
    frameData
  ])
}

const buildSingleFrame = (serviceId, data) => {
  const frame = [data.length + 1, serviceId]
  for (let i = 0; i < data.length; ++i) {
    frame[i + 2] = data[i]
  }
  for (let i = frame.length; i < SINGLE_FRAME_DATA_LENGTH; ++i) {
    frame.push(PADDING_BYTE)
  }
  return Buffer.from(frame)
}

const buildIsoTpFrames = (serviceId, data) => {
  if (data.length < 8) {
    return [buildSingleFrame(serviceId, data)]
  }
  const frames = []
  frames.push(buildFirstFrame(serviceId, data))
  let remainingData = data.slice(FIRST_FRAME_DATA_LENGTH)
  const numConsecutiveFrames = Math.ceil(remainingData.length / CONSECUTIVE_FRAME_DATA_LENGTH)
  let consecutiveFrameCounter = 1
  for (let i = 0; i < numConsecutiveFrames; ++i) {
    frames.push(buildConsecutiveFrame(consecutiveFrameCounter, remainingData))
    consecutiveFrameCounter += 1
    // Wrap consecutive frame counter
    if (consecutiveFrameCounter === 10) {
      consecutiveFrameCounter = 0
    }
    remainingData = remainingData.slice(CONSECUTIVE_FRAME_DATA_LENGTH)
  }
  return frames
}

const waitForContinuationFrame = async () => {
  while (true) {
    const continuationFrameIndex = queue.findIndex((msg) => msg[0] === 0x30)
    if (continuationFrameIndex !== -1) {
      // console.log('Got continuation frame')
      queue.splice(continuationFrameIndex, 1)
      return
    }
    await delay(FRAME_WAIT_DELAY)
  }
}

const waitForConsecutiveFrame = async (sequenceNumber) => {
  let tick = 0
  const maxTicks = Math.ceil(CONSECUTIVE_FRAME_TIMEOUT / FRAME_WAIT_DELAY)
  while (true) {
    if (tick === maxTicks) {
      console.log(`Failed waiting for consecutive frame 0x${sequenceNumber.toString(16)} after ${tick} ${FRAME_WAIT_DELAY}ms ticks`)
      throw new Error(`Consecutive frame SN ${sequenceNumber.toString(16)} took too long`)
    }
    const consecutiveFrameIndex = queue.findIndex((msg) => msg[0] === sequenceNumber)
    if (consecutiveFrameIndex !== -1) {
      const frame = queue[consecutiveFrameIndex]
      queue.splice(consecutiveFrameIndex, 1)
      return frame
    }
    await delay(FRAME_WAIT_DELAY)
    tick += 1
  }
}

const drainConsecutiveFrames = async (firstFrame) => {
  const pci = highNibble(firstFrame[0])
  if (pci !== 0x01) {
    throw new Error('Did not get valid first frame')
  }
  const expectedSize = (lowNibble(firstFrame[0]) << 8) + firstFrame[1]
  let expectedSequenceNumber = 0x21
  let bytesReceived = 6
  const frames = []
  while (bytesReceived < expectedSize) {
    const frame = await waitForConsecutiveFrame(expectedSequenceNumber)
    bytesReceived += 7
    frames.push(frame)
    expectedSequenceNumber++
    if (expectedSequenceNumber === 0x30) {
      expectedSequenceNumber = 0x20
    }
  }
  // TODO: sort frames?
  return frames
}

const extractIsotpPayload = (firstFrame, consecutiveFrames) => {
  const expectedSize = (lowNibble(firstFrame[0]) << 8) + firstFrame[1]
  const output = []
  for (let i = 2; i < firstFrame.length; ++i) {
    output.push(firstFrame[i])
  }
  consecutiveFrames.forEach(frame => {
    for (let i = 1; i < frame.length; ++i) {
      output.push(frame[i])
    }
  })
  return Buffer.from(output.slice(0, expectedSize))
}

module.exports = {
  buildIsoTpFrames,
  waitForContinuationFrame,
  drainConsecutiveFrames,
  extractIsotpPayload
}
