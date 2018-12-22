const getRange = require('./getRange')

const Constants = require("./Constants");
const ZipHeader = require("./ZipHeader");
const ZipEntry = require("./ZipEntry");

class RemoteZip {
  constructor(url) {
    this.url = url;
    this.entryTable = {};
    this.initialized = false
  }
  async _loadEntries() {
    const zipUrl = this.url

    // download zip header
    let headerBuffer = await getRange(zipUrl, -Constants.ENDHDR);
    // parse binary data to zipHeader
    let mainHeader = new ZipHeader(headerBuffer);
    // console.log('main header', mainHeader)

    // The central directory file header
    // mainHeader response includes content-length: 'content-range': 'bytes 3169974-3169995/3169996' which we pass through with totalSize
    let contentLength = headerBuffer.totalSize 
    let centralDirectory = await getRange(zipUrl, mainHeader.offset /*offset of first CEN header*/, contentLength)

    let entryCount = mainHeader.volumeEntries; // total number of entries
    let index = 0
    for (var i = 0; i < entryCount; i++) {
      let entry = new ZipEntry(zipUrl, centralDirectory, index);
      // console.log('entry found', entry.name)
      index += entry.entryHeaderSize;
      this.entryTable[i] = entry;
      this.entryTable[entry.name] = entry;
    }

    this.initialized = true
  }
  async getEntries() {
    if(this.initialized){
      return this.entryTable
    }
    await this._loadEntries()
    return this.entryTable;
  }
  async getEntry(entryName) {
    if(this.initialized){
      return this.entryTable[entryName];
    }
    await this._loadEntries()
    return this.entryTable[entryName];
  }
}

module.exports = RemoteZip;
