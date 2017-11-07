const util = require('util');
/* file for safely encoding into base64 format*/
export function encode (input) {
  var binInput;
  if (Buffer.isBuffer(input)) {
    binInput = input;
  } else if (typeof input === typeof('')) {
    binInput = new Buffer(input, 'utf8');
  } else {
    throw new Error("Expected string of buffer, instead got `" + typeof(input) + "`");
  }
  return binInput.toString('base64');
};
