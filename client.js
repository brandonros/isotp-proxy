const WebSocket = require('ws')
const { delay } = require('./lib/utilities')
const queue = require('./lib/queue')

const SOURCE_ARBITRATION_ID = 0x7E5
const DESTINATION_ARBITRATION_ID = 0x7ED

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
    data: message.data.toString('hex')
  })
}

const run = async () => {
  const ws = new WebSocket('ws://127.0.0.1:8080')
  await new Promise(resolve => ws.on('open', resolve))
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message)
    const arbitrationId = parsedMessage.arbitrationId
    if (arbitrationId !== DESTINATION_ARBITRATION_ID) {
      return
    }
    const data = Buffer.from(parsedMessage.data, 'hex')
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
    data: Buffer.from('01', 'hex').toString('hex')
  }))
  logMessage(await waitForResponse(0x51))
  // diag mode
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x10,
    data: Buffer.from('03', 'hex').toString('hex')
  }))
  logMessage(await waitForResponse(0x50))
  // read did 1000
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x22,
    data: Buffer.from('F100', 'hex').toString('hex')
  }))
  logMessage(await waitForResponse(0x62))
  // seed request
  ws.send(JSON.stringify({
    arbitrationId: SOURCE_ARBITRATION_ID,
    serviceId: 0x27,
    data: Buffer.from('11', 'hex').toString('hex')
  }))
  logMessage(await waitForResponse(0x67))
}

run()
