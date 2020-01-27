const queue = []

const SOURCE_ARBITRATION_ID = 0x7E5
const DESTINATION_ARBITRATION_ID = 0x7ED

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

const hex2buf = (hex) => new Uint8Array(hex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))
const buf2hex = (buf) => Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('')

const waitForResponse = async (serviceId) => {
  let tick = 0
  const maxTicks = 100
  while (true) {
    if (tick === maxTicks) {
      throw new Error('Failed to get response in time')
    }
    const messageIndex = queue.findIndex((msg) => msg.serviceId === serviceId)
    if (messageIndex !== -1) {
      const message = queue[messageIndex]
      queue.splice(messageIndex, 1)
      return message
    }
    await delay(10)
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

const run = async () => {
  const ws = new WebSocket('ws://127.0.0.1:8080')
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
  // reset ECU
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x11,
    data: '01'
  }))
  logMessage(await waitForResponse(0x51))
  // diag mode 01
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x10,
    data: '03'
  }))
  logMessage(await waitForResponse(0x50))
  // read did 1000
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x22,
    data: 'F100'
  }))
  logMessage(await waitForResponse(0x62))
  // seed request
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x27,
    data: '11'
  }))
  logMessage(await waitForResponse(0x67))
}

run()
