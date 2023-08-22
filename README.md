# Invoker Buttons

## Summary

Adding an `invokertarget` and `invokeraction` to `<button>` elements, and
`<input type="button">`/`<input type="reset">` elements would allow authors to
assign behaviour to buttons in a more accessible and declarative way, while
reducing bugs and simplifying the amount of JavaScript pages are required to
ship for interactivity.

## Background

All elements within the DOM are capable of having interactions added to them. A
long while ago this took the form of adding inline JavaScript to an event
attribute, such as `<button onclick="other.open()"></button>`. Inline JavaScript
has (rightly so) fallen out of favour due to the security and maintainability
concerns. Newer pages may instead introduce _more_ JavaScript to imperatively
discover elements and call `addEventListner('click', ...)` to invoke the same
behaviour. These patterns reduce developer experience and introduce more
boilerplate and friction, while remediating security and maintainability
concerns. Some frameworks attempt to reintroduce the developer experience of
inline handlers by introducing new JavaScript or HTML shorthands, such as
React's `onclick={...}`, Vue's `@click=".."` or HTMX's `hx-trigger="click"`.

There has also been a rise in the desire to customise controls for components.
Many sites, for example, introduce custom controls for File Uploads or dropdown
menus. These often require a large amount of work to _reintroduce_ the built in
functionality of those controls, and often unintentionally sacrifice
accessibility in doing so.

With the new `popover` attribute, we saw a straightforward declarative way to
tell the DOM that a button was interested in being a participant of the popover
interaction. `popovertarget` would indicate to a browser that if that button was
interacted with, it should open the element the `popovertarget` value pointed
to. This allows for popovers to be created and interacted with - in an
accessible and reliable way - without writing any additional JavaScript, which
is a very welcome addition. While `popovertarget` sufficiently captured the use
case for popovers, it fell short of providing the same developer & user
experience for other interactive elements such as `<dialog>`, `<details>`,
`<video>`, `<input type="file">`, and so on. This proposal attempts to redress
the balance.

## Proposed Plan

In the style of `popovertarget`, this document proposes we add `invokertarget`,
and `invokeraction` as available attributes to `<button>`,
`<input type="button">` and `<input type="reset">` elements.

The `invokertarget` should be an IDREF pointing to an element within the
document. `.invokerTarget` also exists on the element to imperatively assign a
node to be the invoker target, allowing for cross-root invokers. `invokeraction`
is a freeform hint to the Invokee. If `invokeraction` is a falsey value (`''`,
`null`, etc.) then it will default to `'auto'`. Values which are not recognised
will be ignored, and should not be assumed to be `auto`. Built-in interactive
elements have built-in behaviours (detailed below) but also Invokees will
dispatch events when Invoked, allowing custom code to take control of
invocations without having to manually wire up DOM nodes for the variety of
invocation patterns.

### Example Code

#### Popovers

When pointing to a `popover`, `invokertarget` acts like much like
`popovertarget`, allowing the toggling of popovers.

```html
<button invokertarget="my-popover">Open Popover</button>
<!-- Effectively the same as popovertarget="my-popover" -->

<div id="my-popover" popover="auto">Hello world</div>
```

#### Dialogs

When pointing to a `<dialog>`, `invokertarget` can toggle a `<dialog>`'s
openness.

```html
<button invokertarget="my-dialog">Open Dialog</button>

<dialog id="my-dialog">
  Hello world!

  <button invokertarget="my-dialog" invokeraction="closeDialog">Close</button>
</dialog>
```

#### Details

When pointing to a `<details>`, `invokertarget` can toggle a `<details>`'s
openness.

```html
<button invokertarget="my-details">Open Details</button>
<!-- Can be used to replicate the `<summary>` interaction -->

<details id="my-details">
  <summary>Summary...</summary>
  Hello world!
</details>
```

#### Customizing `input type=file`

Pointing an `invokertarget` to an `<input type=file>` acts the same as the
rendered button _within_ the input; and can be used to declare a customised
alternative button to the input's button.

```html
<button invokertarget="my-file">Pick a file...</button>

<input id="my-file" type="file" />
```

#### Customizing video/audio controls

The `<video>` and `<audio>` tags have many interactions, here `invokeraction`
shines, allowing multiple buttons to handle different interactions with the
video player.

```html
<button invokertarget="my-video">Play/Pause</button>
<button invokertarget="my-video" invokeraction="mute">Mute</button>

<video id="my-video"></video>
```

#### Custom behaviour

_Invokers_ will dispatch events on the _Invokee_ element, allowing for custom
JavaScript to be triggered without having to wire up manual event handlers to
the Invokers.

```html
<button invokertarget="my-custom">Invoke a div... to do something?</button>
<button invokertarget="my-custom" invokeraction="frobulate">Frobulate</button>

<div id="my-custom"></div>

<script>
  document.getElementById("my-custom").addEventListener("invoke", (e) => {
    if (e.action === "auto") {
      console.log("invoked an auto action!");
    } else if (e.action === "frobulate") {
      alert("Successfully frobulated the div");
    }
  });
</script>
```

### Terms

- Invoker: An invoker is a button element (that is a `<button>`,
  `<input type="button>`, or `<input type="reset">`) that has an `invokertarget`
  attribute set.
