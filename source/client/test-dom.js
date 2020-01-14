const jsdom = require('jsdom')
const { JSDOM } = jsdom
const { window } = new JSDOM(`
  <!DOCTYPE html>
  <html lang="en">
    <body></body>  
  </html>
`)

function copyProps (src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target)
  })
}

global.window = window
global.document = window.document
global.navigator = {
  userAgent: 'node.js'
}
global.requestAnimationFrame = function (callback) {
  return setTimeout(callback, 0)
}
global.cancelAnimationFrame = function (id) {
  clearTimeout(id)
}
copyProps(window, global)
