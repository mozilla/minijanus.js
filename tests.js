var mj = require('./minijanus.js');
var test = require('tape');

test('transactions are detected and matched up', function(t) {
  var session = new mj.JanusSession(signal => {}, { keepaliveMs: null });

  var trickle = session.send("trickle", { transaction: "bigs" });
  var aq = session.send("message", { transaction: "figs" });
  var bq = session.send("message", { transaction: "wigs" });
  var cq = session.send("message", { transaction: "pigs" });

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
  });
});
