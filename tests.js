var mj = require('./minijanus.js');
var test = require('tape');

test('transactions are detected and matched up', function(t) {
  var session = new mj.JanusSession(signal => {}, {});

  var aq = session.send({ transaction: "figs" });
  var bq = session.send({ transaction: "wigs" });
  var cq = session.send({ transaction: "pigs" });

  session.receive({ transaction: "pigs", rats: "pats" });
  session.receive({ just: "kidding" });
  session.receive({}, t);
  session.receive({ transaction: "figs", cats: "hats" });
  session.receive({ transaction: "wigs" });

  Promise.all([aq, bq, cq]).then(results => {
    t.deepEqual(results[0], { transaction: "figs", cats: "hats" });
    t.deepEqual(results[1], { transaction: "wigs" });
    t.deepEqual(results[2], { transaction: "pigs", rats: "pats" });
    t.end();
  });
});

test('transaction timeouts happen', function(t) {
  var session = new mj.JanusSession(signal => {}, { timeoutMs: 5 });

  var aq = session.send({ transaction: "lazy" }).then(
    resp => t.error(true, "Request should have failed!"),
    err => t.ok(true, "Timeout should have fired!")
  );
  var bq = session.send({ transaction: "hasty" }).then(
    resp => t.ok(true, "Request should have succeeded!"),
    err => t.error(true, "Timeout shouldn't have fired!")
  );

  setTimeout(() => session.receive({ transaction: "hasty", "phew": "just-in-time" }, 1));

  Promise.all([aq, bq]).then(() => t.end());
});
