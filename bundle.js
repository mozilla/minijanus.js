(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Minijanus = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Represents a handle to a single Janus plugin on a Janus session. Each WebRTC connection to the Janus server will be
 * associated with a single handle. Once attached to the server, this handle will be given a unique ID which should be
 * used to associate it with future signalling messages.
 *
 * See https://janus.conf.meetecho.com/docs/rest.html#handles.
 **/
function JanusPluginHandle(session, conn) {
    this.session = session;
    this.conn = conn;
    this.id = undefined;
}

/** Attaches this handle to the Janus server and sets its ID. **/
JanusPluginHandle.prototype.attach = function(pluginName) {
    var payload = { janus: "attach", plugin: pluginName, "force-bundle": true, "force-rtcp-mux": true };
    return this.session.send(payload).then(resp => {
        this.id = resp.data.id;
        return resp;
    });
};

/** Detaches this plugin. Doesn't touch the RTCPeerConnection. **/
JanusPluginHandle.prototype.detach = function() {
    return this.send({ janus: "detach" });
};

/**
 * Sends a signal associated with this handle. Signals should be JSON-serializable objects. Returns a promise that will
 * be resolved or rejected when a response to this signal is received, or when no response is received within the
 * session timeout.
 **/
JanusPluginHandle.prototype.send = function(signal) {
    return this.session.send(Object.assign({ handle_id: this.id }, signal));
};

/** Sends a plugin-specific message associated with this handle. **/
JanusPluginHandle.prototype.sendMessage = function(body) {
    return this.send({ janus: "message", body: body });
};

/** Sends a JSEP offer or answer associated with this handle. **/
JanusPluginHandle.prototype.sendJsep = function(jsep) {
    return this.send({ janus: "message", body: {}, jsep: jsep });
};

/**
 * Sets up ICE negotiation on the connection for this handle, sending a signal for each new candidate. Returns a promise
 * that resolves when we've sent all of our ICE candidates.
 **/
JanusPluginHandle.prototype.negotiateIce = function() {
    return new Promise((resolve, reject) => {
        this.conn.addEventListener("icecandidate", ev => {
            this.send({ janus: "trickle",  candidate: ev.candidate || null }).then(() => {
                if (!ev.candidate) { // this was the last candidate on our end and now they received it
                    resolve();
                }
            });
        });
    });
};

/**
 * Represents a Janus session -- a Janus context from within which you can open multiple handles and connections. Once
 * created, this session will be given a unique ID which should be used to associate it with future signalling messages.
 *
 * See https://janus.conf.meetecho.com/docs/rest.html#sessions.
 **/
function JanusSession(output) {
    this.output = output;
    this.id = undefined;
    this.nextTxId = 0;
    this.txns = {};
    this.timeoutMs = 10000;
    this.keepaliveMs = 30000;
}

/** Creates this session on the Janus server and sets its ID. **/
JanusSession.prototype.create = function() {
    return this.send({ janus: "create" }).then(resp => {
        this.id = resp.data.id;
        return resp;
    });
};

/** Destroys this session. **/
JanusSession.prototype.destroy = function() {
    return this.send({ janus: "destroy" });
};

/**
 * Callback for receiving JSON signalling messages pertinent to this session. If the signals are responses to previously
 * sent signals, the promises for the outgoing signals will be resolved or rejected appropriately with this signal as an
 * argument.
 *
 * External callers should call this function every time a new signal arrives on the transport; for example, in a
 * WebSocket's `message` event, or when a new datum shows up in an HTTP long-polling response.
 **/
JanusSession.prototype.receive = function(signal) {
    console.debug("Incoming Janus signal: ", signal);
    if (signal.transaction != null) {
        var handlers = this.txns[signal.transaction];
        if (signal.janus === "ack" && signal.hint) {
            // this is an ack of an asynchronously-processed request, we should wait
            // to resolve the promise until the actual response comes in
        } else {
            if (handlers.timeout) {
                clearTimeout(handlers.timeout);
            }
            (signal.janus === "error" ? handlers.reject : handlers.resolve)(signal);
            delete this.txns[signal.transaction];
        }
    }
};

/**
 * Sends a signal associated with this session. Signals should be JSON-serializable objects. Returns a promise that will
 * be resolved or rejected when a response to this signal is received, or when no response is received within the
 * session timeout.
 **/
JanusSession.prototype.send = function(signal) {
    console.debug("Outgoing Janus signal: ", signal);
    signal = Object.assign({
        session_id: this.id,
        transaction: (this.nextTxId++).toString()
    }, signal);
    return new Promise((resolve, reject) => {
        var timeout = null;
        if (this.timeoutMs) {
            timeout = setTimeout(() => reject(new Error("Signalling message timed out.")), this.timeoutMs);
        }
        this.txns[signal.transaction] = { resolve: resolve, reject: reject, timeout: timeout };
        this.output(JSON.stringify(signal));
        this._resetKeepalive();
    });
};

JanusSession.prototype._resetKeepalive = function() {
    if (this.keepaliveTimeout) {
        clearTimeout(this.keepaliveTimeout);
    }
    this.keepaliveTimeout = setTimeout(() => this._keepalive(), this.keepaliveMs);
};

JanusSession.prototype._keepalive = function() {
    return this.send({ janus: "keepalive" });
};

module.exports = {
    JanusPluginHandle,
    JanusSession
};

},{}]},{},[1])(1)
});