- Invokee: An element which is referenced to by an Invoker, via the
  `invokertarget` attribute.
- Invoked: An Invoker can be interacted with via Click, Touch, or keyboard press
  (among other input methods). This causes the _Invoker_ to be _Invoked_.

### Accessibility

The _Invoker_ implicitly receives `aria-controls=IDREF` to announce to Assistive
Technologies that this _Invoker_ controls another element (the _Invokee_).

If the _Invokee_ has the `popover` attribute, the _Invoker_ implicitly receives
an `aria-expanded=` attribute which will match the sate of the popovers
openness. It will be `aria-expanded=true` when the `popover` is `:popover-open`
and `aria-expanded=false` otherwise.

If the _Invokee_ is a `<details>` element the _Invoker_ implicitly receives
an`aria-expanded=`attribute which will match the sate of the _Invokee_'s
openness. It will be`aria-expanded=true`when the _Invokee_ is open
and`aria-expanded=false` otherwise.

If the _Invokee_ is a `<dialog>` element the _Invoker_ implicitly receives
an`aria-haspopup=dialog`, and an`aria-expanded=`attribute which will match the
sate of the _Invokee_'s openness. It will be`aria-expanded=true`when the
_Invokee_ is open and`aria-expanded=false` otherwise.

### Interaction

When the _Invoker_ is _Invoked_ it will dispatch a `new InvokeEvent()` on the
_Invokee_. The `InvokeEvent` has the following properties:

- `relatedTarget` - this points to the _Invoker_ element.
- `action` - this is the value of the `invokeraction=` attribute, or `'auto'` if
  the `invokeraction=` attribute is falsey.

`InvokeEvent` does not bubble, but it is cancellable.

### Defaults

The `InvokeEvent` has a default behaviour depending on the element. Non-trusted
events are ignored, but can be useful for implementers. Trusted events do the
following. Note that this list is ordered and higher rules take precedence:

| Invokee Type          | `action` hint    | Behaviour                                                                           |
| :-------------------- | :--------------- | :---------------------------------------------------------------------------------- |
| `<* popover>`         | `'auto'`         | Call `.togglePopover()` on the invokee                                              |
| `<* popover>`         | `'hidePopover'`  | Call `.hidePopover()` on the invokee                                                |
| `<* popover>`         | `'showPopover'`  | Call `.showPopover()` on the invokee                                                |
| `<dialog>`            | `'auto'`         | If the `<dialog>` is not `open`, call `showModal()`, otherwise cancel the dialog    |
| `<dialog>`            | `'openDialog'`   | If the `<dialog>` is not `open`, call `showModal()`                                 |
| `<dialog>`            | `'closeDialog'`  | If the `<dialog>` is `open`, cancel the dialog                                      |
| `<details>`           | `'auto'`         | If the `<details>` is `open`, then close it, otherwise open it                      |
| `<details>`           | `'openDetails'`  | If the `<details>` is not `open`, then open it                                      |
| `<details>`           | `'closeDetails'` | If the `<details>` is `open`, then close it                                         |
| `<input type="file">` | `'auto'`         | Open the OS file picker, in other words act as if the input itself had been clicked |
| `<video>`             | `'auto'`         | Toggle the `.playing` value                                                         |
| `<video>`             | `'pauseVideo'`   | If `.playing` is `true`, set it tto `false`                                         |
| `<video>`             | `'playVideo'`    | If `.playing` is `false`, set it tto `true`                                         |
| `<video>`             | `'muteVideo'`    | Toggle the `.muted` value                                                           |
| `<audio>`             | `'auto'`         | Toggle the `.playing` value                                                         |
| `<audio>`             | `'pauseAudio'`   | If `.playing` is `true`, set it tto `false`                                         |
| `<audio>`             | `'playAudio'`    | If `.playing` is `false`, set it tto `true`                                         |
| `<audio>`             | `'muteAudio'`    | Toggle the `.muted` value                                                           |
| `<canvas>`            | `'clearCanvas'`  | Remove all image data on the canvas (effectively (.clearRect(0, 0, width, height)`) |

### Invokers Role in Custom Elements

As the `Invoker` dispatches an `InvokeEvent()` on the Invokee element, Custom
Elements can make use of this behaviour. Consider the following:

```html
<button invokertarget="my-element" invokeraction="spin">Spin the widget</button>

<spin-widget id="my-element"></spin-widget>
<script>
  customElements.define(
    "spin-widget",
    class extends HTMLElement {
      connectedCallback() {
        this.addEventListener("invoke", (e) => {
          if (e.action === "spin") {
            this.spin();
          }
        });
      }
    },
  );
</script>
```

### PAQ (Potentially Asked Questions)

#### What about adding defaults for `<form>`?

Defaults for `<form>` are intentionally omitted as this proposal does not aim to
replace Reset or Submit buttons. If you want to control forms, use those.

#### What about adding defaults for `<a>`?

Defaults for `<a>` are intentionally omitted as this proposal does not aim to
replace anchors. If you intend to produce a page navigation, use an `<a>` tag.

#### What does this mean for `popovertarget`?

Whilst this _does_ replicate `popovertarget`'s functionality, it does not
necessarily mean `popovertarget` gets removed from the spec.
