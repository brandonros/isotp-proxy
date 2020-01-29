const { buildIsoTpFrames, extractIsotpPayload } = require('../lib/isotp')

describe('isotp', () => {
  describe('buildIsoTpFrames', () => {
    it('should convert message into 8 byte CAN frames (single frame)', () => {
      const responseSid = 0x3E
      const data = Buffer.from([0x00])
      const frames = buildIsoTpFrames(responseSid, data)
      expect(frames.length).toEqual(1)
      expect(frames[0].toString('hex')).toEqual('023e00aaaaaaaaaa')
    })

    it('should convert message into 8 byte CAN frames (multi-frame)', () => {
      const responseSid = 0x22
      const data = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A])
      const frames = buildIsoTpFrames(responseSid, data)
      expect(frames.length).toEqual(2)
      expect(frames[0].toString('hex')).toEqual('100b220102030405')
      expect(frames[1].toString('hex')).toEqual('21060708090aaaaa')
    })
  })

  describe('extractIsotpPayload', () => {
    it('should extract payload split across frames', () => {
      const firstFrame = [0x10, 0x67, 0x62, 0x10, 0x00, 0x43, 0x50, 0x43]
      const consecutiveFrames = [
        [0x21, 0x5F, 0x4E, 0x47, 0x2D, 0x31, 0x36, 0x42],
        [0x22, 0x2D, 0x4D, 0x43, 0x31, 0x38, 0x33, 0x37],
        [0x23, 0x59, 0x31, 0x5F, 0x53, 0x57, 0x30, 0x31],
        [0x24, 0x2D, 0x32, 0x31, 0x33, 0x2D, 0x4D, 0x31],
        [0x25, 0x37, 0x37, 0x5F, 0x44, 0x45, 0x48, 0x4C],
        [0x26, 0x41, 0x34, 0x30, 0x5F, 0x55, 0x53, 0x41],
        [0x27, 0x2D, 0x4D, 0x45, 0x31, 0x37, 0x32, 0x32],
        [0x28, 0x30, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x29, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x2A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x2B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x2C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x2D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x2E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xAA]
      ]
      expect(extractIsotpPayload(firstFrame, consecutiveFrames).toString('hex')).toEqual('6210004350435f4e472d3136422d4d433138333759315f535730312d3231332d4d3137375f4445484c4134305f5553412d4d4531373232303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')
    })

    it('should extract payload split across frames', () => {
      const firstFrame = Buffer.from('100B340044800200', 'hex')
      const consecutiveFrames = [
        Buffer.from('2100001446000000', 'hex')
      ]
      expect(extractIsotpPayload(firstFrame, consecutiveFrames).toString('hex')).toEqual('6210004350435f4e472d3136422d4d433138333759315f535730312d3231332d4d3137375f4445484c4134305f5553412d4d4531373232303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')
    })
  })
})
