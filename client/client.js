const queue = []
let ws = null

const SOURCE_ARBITRATION_ID = 0x7E5
const DESTINATION_ARBITRATION_ID = 0x7ED

const FAILURE_REASONS = {
  0x10: 'generalReject',
  0x11: 'serviceNotSupported',
  0x12: 'subFunctionNotSupported',
  0x13: 'incorrectMessageLengthOrInvalidFormat',
  0x14: 'responseTooLong',
  0x21: 'busyRepeatReques',
  0x22: 'conditionsNotCorrect',
  0x24: 'requestSequenceError',
  0x31: 'requestOutOfRange',
  0x33: 'securityAccessDenied',
  0x35: 'invalidKey',
  0x36: 'exceedNumberOfAttempts',
  0x37: 'requiredTimeDelayNotExpired',
  0x38: 'reservedByExtendedDataLinkSecurityDocument',
  0x39: 'reservedByExtendedDataLinkSecurityDocument',
  0x3A: 'reservedByExtendedDataLinkSecurityDocument',
  0x3B: 'reservedByExtendedDataLinkSecurityDocument',
  0x3C: 'reservedByExtendedDataLinkSecurityDocument',
  0x3D: 'reservedByExtendedDataLinkSecurityDocument',
  0x3E: 'reservedByExtendedDataLinkSecurityDocument',
  0x3F: 'reservedByExtendedDataLinkSecurityDocument',
  0x40: 'reservedByExtendedDataLinkSecurityDocument',
  0x41: 'reservedByExtendedDataLinkSecurityDocument',
  0x42: 'reservedByExtendedDataLinkSecurityDocument',
  0x43: 'reservedByExtendedDataLinkSecurityDocument',
  0x44: 'reservedByExtendedDataLinkSecurityDocument',
  0x45: 'reservedByExtendedDataLinkSecurityDocument',
  0x46: 'reservedByExtendedDataLinkSecurityDocument',
  0x47: 'reservedByExtendedDataLinkSecurityDocument',
  0x48: 'reservedByExtendedDataLinkSecurityDocument',
  0x49: 'reservedByExtendedDataLinkSecurityDocument',
  0x4A: 'reservedByExtendedDataLinkSecurityDocument',
  0x4B: 'reservedByExtendedDataLinkSecurityDocument',
  0x4C: 'reservedByExtendedDataLinkSecurityDocument',
  0x4D: 'reservedByExtendedDataLinkSecurityDocument',
  0x4E: 'reservedByExtendedDataLinkSecurityDocument',
  0x4F: 'reservedByExtendedDataLinkSecurityDocument',
  0x70: 'uploadDownloadNotAccepted',
  0x71: 'transferDataSuspended',
  0x72: 'generalProgrammingFailure',
  0x73: 'wrongBlockSequenceCounter',
  0x78: 'requestCorrectlyReceived-ResponsePending',
  0x7E: 'subFunctionNotSupportedInActiveSession',
  0x7F: 'serviceNotSupportedInActiveSession',
  0x81: 'rpmTooHigh',
  0x82: 'rpmTooLow',
  0x83: 'engineIsRunning',
  0x84: 'engineIsNotRunning',
  0x85: 'engineRunTimeTooLow',
  0x86: 'temperatureTooHigh',
  0x87: 'temperatureTooLow',
  0x88: 'vehicleSpeedTooHigh',
  0x89: 'vehicleSpeedTooLow',
  0x8A: 'throttle/PedalTooHigh',
  0x8B: 'throttle/PedalTooLow',
  0x8C: 'transmissionRangeNotInNeutral',
  0x8D: 'transmissionRangeNotInGear',
  0x8F: 'brakeSwitch(es)NotClosed (Brake Pedal not pressed or not applied)',
  0x90: 'shifterLeverNotInPark',
  0x91: 'torqueConverterClutchLocked',
  0x92: 'voltageTooHigh',
  0x93: 'voltageTooLow',
  0x94: 'reservedForSpecificConditionsNotCorrect',
  0x95: 'reservedForSpecificConditionsNotCorrect',
  0x96: 'reservedForSpecificConditionsNotCorrect',
  0x97: 'reservedForSpecificConditionsNotCorrect',
  0x98: 'reservedForSpecificConditionsNotCorrect',
  0x99: 'reservedForSpecificConditionsNotCorrect',
  0x9A: 'reservedForSpecificConditionsNotCorrect',
  0x9B: 'reservedForSpecificConditionsNotCorrect',
  0x9C: 'reservedForSpecificConditionsNotCorrect',
  0x9D: 'reservedForSpecificConditionsNotCorrect',
  0x9E: 'reservedForSpecificConditionsNotCorrect',
  0x9F: 'reservedForSpecificConditionsNotCorrect',
  0xA0: 'reservedForSpecificConditionsNotCorrect',
  0xA1: 'reservedForSpecificConditionsNotCorrect',
  0xA2: 'reservedForSpecificConditionsNotCorrect',
  0xA3: 'reservedForSpecificConditionsNotCorrect',
  0xA4: 'reservedForSpecificConditionsNotCorrect',
  0xA5: 'reservedForSpecificConditionsNotCorrect',
  0xA6: 'reservedForSpecificConditionsNotCorrect',
  0xA7: 'reservedForSpecificConditionsNotCorrect',
  0xA8: 'reservedForSpecificConditionsNotCorrect',
  0xA9: 'reservedForSpecificConditionsNotCorrect',
  0xAA: 'reservedForSpecificConditionsNotCorrect',
  0xAB: 'reservedForSpecificConditionsNotCorrect',
  0xAC: 'reservedForSpecificConditionsNotCorrect',
  0xAD: 'reservedForSpecificConditionsNotCorrect',
  0xAE: 'reservedForSpecificConditionsNotCorrect',
  0xAF: 'reservedForSpecificConditionsNotCorrect',
  0xB0: 'reservedForSpecificConditionsNotCorrect',
  0xB1: 'reservedForSpecificConditionsNotCorrect',
  0xB2: 'reservedForSpecificConditionsNotCorrect',
  0xB3: 'reservedForSpecificConditionsNotCorrect',
  0xB4: 'reservedForSpecificConditionsNotCorrect',
  0xB5: 'reservedForSpecificConditionsNotCorrect',
  0xB6: 'reservedForSpecificConditionsNotCorrect',
  0xB7: 'reservedForSpecificConditionsNotCorrect',
  0xB8: 'reservedForSpecificConditionsNotCorrect',
  0xB9: 'reservedForSpecificConditionsNotCorrect',
  0xBA: 'reservedForSpecificConditionsNotCorrect',
  0xBB: 'reservedForSpecificConditionsNotCorrect',
  0xBC: 'reservedForSpecificConditionsNotCorrect',
  0xBD: 'reservedForSpecificConditionsNotCorrect',
  0xBE: 'reservedForSpecificConditionsNotCorrect',
  0xBF: 'reservedForSpecificConditionsNotCorrect',
  0xC0: 'reservedForSpecificConditionsNotCorrect',
  0xC1: 'reservedForSpecificConditionsNotCorrect',
  0xC2: 'reservedForSpecificConditionsNotCorrect',
  0xC3: 'reservedForSpecificConditionsNotCorrect',
  0xC4: 'reservedForSpecificConditionsNotCorrect',
  0xC5: 'reservedForSpecificConditionsNotCorrect',
  0xC6: 'reservedForSpecificConditionsNotCorrect',
  0xC7: 'reservedForSpecificConditionsNotCorrect',
  0xC8: 'reservedForSpecificConditionsNotCorrect',
  0xC9: 'reservedForSpecificConditionsNotCorrect',
  0xCA: 'reservedForSpecificConditionsNotCorrect',
  0xCB: 'reservedForSpecificConditionsNotCorrect',
  0xCC: 'reservedForSpecificConditionsNotCorrect',
  0xCD: 'reservedForSpecificConditionsNotCorrect',
  0xCE: 'reservedForSpecificConditionsNotCorrect',
  0xCF: 'reservedForSpecificConditionsNotCorrect',
  0xD0: 'reservedForSpecificConditionsNotCorrect',
  0xD1: 'reservedForSpecificConditionsNotCorrect',
  0xD2: 'reservedForSpecificConditionsNotCorrect',
  0xD3: 'reservedForSpecificConditionsNotCorrect',
  0xD4: 'reservedForSpecificConditionsNotCorrect',
  0xD5: 'reservedForSpecificConditionsNotCorrect',
  0xD6: 'reservedForSpecificConditionsNotCorrect',
  0xD7: 'reservedForSpecificConditionsNotCorrect',
  0xD8: 'reservedForSpecificConditionsNotCorrect',
  0xD9: 'reservedForSpecificConditionsNotCorrect',
  0xDA: 'reservedForSpecificConditionsNotCorrect',
  0xDB: 'reservedForSpecificConditionsNotCorrect',
  0xDC: 'reservedForSpecificConditionsNotCorrect',
  0xDD: 'reservedForSpecificConditionsNotCorrect',
  0xDE: 'reservedForSpecificConditionsNotCorrect',
  0xDF: 'reservedForSpecificConditionsNotCorrect',
  0xE0: 'reservedForSpecificConditionsNotCorrect',
  0xE1: 'reservedForSpecificConditionsNotCorrect',
  0xE2: 'reservedForSpecificConditionsNotCorrect',
  0xE3: 'reservedForSpecificConditionsNotCorrect',
  0xE4: 'reservedForSpecificConditionsNotCorrect',
  0xE5: 'reservedForSpecificConditionsNotCorrect',
  0xE6: 'reservedForSpecificConditionsNotCorrect',
  0xE7: 'reservedForSpecificConditionsNotCorrect',
  0xE8: 'reservedForSpecificConditionsNotCorrect',
  0xE9: 'reservedForSpecificConditionsNotCorrect',
  0xEA: 'reservedForSpecificConditionsNotCorrect',
  0xEB: 'reservedForSpecificConditionsNotCorrect',
  0xEC: 'reservedForSpecificConditionsNotCorrect',
  0xED: 'reservedForSpecificConditionsNotCorrect',
  0xEE: 'reservedForSpecificConditionsNotCorrect',
  0xEF: 'reservedForSpecificConditionsNotCorrect',
  0xF0: 'reservedForSpecificConditionsNotCorrect',
  0xF1: 'reservedForSpecificConditionsNotCorrect',
  0xF2: 'reservedForSpecificConditionsNotCorrect',
  0xF3: 'reservedForSpecificConditionsNotCorrect',
  0xF4: 'reservedForSpecificConditionsNotCorrect',
  0xF5: 'reservedForSpecificConditionsNotCorrect',
  0xF6: 'reservedForSpecificConditionsNotCorrect',
  0xF7: 'reservedForSpecificConditionsNotCorrect',
  0xF8: 'reservedForSpecificConditionsNotCorrect',
  0xF9: 'reservedForSpecificConditionsNotCorrect',
  0xFA: 'reservedForSpecificConditionsNotCorrect',
  0xFB: 'reservedForSpecificConditionsNotCorrect',
  0xFC: 'reservedForSpecificConditionsNotCorrect',
  0xFD: 'reservedForSpecificConditionsNotCorrect',
  0xFE: 'reservedForSpecificConditionsNotCorrect'
}

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

