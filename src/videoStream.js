const WebSocket = require('ws');
const EventEmitter = require('events');
const STREAM_MAGIC_BYTES = 'jsmp';
const Mpeg1Muxer = require('./mpeg1muxer');

// TODO-WARN:  客户端和FFMPEG服务在客户端断开连接时没有及时清理 会造成内存溢出， 待修复
class VideoStream extends EventEmitter {

  constructor(options) {
    super(options);
    this.name = options.name;
    this.url = options.url;
    this.width = options.width;
    this.height = options.height;
    this.port = options.port;
    this.stream = void 0;

    this.stream2Socket();
  }

  stream2Socket() {
    // {rtsp:{clients:[c1,c2,c3], mpeg:''}}
    this.URL_STREAM = new Map(), this.clientMap = new Map();//缓存，实现多个视频流同时播放的问题
    this.server = new WebSocket.Server({port: this.port});
    this.server.connectionCount = 0;
    this.server.on('connection', (socket, upgradeReq) => {

      socket.on('close', () => {
        this.server.connectionCount--;
        console.log(`disconnected ! map`, this.URL_STREAM);
      });

      this.server.connectionCount++;
      const url = upgradeReq.socket.remoteAddress + upgradeReq.url;
      console.log('new connection req url [%s]', url);
      let streamUrl = getURLParameters(upgradeReq.url).url;

      if (!streamUrl) {return; }
      let dataCache = this.URL_STREAM.get(streamUrl);
      dataCache || (dataCache = {});
      if (Array.isArray(dataCache.clients)) {
        dataCache.clients.push(socket);
      } else {
        dataCache.clients = [];
        dataCache.clients.push(socket);
      }
      dataCache.mpeg = this.initMpeg1Muxe(streamUrl);
      this.URL_STREAM.set(streamUrl, dataCache);

      console.log('webSocket产生新的连接:%s ', url);
      // console.log(`New connection: ${this.name}`);

      // let streamHeader = Buffer.allocUnsafe(8);
      // streamHeader.write(STREAM_MAGIC_BYTES);
      // streamHeader.writeUInt16BE(this.width, 4);
      // streamHeader.writeUInt16BE(this.height, 6);
      // socket.send(streamHeader);

    });

    this.on('camdata', (data) => {
      // console.log("camdata", this.server.clients);
      // for (const client of this.server.clients) {
      //   // console.log('camdata client', client.readyState === WebSocket.OPEN);
      //   console.log('camdata', client);
      //   if (client.readyState === WebSocket.OPEN) {
      //     data.
      //     client.send(data.data); }
      // }

      if (data.url) {
        const clients = this.URL_STREAM.get(data.url).clients;
        clients.map(function(obj, index) {
          if (!obj || obj.readyState !== WebSocket.OPEN) {
            obj = null;
            clients.splice(index, 1);
            return;
          }
          obj.send(data.data);
        });
      }

    });
  }

  onSocketConnect(socket) {
    console.log(
        '------------------------------------------------onSocketConnect');
    let streamHeader = new Buffer(8);
    streamHeader.write(STREAM_MAGIC_BYTES);
    streamHeader.writeUInt16BE(this.width, 4);
    streamHeader.writeUInt16BE(this.height, 6);
    socket.send(streamHeader, {binary: true});
    console.log(
        `New connection: ${this.name} - ${this.wsServer.clients.length} total`);
    return socket.on('close', function(code, message) {

      return console.log(
          `${this.name} disconnected - ${this.wsServer.clients.length} total`);
    });
  }

  start() {
    // this.mpeg1Muxer = new Mpeg1Muxer({url: this.url});
    // this.mpeg1Muxer.on('mpeg1data',
    //     (data) => {
    //       return this.emit('camdata', data);
    //     });
    //
    // let gettingInputData = false;
    // let gettingOutputData = false;
    // let inputData = [];
    // let outputData = [];
    // this.mpeg1Muxer.on('ffmpegError', (data) => {
    //   data = data.toString();
    //   if (data.indexOf('Input #') !== -1) { gettingInputData = true; }
    //   if (data.indexOf('Output #') !== -1) {
    //     gettingInputData = false;
    //     gettingOutputData = true;
    //   }
    //   if (data.indexOf('frame') === 0) { gettingOutputData = false; }
    //   if (gettingInputData) {
    //     inputData.push(data.toString());
    //     let size = data.match(/\d+x\d+/);
    //     if (size != null) {
    //       size = size[0].split('x');
    //       if (this.width == null) { this.width = parseInt(size[0], 10); }
    //       if (this.height == null) {
    //         return this.height = parseInt(size[1], 10);
    //       }
    //     }
    //   }
    // });
    // this.mpeg1Muxer.on('ffmpegError',
    //     (data) => { return global.process.stderr.write(data); });
    return this;
  }

  initMpeg1Muxe(url) {
    if (this.URL_STREAM.has(url)) {
      return this.URL_STREAM.get(url).mpeg;
    }
    const mpeg1Muxer = new Mpeg1Muxer({url: url});
    mpeg1Muxer.on('mpeg1data',
        (data) => {
          return this.emit('camdata', {
            url,
            data,
          });
        });

    let gettingInputData = false;
    let gettingOutputData = false;
    let inputData = [];
    let outputData = [];
    mpeg1Muxer.on('ffmpegError', (data) => {
      data = data.toString();
      if (data.indexOf('Input #') !== -1) { gettingInputData = true; }
      if (data.indexOf('Output #') !== -1) {
        gettingInputData = false;
        gettingOutputData = true;
      }
      if (data.indexOf('frame') === 0) { gettingOutputData = false; }
      if (gettingInputData) {
        inputData.push(data.toString());
        let size = data.match(/\d+x\d+/);
        if (size != null) {
          size = size[0].split('x');
          if (this.width == null) { this.width = parseInt(size[0], 10); }
          if (this.height == null) {
            return this.height = parseInt(size[1], 10);
          }
        }
      }
    });
    mpeg1Muxer.on('ffmpegError',
        (data) => { return global.process.stderr.write(data); });

    return mpeg1Muxer;
  }

  stop(serverCloseCallback) {
    console.log('stop');
    this.server.close(serverCloseCallback);
    this.server.removeAllListeners();
    this.server = undefined;

    this.mpeg1Muxer.stop();
    this.mpeg1Muxer.removeAllListeners();
    this.mpeg1Muxer = undefined;
  }
}

function getURLParameters(url) {
  const params = url.match(/([^?=&]+)(=([^&]*))/g);
  return params ? params.reduce(
      (a, v) => (a[v.slice(0, v.indexOf('='))] = v.slice(
          v.indexOf('=') + 1), a), {},
  ) : [];
}

class DataCache {
  constructor(option) {
    this.clients = option.clients || [];
    this.mpeg = option.mpeg;
  }
}

module.exports = VideoStream;
