# Invoker Buttons Polyfill

This polyfills the HTML `commandfor`/`command` attributes, as proposed by the Open UI group.

To see the explainer of these, please visit https://open-ui.org/components/invokers.explainer/.

## Installation

### With npm

If you're using npm, you only need to import the package, like so:

```js
import "invokers-polyfill";
```

This will automatically apply the polyfill if required.

If you'd like to manually apply the polyfill, you can instead import the `isSupported` and `apply` functions directly from the `./invoker.js` file, which
is mapped to `/fn`:

```js
import { isSupported, apply } from "invokers-polyfill/fn";
if (!isSupported()) apply();
```

An `isPolyfilled` function is also available, to detect if it has been polyfilled:

```js
import { isSupported, isPolyfilled, apply } from "invokers-polyfill/fn";
if (!isSupported() && !isPolyfilled()) apply();
```

Alternatively, if you're not using a package manager, you can use the `unpkg` script:

```html
<!-- polyfill automatically -->
<script
  type="module"
  async
  src="https://unpkg.com/invokers-polyfill@latest/invoker.min.js"
></script>
```

```html
<!-- polyfill manually -->
<script type="module" async>
  import {isSupported, apply} from "https://unpkg.com/invokers-polyfill@latest/invoker.js"
  if (!isSupported()) apply();
  >
</script>
```

## Usage

With the module imported, you can add `commandfor` and `command` attributes to your HTML:

```html
<button commandfor="my-dialog" command="show-modal">Open Dialog!</button>
<dialog id="my-dialog">I'm a dialog!</dialog>
```

## Supported commands

The following built-in commands (aligned with current spec) are supported:

* `toggle-popover`/`open-popover`/`close-popover`
* `show-modal`: open a `<dialog>` element in modal mode
* `close`: close a `<dialog>` open (either in modal or non-modal mode)
* `request-close`: close a `<dialog>` but emit a `cancel` event first, allowing a user to eventually prevent it. `requestClose` is only available from Safari 18.4, the `requestClose` will be polyfilled on older browsers.

## Limitations

This polyfill does not handle the aria (e.g. `aria-expanded`) of the command button the way browsers do. You are _strongly_ encouraged to handle this state yourself, to ensure your site is accessible.
