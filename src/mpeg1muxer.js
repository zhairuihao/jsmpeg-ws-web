const child_process = require('child_process');
const EventEmitter = require('events');

class Mpeg1Muxer extends EventEmitter {

  constructor(options) {
    super(options);

    this.url = options.url;

    this.stream = child_process.spawn('ffmpeg', [
      '-i',
      this.url,
      '-f',
      'mpegts',
      '-codec:v',
      'mpeg1video',
      '-b:v',
      '2000k',
      '-bf',
      '0',
      '-vf',
      'scale=640:360,setsar=1:1',
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
