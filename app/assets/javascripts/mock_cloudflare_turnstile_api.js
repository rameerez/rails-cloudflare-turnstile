(function() {
  function mock_cloudflare_turnstile_response() {
    setTimeout(function() {
      console.log("setting mock cloudflare turnstile to ✓");
      for (let elem of document.getElementsByClassName("cf-turnstile")) {
        // Only the mock widget has a label; skip anything else on the page.
        const label = elem.getElementsByTagName("p")[0];
        if (label) {
          label.style.color = 'green';
          label.innerHTML = "Mocked CAPTCHA succeeded";
        }
        if (elem.dataset.callback !== undefined) {
          // Turnstile passes the token to data-callback as its first argument.
          eval(elem.dataset.callback)("mocked");
        }
      }
    }, 1500);
  }

  if (document.readyState !== 'loading') {
    mock_cloudflare_turnstile_response()
  } else {
    document.addEventListener('DOMContentLoaded', mock_cloudflare_turnstile_response);
  }
})();
