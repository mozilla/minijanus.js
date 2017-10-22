# minijanus.js

[![Build Status](https://travis-ci.org/mquander/minijanus.js.svg?branch=master)](https://travis-ci.org/mquander/minijanus.js)

A super-simplistic and -minimal wrapper for talking to the [Janus signalling API][api-docs]. Developed for use with
Janus as a web game networking backend via [janus-plugin-sfu][].

If you want a batteries-included wrapper, you should use the one distributed by the Janus developers --
[janus.js][]. This one is different in a few ways:

1. It doesn't try to maintain compatibility with older browsers very hard; the use case is modern browsers only.
2. It's very small and straightforward, so it may serve as a useful reference client for people who want to better
   understand the signalling API.
3. It gives you control over most of the configuration and usage of the RTCPeerConnection directly, whereas janus.js
   wraps and manages the connection for you.

[api-docs]: https://janus.conf.meetecho.com/docs/rest.html
[janus.js]: https://github.com/meetecho/janus-gateway/blob/master/html/janus.js
[janus-plugin-sfu]: https://github.com/mquander/janus-plugin-sfu

## Example

Require `minijanus` in Node, or link to bundle.js in a browser. Then:

```javascript
var ws = new WebSocket("ws://localhost:8188", "janus-protocol");
  ws.addEventListener("open", () => {
  var session = new Minijanus.JanusSession(ws.send.bind(ws));
  ws.addEventListener("message", ev => session.receive(JSON.parse(ev.data)));
  session.create().then(() => establishConnection(session)).then(() => {
    console.info("Connection established: ", handle);
  });
});

function negotiateIce(conn, handle) {
  return new Promise((resolve, reject) => {
    conn.addEventListener("icecandidate", ev => {
      handle.sendTrickle(ev.candidate || null).then(() => {
        if (!ev.candidate) { // this was the last candidate on our end and now they received it
          resolve();
        }
      });
    });
  });
};

function establishConnection(session) {
  var conn = new RTCPeerConnection({});
  var handle = new Minijanus.JanusPluginHandle(session);
  return handle.attach("janus.plugin.sfu").then(() => {
    var iceReady = negotiateIce(conn, handle);
    var unreliableCh = conn.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });
    var reliableCh = conn.createDataChannel("reliable", { ordered: true });
    var mediaReady = navigator.mediaDevices.getUserMedia({ audio: true });
    var offerReady = mediaReady
      .then(media => {
        conn.addStream(media);
        return conn.createOffer({ audio: true });
      }, () => conn.createOffer());
    var localReady = offerReady.then(conn.setLocalDescription.bind(conn));
    var remoteReady = offerReady
      .then(handle.sendJsep.bind(handle))
      .then(answer => conn.setRemoteDescription(answer.jsep));
    return Promise.all([iceReady, localReady, remoteReady]);
  });
}
```

## Building

To generate bundle.js:

```
$ npm run build
```

## Testing

```
$ npm run test
```
