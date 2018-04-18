var mj = require('./minijanus.js');
var test = require('tape');

test('events are detected and matched to handles', function(t) {
  var session = new mj.JanusSession(signal => {}, { keepaliveMs: null });
  var handles = [0, 1, 2].map(i => { var h = new mj.JanusPluginHandle(session); h.id = i; return h; });
  var h0 = new Promise(resolve => handles[0].on("foo", resolve));
  var h1 = new Promise(resolve => handles[1].on("foo", resolve));
  var h2 = new Promise(resolve => handles[2].on("bar", resolve));

  session.receive({ janus: "foo", sender: 123 });
  session.receive({ janus: "foo", sender: 0 });
  session.receive({ janus: "bar", sender: 2 });
  session.receive({ janus: "foo", sender: 456 });
  session.receive({ janus: "foo", sender: 1 });

  Promise.all([h0, h1, h2]).then(results => {
    t.deepEqual(results[0], { janus: "foo", sender: 0 });
    t.deepEqual(results[1], { janus: "foo", sender: 1 });
    t.deepEqual(results[2], { janus: "bar", sender: 2 });
    t.end();
  }).catch(err => {
    t.fail(err);
    t.end();
  });
});

test('transactions are detected and matched up', function(t) {
  var session = new mj.JanusSession(signal => {}, { keepaliveMs: null });

  var trickle = session.send("trickle", { transaction: "bigs" });
  var aq = session.send("message", { transaction: "figs" });
  var bq = session.send("message", { transaction: "wigs" });
  var cq = session.send("message", { transaction: "pigs" });

  session.receive({ transaction: "???" });
  session.receive({ transaction: "bigs", janus: "ack" });
  session.receive({ transaction: "figs", janus: "ack" });
  session.receive({ transaction: "wigs", janus: "ack" });
  session.receive({ transaction: "pigs", janus: "ack", hint: "Asynchronously processing some pigs." });

  session.receive({ transaction: "pigs", rats: "pats" });
  session.receive({ just: "kidding" });
  session.receive({}, t);
  session.receive({ transaction: "figs", cats: "hats" });
  session.receive({ transaction: "wigs" });

  Promise.all([trickle, aq, bq, cq]).then(results => {
    t.deepEqual(results[0], { transaction: "bigs", janus: "ack" });
    t.deepEqual(results[1], { transaction: "figs", cats: "hats" });
    t.deepEqual(results[2], { transaction: "wigs" });
    t.deepEqual(results[3], { transaction: "pigs", rats: "pats" });
    t.deepEqual(session.txns, {});
    t.end();
  }).catch(err => {
    t.fail(err);
    t.end();
  });
});

test('transaction timeouts happen', function(t) {
  var session = new mj.JanusSession(signal => {}, { timeoutMs: 5, keepaliveMs: null });

  var aq = session.send("message", { transaction: "lazy" }).then(
    resp => { t.fail("Request should have failed!"); return resp; },
    err => { t.pass("Timeout should have fired!"); return err; }
  );
  var bq = session.send("message", { transaction: "hasty" }).then(
    resp => { t.pass("Request should have succeeded!"); return resp; },
    err => { t.fail("Timeout shouldn't have fired!"); return err; }
  );

  session.receive({ transaction: "lazy", janus: "ack" });
  session.receive({ transaction: "hasty", janus: "ack" });

  setTimeout(() => session.receive({ transaction: "hasty", phew: "just-in-time" }, 1));

  Promise.all([aq, bq]).then(results => {
    t.deepEqual(results[1], { transaction: "hasty", phew: "just-in-time" });
    t.deepEqual(session.txns, {});
    t.end();
  }).catch(err => {
    t.fail(err);
    t.end();
  });;
});


test('session transactions are properly disposed of', function(t) {
  var session = new mj.JanusSession(signal => {}, { timeoutMs: 5, keepaliveMs: null });

  var message1 = session.send("message", { transaction: "message1" }).then(
    resp => { t.pass("Message 1 was received."); return resp; },
    err => { t.fail("Message should have been received."); return err; }
  );
  var message2 = session.send("message", { transaction: "message2" }).then(
    resp => {  t.fail("Message 2 shouldn't have been received."); return resp; },
    err => { t.pass("Message 2 was correctly rejected."); return err; }
  );

  session.receive({ transaction: "message1", value: "test" });

  session.dispose();

  Promise.all([message1, message2]).then(results => {
    t.deepEqual(results[0], { transaction: "message1", value: "test" });
    t.deepEqual(session.txns, {});
    t.end();
  }).catch(err => {
    t.fail(err);
    t.end();
  });
});