const hex2buf = (hex) => new Uint8Array(hex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))
const buf2hex = (buf) => Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('')

const waitForResponse = async (serviceId) => {
  let tick = 0
  const maxTicks = 25
  while (true) {
    if (tick === maxTicks) {
      console.log(queue)
      throw new Error('Failed to get response in time')
    }
    const messageIndex = queue.findIndex((msg) => msg.serviceId === serviceId)
    if (messageIndex !== -1) {
      const message = queue[messageIndex]
      queue.splice(messageIndex, 1)
      return message
    }
    await delay(100)
    tick += 1
  }
}

const logMessage = (message) => {
  console.log({
    arbitrationId: message.arbitrationId.toString(16),
    serviceId: message.serviceId.toString(16),
    data: buf2hex(message.data.buffer)
  })
}

const hardReset = async (level) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x11,
    data: buf2hex(new Uint8Array([level]))
  }
  ws.send(JSON.stringify(message))
  console.log(`> 11 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const startDiagnosticSession = async (level) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x10,
    data: buf2hex(new Uint8Array([level]))
  }
  ws.send(JSON.stringify(message))
  console.log(`> 10 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const readDid = async (did) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x22,
    data: buf2hex(new Uint8Array([did >> 8, did & 0xFF]))
  }
  ws.send(JSON.stringify(message))
  console.log(`> 22 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const requestSeed = async (level) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x27,
    data: buf2hex(new Uint8Array([level]))
  }
  ws.send(JSON.stringify(message))
  console.log(`> 27 ${message.data}`)
  const response = await waitForResponse(message.serviceId + 0x40)
  return response.data.slice(1)
}

const sendKey = async (level, key) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x27,
    data: `${level.toString(16).padStart(2, '0')}${key}`
  }
  ws.send(JSON.stringify(message))
  console.log(`> 27 ${message.data}`)
  const response = await waitForResponse(message.serviceId + 0x40)
  if (response.data[0] !== level) {
    throw new Error('sendKey failed')
  }
}

const requestDownload = async (data) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x34,
    data
  }
  ws.send(JSON.stringify(message))
  console.log(`> 34 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const requestUpload = async (data) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x35,
    data
  }
  ws.send(JSON.stringify(message))
  console.log(`> 35 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const activateRoutine = async (data) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x31,
    data
  }
  ws.send(JSON.stringify(message))
  console.log(`> 31 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const eraseMemory = async (region) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x31,
    data: `01ff00${region}`
  }
  ws.send(JSON.stringify(message))
  console.log(`> 31 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const controlDtcSettings = async (mode) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x85,
    data: buf2hex(new Uint8Array([mode]))
  }
  ws.send(JSON.stringify(message))
  console.log(`> 85 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const communicationControl = async (value) => {
  const message = {
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x28,
    data: buf2hex(new Uint8Array([value >> 8, value & 0xFF]))
  }
  ws.send(JSON.stringify(message))
  console.log(`> 28 ${message.data}`)
  logMessage(await waitForResponse(message.serviceId + 0x40))
}

const calculateKey = async (level, seed) => {
  const response = await fetch(`http://184.73.139.8:5000/key/${level}/${seed}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      seed
    })
  })
  if (response.status !== 200) {
    throw new Error('Failed to calculate key')
  }
  const responseBody = await response.json()
  return responseBody.key
}

const init = async () => {
  ws = new WebSocket('ws://127.0.0.1:8080')
  await new Promise(resolve => ws.addEventListener('open', resolve))
  ws.addEventListener('message', (message) => {
    const parsedMessage = JSON.parse(message.data)
    const arbitrationId = parsedMessage.arbitrationId
    if (arbitrationId !== DESTINATION_ARBITRATION_ID) {
      return
    }
    const data = hex2buf(parsedMessage.data)
    const serviceId = parsedMessage.serviceId
    queue.push({
      arbitrationId,
      serviceId,
      data
    })
  })
}

const run = async () => {
  await hardReset(0x01)
  await startDiagnosticSession(0x02)
  const seed = await requestSeed(0x11)
  const key = await calculateKey(buf2hex(seed))
  await sendKey(0x12, key)
  await controlDtcSettings(0x81)
  //await communicationControl(0x0015)
  await activateRoutine('82ff0500') // controlFailSafeReactionsStopFunc
  await activateRoutine('820204') // controlFailSafeReactions2StopFunc
  await activateRoutine('82020400') // controlFailSafeReactions3StopFunc
  await activateRoutine('820206') // prepareVehicleSystemsForReprogrammingStopFunc
  await eraseMemory('0100')
  const compession = '1'
  const addressLength = '4'
  const sizeLength = '4'
  const address = '80018000'
  const size = '0005FC00'
  await requestDownload(`${compession}0${addressLength}${sizeLength}${address}${size}`)
}

init()
