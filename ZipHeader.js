const Constants = require('./Constants')

function loadHeaderFromBinary(data) {
  // data should be 22 bytes and start with "PK 05 06"
  if (
    data.length !== Constants.ENDHDR ||
    data.readUInt32LE(0) !== Constants.ENDSIG
  )
    throw new Error("INVALID_END");

  // number of entries on this volume
  let volumeEntries = data.readUInt16LE(Constants.ENDSUB);
  // total number of entries
  let _totalEntries = data.readUInt16LE(Constants.ENDTOT);
  // central directory size in bytes
  let _size = data.readUInt32LE(Constants.ENDSIZ);
  // offset of first CEN header
  let offset = data.readUInt32LE(Constants.ENDOFF);
  // zip file comment length
  let commentLength = data.readUInt16LE(Constants.ENDCOM);

  return {
    volumeEntries,
    _totalEntries,
    _size,
    offset,
    commentLength
  };
}

function parseHeader(inBuffer) {
  var i = inBuffer.length - Constants.ENDHDR; // END header size
  var n = Math.max(0, i - 0xffff), // 0xFFFF is the max zip file comment length
    endOffset = -1; // Start offset of the END header

  for (i; i >= n; i--) {
    if (inBuffer[i] !== 0x50) continue; // quick check that the byte is 'P'
    if (inBuffer.readUInt32LE(i) === Constants.ENDSIG) {
      // "PK\005\006"
      endOffset = i;
      break;
    }
  }
  if (!~endOffset) throw new Error("INVALID_FORMAT");

  mainHeader = loadHeaderFromBinary(
    inBuffer.slice(endOffset, endOffset + Constants.ENDHDR)
  );
  if (mainHeader.commentLength) {
    //let _comment = inBuffer.slice(endOffset + Constants.ENDHDR);
  }

  return mainHeader;
}

class ZipHeader {
  constructor(buf){
    let header = parseHeader(buf)
    this.volumeEntries = header.volumeEntries
    this.size = header._size
    this.offset = header.offset
    this.commentLength = header.commentLength
  }
}

module.exports = ZipHeader
