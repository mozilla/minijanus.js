# minijanus.js

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
