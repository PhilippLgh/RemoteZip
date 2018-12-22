const fs = require('fs')
const { request, downloadResponse } = require("./downloader");

async function getRangeOverHttp(zipUrl, start, end) {
  let range = end ? `${start}-${end}` : `${start}`
  // console.log('download range', range, start, end)
  let response = await request("GET", zipUrl, {
    headers: {
      Range: `bytes=${range}`
    }
  });
  // console.log('response', response.headers)
  const rangeInfo = response.headers['content-range']
  const totalSize = parseInt(rangeInfo.split('/').pop())
  let buf = await downloadResponse(response);
  console.log('received range bytes: ', buf.length, 'total: ', totalSize, ((buf.length / totalSize) * 100)+'%' )
  buf.totalSize = totalSize
  return buf;
}

async function getRangeFromBinary(filePath, start){
  let data = fs.readFileSync(filePath)
  let offsetStart = data < 0 ? (data.length + start) : start 
  return data.slice(offsetStart)
}

module.exports = async (url, start, end) => {
  if (url.startsWith('http')){
    return getRangeOverHttp(url, start, end)
  } else {
    return getRangeFromBinary(url, start, end)
  }
}