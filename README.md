# jsmpeg-ws-web
jsmpeg + ws + ffmpeg  纯js实现多路视频直播浏览器播放，无插件限制

First of all, it's a fork of [**node-rtsp-stream-es6**](https://github.com/Wifsimster/node-rtsp-stream-es6)
depends
[**jsmpeg**](https://github.com/phoboslab/jsmpeg), [FFMPEG](https://ffmpeg.org/download.html)

server.js 提供 ws服务和自动运行本地计算机上的ffmpeg 程序 解析web端传送过来的直播地址，并推送mpegts 程序到客户端， 客户端通过jsMpeg 解析数据绘制在canvas上,不依赖flash 和h5的video标签，所以也不受他们的限制，什么自动播放啥的轻松实现；
