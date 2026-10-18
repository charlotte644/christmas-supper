/**
 * Connects these GitHub-hosted pages to the Google Apps Script back end.
 *
 * It provides the same google.script.run that the pages use inside Google, but sends each
 * request straight to the script WITHOUT any Google sign-in cookies. That avoids Google's
 * "Sorry, unable to open the file at this time" error for people signed in to more than
 * one Google account.
 */
(function () {
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwDo9GOs5N2ArUTS6Q9j54EN80Uy7EDM6WaKUhuY5Q_bB6fSWAvZBpMwbV00dod2zii/exec';

  function send(fn, args) {
    return fetch(SCRIPT_URL, {
      method: 'POST',
      credentials: 'omit',                                    // no Google sign-in involved
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // keeps it a "simple" request Google accepts
      body: JSON.stringify({ fn: fn, args: args })
    }).then(function (res) {
      return res.text();
    }, function () {
      throw new Error('We couldn’t reach the booking system — please check your connection and try again.');
    }).then(function (text) {
      var reply;
      try { reply = JSON.parse(text); } catch (e) {
        throw new Error('The booking system is having a moment — please try again in a minute.');
      }
      if (!reply.ok) throw new Error(reply.error || 'Something went wrong.');
      return reply.result;
    });
  }

  // google.script.run.withSuccessHandler(ok).withFailureHandler(bad).someFunction(args…)
  function runner(ok, bad) {
    return new Proxy({}, {
      get: function (target, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, bad); };
        if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          send(String(name), args).then(
            function (result) { if (ok) ok(result); },
            function (err) { if (bad) bad(err); else console.error(err); }
          );
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = { run: runner(null, null) };
})();
