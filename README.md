# minijanus.js

[![npm](https://img.shields.io/npm/v/minijanus.svg)](https://www.npmjs.com/package/minijanus)
[![Build Status](https://travis-ci.org/mozilla/minijanus.js.svg?branch=master)](https://travis-ci.org/mozilla/minijanus.js)

A super-simplistic and -minimal wrapper for talking to the [Janus signalling API][api-docs]. Developed for use with
Janus as a web game networking backend via [janus-plugin-sfu][], but fundamentally plugin-agnostic. Designed to
provide useful possible abstractions while still providing the maximum possible control over `RTCPeerConnection`
configuration and precise plugin signalling flow.

If you want a batteries-included wrapper, you should use the one distributed by the Janus developers --
[janus.js][]. This one is different in a few ways:

1. It doesn't try to maintain compatibility with older browsers very hard; the use case is modern browsers only.
2. It's very small and straightforward, so it may serve as a useful reference client for people who want to better
   understand the signalling API.
3. It gives you control over most of the configuration and usage of the `RTCPeerConnection` directly, whereas janus.js
   wraps and manages the connection for you.

If you want a similar but moderately more featureful wrapper, check out [minnie-janus][].

[api-docs]: https://janus.conf.meetecho.com/docs/rest.html
[janus.js]: https://github.com/meetecho/janus-gateway/blob/master/html/janus.js
[janus-plugin-sfu]: https://github.com/mquander/janus-plugin-sfu
[minnie-janus]: https://github.com/michaelfranzl/minnie-janus

## Example

Require `minijanus` in Node, or link to bundle.js in a browser. Then:

```javascript
function negotiateIce(conn, handle) {
  return new Promise((resolve, reject) => {
    conn.addEventListener("icecandidate", ev => {
      handle.sendTrickle(ev.candidate || null).then(() => {
        if (!ev.candidate) { // this was the last candidate on our end and now they received it
          resolve();
        }
      }, reject);
    });
  });
};

function negotiateOffer(conn, handle) {
  var mediaReady = navigator.mediaDevices.getUserMedia({ audio: true });
  var connectionReady = mediaReady.then(m => m.getTracks().forEach(t => conn.addTrack(t, m)));
  var offerReady = connectionReady.then(conn.createOffer.bind(conn));
  var localReady = offerReady.then(conn.setLocalDescription.bind(conn));
  var answerReady = offerReady.then(handle.sendJsep.bind(handle));
  var remoteReady = answerReady.then(answer => conn.setRemoteDescription(answer.jsep));
  return Promise.all([localReady, remoteReady]);
}

var ws = new WebSocket("ws://localhost:8188", "janus-protocol");
ws.addEventListener("open", () => {
  var session = new Minijanus.JanusSession(ws.send.bind(ws), { verbose: true });
  ws.addEventListener("message", ev => session.receive(JSON.parse(ev.data)));
  session.create().then(() => {
    var conn = new RTCPeerConnection({});
    var handle = new Minijanus.JanusPluginHandle(session);
    return handle.attach("janus.plugin.sfu").then(() => {
      var unreliableCh = conn.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });
      var reliableCh = conn.createDataChannel("reliable", { ordered: true });
      negotiateIce(conn, handle).catch(err => console.error("Error negotiating ICE candidates: ", err));
      negotiateOffer(conn, handle).catch(err => console.error("Error negotiating offer: ", err));
      return new Promise(resolve => handle.on("webrtcup", resolve));
    });
  }).catch(err => console.error("Error connecting to Janus: ", err));
});
```

## Building

To generate bundle.js:

```
$ yarn build
```

## Testing

```
$ yarn test
```
