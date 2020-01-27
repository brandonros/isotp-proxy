const WebSocket = require('ws')
const EventEmitter = require('events')

const run = async () => {
  const emitter = new EventEmitter()
  const ws = new WebSocket('ws://127.0.0.1:8080')
  await new Promise(resolve => ws.on('open', resolve))
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message)
    const arbitrationId = parsedMessage.arbitrationId
    if (arbitrationId !== 0x7ED) {
      return
    }
    const payload = Buffer.from(parsedMessage.payload, 'hex')
    emitter.emit('message', {
      arbitrationId,
      payload: payload.toString('hex')
    })
  })
  // reset ECU
  ws.send(JSON.stringify({
    arbitrationId: 0x7E5,
    payload: Buffer.from('021101', 'hex').toString('hex')
  }))
  const resetEcuResponse = await new Promise(resolve => emitter.once('message', resolve))
  console.log(resetEcuResponse)
  // diag mode 3
  ws.send(JSON.stringify({
    arbitrationId: 0x7E5,
    payload: Buffer.from('1003', 'hex').toString('hex')
  }))
  const diagModeResponse = await new Promise(resolve => emitter.once('message', resolve))
  console.log(diagModeResponse)
  // read did 1000
  ws.send(JSON.stringify({
    arbitrationId: 0x7E5,
    payload: Buffer.from('220100', 'hex').toString('hex')
  }))
  const readDidResponse = await new Promise(resolve => emitter.once('message', resolve))
  console.log(readDidResponse)
}

run()
