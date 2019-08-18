const Stream = require('../src/videoStream');

const options = {
  name: 'streamName',
  url: 'rtmp://58.200.131.2:1935/livetv/hunantv',
  port: 5000,
};
stream = new Stream(options);
// stream.start();
// setTimeout(stream.stop.bind(stream), 10 * 1000);
