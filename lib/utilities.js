const highNibble = (b) => (((b) >> 4) & 0x0F)
const lowNibble = (b) => ((b) & 0x0F)
const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

module.exports = {
  highNibble,
  lowNibble,
  delay
}
