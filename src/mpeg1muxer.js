const child_process = require('child_process');
const EventEmitter = require('events');

class Mpeg1Muxer extends EventEmitter {

  constructor(options) {
    super(options);
    const scale = !!options.full ? "scale=1280:720,setsar=1:1":"scale=640:360,setsar=1:1";
    this.url = options.url;

    this.stream = child_process.spawn('ffmpeg', [
        // '-thread_queue_size','10240',
        '-rtsp_transport','tcp',
      '-i',
      this.url,
      '-f',
      'mpegts',
      '-codec:v',
      'mpeg1video',
      '-b:v',
      '1000k',
      '-bf',
      '0',
      '-vf',
      scale,
      '-codec:a',
      'mp2',
      '-r',
      '30',
      '-',
    ], {
      detached: false,
    });

    this.inputStreamStarted = true;
    this.stream.stdout.on('data', (data) => {
      return this.emit('mpeg1data', data);
    });
    this.stream.stderr.on('data',
        (data) => {
          return this.emit('ffmpegError', data);
        });
    this.stream.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }

  stop() {
    this.stream.stdout.removeAllListeners();
    this.stream.stderr.removeAllListeners();
    this.stream.kill();
    this.stream = undefined;
  }
}

module.exports = Mpeg1Muxer;
