# RailsCloudflareTurnstile

This is a Rails plugin adding support for [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/). It works with Rails 6+, and Ruby 3.2+.

[![CI](https://github.com/instrumentl/rails-cloudflare-turnstile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/instrumentl/rails-cloudflare-turnstile/actions/workflows/ci.yml)
[![Gem Version](https://badge.fury.io/rb/rails_cloudflare_turnstile.svg)](https://badge.fury.io/rb/rails_cloudflare_turnstile)

## Usage

## Installation
Add this line to your application's Gemfile:

```ruby
gem 'rails_cloudflare_turnstile'
```

And then execute:
```bash
$ bundle
```

Or install it yourself as:
```bash
$ gem install rails_cloudflare_turnstile
```

Next, configure it by creating a `config/initializers/cloudflare_turnstile.rb` with contents like the following:

```ruby
RailsCloudflareTurnstile.configure do |c|
  c.site_key = "XXXXXX"
  c.secret_key = "XXXXXXXX"
  c.fail_open = true
end
```
To totally disable Turnstile, you can set `c.enabled = false` and all other config values are ignored.

To use Turnstile for a view:

   1. Call `cloudflare_turnstile_script_tag` in your layout
   2. Call `cloudflare_turnstile` in your form View. Keyword arguments are passed to the tag helper (for example, to set the `tabindex` option, you could use `cloudflare_turnstile(data: {tabindex: 0})`)
   3. Call `validate_cloudflare_turnstile` as a `before_action` in your controller.

If the challenge fails, the exception `RailsCloudflareTurnstile::Forbidden` will be raised; you should handle this with
a `rescue_from` block.

By default, in development and test mode, a special mock view will be inserted if real credentials are not present. To
disable this, set the `mock_enabled` property of the configuration to false.

## Customizing theme and size

The widget theme and size can be configured globally and overridden per instance:

**Global configuration** (set in initializer):
```ruby
RailsCloudflareTurnstile.configure do |c|
  c.size = :normal   # :normal (default), :compact, or :flexible
  c.theme = :dark    # :auto (default), :light, or :dark
end
```

**Per-instance override** (in your view):
```erb
<%= cloudflare_turnstile(data: {theme: "dark"}) %>
<%= cloudflare_turnstile(data: {size: "compact"}) %>
<%= cloudflare_turnstile(data: {size: "compact", theme: "dark"}) %>
```

Per-instance values will override the global configuration. Both strings and symbols are accepted.

## Using with Turbo

Cloudflare's script, in its default (implicit) mode, finds widgets by scanning the page **once, when it loads**. With Turbo, pages usually arrive without a full load, so a widget on them would never be drawn: no checkbox, no token, and `validate_cloudflare_turnstile` refuses the form.

To avoid that, `cloudflare_turnstile_script_tag` marks the script `data-turbo-track="reload"` and `data-turbo-temporary`. Before each visit Turbo removes temporary elements from the page it is leaving, the tracked script goes missing, and Turbo falls back to a full page load (`tracked_element_mismatch`), which runs the scan again. That works for plain links, with two costs:

- **Turbo Drive is off on every page that carries the script.** Every visit *away* from such a page is a full reload, including to pages with no widget at all.
- **Some Turnstile pages still get an empty widget.** Turbo does not cache the outgoing page for a non-GET form submission, so a form that redirects to a page with a widget renders in place, and so do Turbo Frames and Turbo Streams. The scan never runs for those.

To keep Turbo Drive and draw every widget however it arrives, load the script in explicit mode without the Turbo attributes, and render each widget from a Stimulus controller:

```erb
<%# layout <head> %>
<%= cloudflare_turnstile_script_tag(explicit: true, turbo_reload: false) %>

<%# form %>
<%= cloudflare_turnstile(data: {controller: "turnstile"}) %>
```

```js
// app/javascript/controllers/turnstile_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Draw once the widget is on screen: a widget in a closed <dialog> or
    // collapsed panel renders when it gets a size.
    this.observer = new ResizeObserver(() => this.render())
    this.observer.observe(this.element)
    this.render()
  }

  disconnect() {
    this.observer?.disconnect()
    if (this.widgetId) window.turnstile?.remove(this.widgetId)
    this.widgetId = null
    this.rendering = false
  }

  async render() {
    if (this.rendering || this.element.getClientRects().length === 0) return
    this.rendering = true

    const turnstile = await this.turnstileLoaded()
    if (!turnstile || !this.element.isConnected) return

    // A page restored from Turbo's cache brings back a dead copy of the widget
    // (its iframe lives in a shadow root, which is not cloned): start clean.
    this.element.replaceChildren()
    this.widgetId = turnstile.render(this.element)
  }

  // null in mock mode: the mock widget already carries its token.
  turnstileLoaded() {
    if (window.turnstile) return Promise.resolve(window.turnstile)

    const script = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
    if (!script) return Promise.resolve(null)
    return new Promise((resolve) => script.addEventListener("load", () => resolve(window.turnstile), {once: true}))
  }
}
```

Every widget needs the controller once the script is explicit: Cloudflare no longer draws any on its own.

## License
The gem is available as open source under the terms of the [ISC License](LICENSE.txt).
