# Invoker Buttons Polyfill

This polyfills the HTML `invoketarget`/`invokeaction` attributes, as proposed by the Open UI group.

To see the explainer of these, please visit https://open-ui.org/components/invokers.explainer/.

## How to use

If you're using npm, you only need to import the package, like so:

```js
import "invokers-polyfill";
```

Alternatively, if you're not using a package manager, you can use the `unpkg` script:

```html
<script
  type="module"
  async
  src="https://unpkg.com/invokers-polyfill@latest/invoker.min.js"
></script>
```

With the module imported, you can add `invoketarget` and `invokeaction` attributes to your HTML:

```html
<button invoketarget="my-dialog">Open Dialog!</button>
<dialog id="my-dialog">I'm a dialog!</dialog>
```
