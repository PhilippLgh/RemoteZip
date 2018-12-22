const Constants = require("./Constants")
const getRange = require('./getRange')

class CentralDirectoryFileHeader {
  constructor(inputBuffer) {
    this.initFromBinary(inputBuffer)
  }
  initFromBinary(/*Buffer*/ entryHeader) {
    // entryHeader should be 46 bytes and start with "PK 01 02"
    if (
      entryHeader.length !== Constants.CENHDR ||
      entryHeader.readUInt32LE(0) !== Constants.CENSIG
    ) {
      throw new Error('INVALID_CEN')
    }
    // version made by
    this._verMade = entryHeader.readUInt16LE(Constants.CENVEM)
    // version needed to extract
    this._version = entryHeader.readUInt16LE(Constants.CENVER)
    // encrypt, decrypt flags
    this._flags = entryHeader.readUInt16LE(Constants.CENFLG)
    // compression method
    this.method = entryHeader.readUInt16LE(Constants.CENHOW)
    // modification time (2 bytes time, 2 bytes date)
    this._time = entryHeader.readUInt32LE(Constants.CENTIM)
    // uncompressed file crc-32 value
    this._crc = entryHeader.readUInt32LE(Constants.CENCRC)
    // compressed size
    this._compressedSize = entryHeader.readUInt32LE(Constants.CENSIZ)
    // uncompressed size
    this._size = entryHeader.readUInt32LE(Constants.CENLEN)
    // filename length
    this._fileNameLength = entryHeader.readUInt16LE(Constants.CENNAM)
    // extra field length
    this._extraLen = entryHeader.readUInt16LE(Constants.CENEXT)
    // file comment length
    this._comLen = entryHeader.readUInt16LE(Constants.CENCOM)
    // volume number start
    this._diskStart = entryHeader.readUInt16LE(Constants.CENDSK)
    // internal file attributes
    this._inattr = entryHeader.readUInt16LE(Constants.CENATT)
    // external file attributes
    this._attr = entryHeader.readUInt32LE(Constants.CENATX)
    // LOC header offset
    this._offset = entryHeader.readUInt32LE(Constants.CENOFF)
  }
  get localHeaderOffset() {
    return this._offset
  }
}

class LocalFileHeader {
  constructor(inputBuffer) {
    this.readLocalFileHeaderFromBinary(inputBuffer)
  }
  readLocalFileHeaderFromBinary(/*Buffer*/ data) {
    // 30 bytes and should start with "PK\003\004"
    if (data.readUInt32LE(0) !== Constants.LOCSIG) {
      throw new Error('INVALID_LOC')
    }

    // version needed to extract
    this.version = data.readUInt16LE(Constants.LOCVER),
    // general purpose bit flag
    this.flags = data.readUInt16LE(Constants.LOCFLG),
    // compression method
    this.method = data.readUInt16LE(Constants.LOCHOW),
    // modification time (2 bytes time, 2 bytes date)
    this.time = data.readUInt32LE(Constants.LOCTIM),
    // uncompressed file crc-32 value
    this.crc = data.readUInt32LE(Constants.LOCCRC),
    // compressed size
    this.compressedSize = data.readUInt32LE(Constants.LOCSIZ),
    // uncompressed size
    this.size = data.readUInt32LE(Constants.LOCLEN),
    // filename length
    this.fnameLen = data.readUInt16LE(Constants.LOCNAM),
    // extra field length
    this.extraLen = data.readUInt16LE(Constants.LOCEXT)
  }
}

// https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html
class ZipEntry {
  constructor(url, inBuffer, headerOffset) {

    let buf = inBuffer.slice(headerOffset, headerOffset + Constants.CENHDR)
    this.centralDirectoryHeader = new CentralDirectoryFileHeader(buf)

    // get realDataOffset  return _offset + Constants.LOCHDR + _dataHeader.fnameLen + _dataHeader.extraLen;

    // this._dataHeader = new DataHeader(buf)
    /*
    var data = inBuffer.slice(0, 0 + Constants.LOCHDR)
    var data = input.slice(_offset, _offset + Constants.LOCHDR);
    // 30 bytes and should start with "PK\003\004"
    if (data.readUInt32LE(0) !== Constants.LOCSIG) {
        throw Utils.Errors.INVALID_LOC;
    }
    let bla = DataHeader.initDataHeaderFromBinary(inBuffer)
    console.log('bla', bla)
    */

    this._name = ""
    let nameOffset = headerOffset + Constants.CENHDR
    this.name = inBuffer.slice(nameOffset, nameOffset + this.centralDirectoryHeader._fileNameLength)
    /*
    let extraOffset = (nameOffset + entry._fileNameLength)
    if (this._extraLength) {
      entry.extra = inBuffer.slice(extraOffset, extraOffset + this._extraLength)
    }
    
    let commentOffset = (extraOffset + this._extraLength)
    if (this._commentLength)
      entry.comment = inBuffer.slice(tmp, tmp + this._commentLength)
    */

    this.url = url
  }


  set header(/*Buffer*/ entryHeader) {}
  get header() {
    return this._entryHeader
  }
  get entryHeaderSize() {
    let cdf = this.centralDirectoryHeader
    return (
      Constants.CENHDR + cdf._fileNameLength + cdf._extraLen + cdf._comLen
    )
  }
  set name(nameBuffer) {
    this._name = nameBuffer.toString()
  }
  get name() {
    return this._name
  }

  async getData() {

    if(this._data){
      return this._data
    }

    let localHeaderOffset = this.centralDirectoryHeader.localHeaderOffset
    let headerBuffer = await getRange(this.url, localHeaderOffset, localHeaderOffset + Constants.LOCHDR);
    this.localFileHeader = new LocalFileHeader(headerBuffer)

    //realDataOffset return _offset + Constants.LOCHDR + _dataHeader.fnameLen + _dataHeader.extraLen;
    let dataOffset = localHeaderOffset + Constants.LOCHDR + this.localFileHeader.fnameLen + this.localFileHeader.extraLen
    let dataBuffer = await getRange(this.url, dataOffset, dataOffset + this.localFileHeader.compressedSize)

    let { method } = this.centralDirectoryHeader
    let { size } = this.localFileHeader

    if(method === Constants.STORED){
      console.log('store')
    }
    if(method === Constants.DEFLATED){
      var zlib = require("zlib");
      let dataUncompressed = zlib.inflateRawSync(dataBuffer);
      /*
      var inflater = new Methods.Inflater(dataBuffer);
      var data = Buffer.alloc(_entryHeader.size);
      var result = inflater.inflate(data);
      result.copy(data, 0);
      if (!crc32OK(data)) {
          console.warn(Utils.Errors.BAD_CRC + " " + _entryName.toString())
      }
      */
      this._data = dataUncompressed
      return dataUncompressed;
    }
    return this.localFileHeader
    /*
    let offsetStart = this._dataHeader.realDataOffset
    let offsetEnd = this._dataHeader.realDataOffset + this._dataHeader.compressedSize
    console.log('get data', offsetStart, offsetEnd)
    */
    //compressed = input.slice(, _entryHeader.realDataOffset + _entryHeader.compressedSize)
  }
}

module.exports = ZipEntry
