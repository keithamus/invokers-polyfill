(() => {
  if (
    typeof HTMLButtonElement === "undefined" ||
    "source" in ((globalThis.CommandEvent || {}).prototype || {})
  ) {
    return;
  }

  // XXX: Invoker Buttons used to dispatch 'invoke' events instead of
  // 'command' events. We should ensure to prevent 'invoke' events being
  // fired in those browsers.
  // XXX: https://bugs.chromium.org/p/chromium/issues/detail?id=1523183
  // Chrome will dispatch invoke events even with the flag disabled; so
  // we need to capture those to prevent duplicate events.
  document.addEventListener(
    "invoke",
    (e) => {
      if (e.type == "invoke" && e.isTrusted) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
  document.addEventListener(
    "command",
    (e) => {
      if (e.type == "command" && e.isTrusted) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );

  function enumerate(obj, key, enumerable = true) {
    Object.defineProperty(obj, key, {
      ...Object.getOwnPropertyDescriptor(obj, key),
      enumerable,
    });
  }

  function getRootNode(node) {
    if (node && typeof node.getRootNode === "function") {
      return node.getRootNode();
    }
    if (node && node.parentNode) return getRootNode(node.parentNode);
    return node;
  }

  const ShadowRoot = globalThis.ShadowRoot || function () {};

  const commandEventSourceElements = new WeakMap();
  const commandEventActions = new WeakMap();

  class CommandEvent extends Event {
    constructor(type, invokeEventInit = {}) {
      super(type, invokeEventInit);
      const { source, command } = invokeEventInit;
      if (source != null && !(source instanceof Element)) {
        throw new TypeError(`source must be an element`);
      }
      commandEventSourceElements.set(this, source || null);
      commandEventActions.set(
        this,
        command !== undefined ? String(command) : "",
      );
    }

    get [Symbol.toStringTag]() {
      return "CommandEvent";
    }

    get source() {
      if (!commandEventSourceElements.has(this)) {
        throw new TypeError("illegal invocation");
      }
      const source = commandEventSourceElements.get(this);
      if (!(source instanceof Element)) return null;
      const invokerRoot = getRootNode(source);
      if (invokerRoot !== getRootNode(this.target || document)) {
        return invokerRoot.host;
      }
      return source;
    }

    get command() {
      if (!commandEventActions.has(this)) {
        throw new TypeError("illegal invocation");
      }
      return commandEventActions.get(this);
    }

    get action() {
      throw new Error(
        "CommandEvent#action was renamed to CommandEvent#command",
      );
    }

    get invoker() {
      throw new Error(
        "CommandEvent#invoker was renamed to CommandEvent#source",
      );
    }
  }
  enumerate(CommandEvent.prototype, "source");
  enumerate(CommandEvent.prototype, "command");

  class InvokeEvent extends Event {
    constructor() {
      throw new Error(
        "InvokeEvent has been deprecated, it has been renamed to `CommandEvent`",
      );
    }
  }

  const invokerAssociatedElements = new WeakMap();

  function applyInvokerMixin(ElementClass) {
    Object.defineProperties(ElementClass.prototype, {
      commandForElement: {
        enumerable: true,
        configurable: true,
        set(targetElement) {
          if (this.hasAttribute("invokeaction")) {
            throw new TypeError(
              "Element has deprecated `invokeaction` attribute, replace with `command`",
            );
          } else if (this.hasAttribute("invoketarget")) {
            throw new TypeError(
              "Element has deprecated `invoketarget` attribute, replace with `commandfor`",
            );
          } else if (targetElement === null) {
            this.removeAttribute("commandfor");
            invokerAssociatedElements.delete(this);
          } else if (!(targetElement instanceof Element)) {
            throw new TypeError(`commandForElement must be an element or null`);
          } else {
            this.setAttribute("commandfor", "");
            const targetRootNode = getRootNode(targetElement);
            const thisRootNode = getRootNode(this);
            if (
              thisRootNode === targetRootNode ||
              targetRootNode === this.ownerDocument
            ) {
              invokerAssociatedElements.set(this, targetElement);
            } else {
              invokerAssociatedElements.delete(this);
            }
          }
        },
        get() {
          if (this.localName !== "button") {
            return null;
          }
          if (
            this.hasAttribute("invokeaction") ||
            this.hasAttribute("invoketarget")
          ) {
            console.warn(
              "Element has deprecated `invoketarget` or `invokeaction` attribute, use `commandfor` and `command` instead",
            );
            return null;
          }
          if (this.disabled) {
            return null;
          }
          if (this.form && this.getAttribute("type") !== "button") {
            console.warn(
              "Element with `commandFor` is a form participant. " +
                "It should explicitly set `type=button` in order for `commandFor` to work",
            );
            return null;
          }
          const targetElement = invokerAssociatedElements.get(this);
          if (targetElement) {
            if (targetElement.isConnected) {
              return targetElement;
            } else {
              invokerAssociatedElements.delete(this);
              return null;
            }
          }
          const root = getRootNode(this);
          const idref = this.getAttribute("commandfor");
          if (
            (root instanceof Document || root instanceof ShadowRoot) &&
            idref
          ) {
            return root.getElementById(idref) || null;
          }
          return null;
        },
      },
      command: {
        enumerable: true,
        configurable: true,
        get() {
          const value = this.getAttribute("command") || "";
          if (value) return value;
          return "";
        },
        set(value) {
          this.setAttribute("command", value);
        },
      },

      invokeAction: {
        enumerable: false,
        configurable: true,
        get() {
          throw new Error(
            `invokeAction is deprecated. It has been renamed to command`,
          );
        },
        set(value) {
          throw new Error(
            `invokeAction is deprecated. It has been renamed to command`,
          );
        },
      },

      invokeTargetElement: {
        enumerable: false,
        configurable: true,
        get() {
          throw new Error(
            `invokeTargetElement is deprecated. It has been renamed to command`,
          );
        },
        set(value) {
          throw new Error(
            `invokeTargetElement is deprecated. It has been renamed to command`,
          );
        },
      },
    });
  }

  function handleInvokerActivation(event) {
    if (event.defaultPrevented) return;
    if (event.type !== "click") return;
    const oldInvoker = event.target.closest(
      ":is(button, input):is([invoketarget], [invokeaction])",
    );
    if (oldInvoker) {
      console.warn(
        "Elements with `invoketarget` or `invokeaction` are deprecated and should be renamed to use `commandfor` and `command` respectively",
      );
    }

    const source = event.target.closest(
      ":is(button, input):is([commandfor], [command])",
    );
    if (!source) return;

    if (this.form && this.getAttribute("type") !== "button") {
      event.preventDefault();
      throw new Error(
        "Element with `commandFor` is a form participant. " +
          "It should explicitly set `type=button` in order for `commandFor` to work. " +
          "In order for it to act as a Submit button, it must not have command or commandfor attributes",
      );
    }

    if (source.hasAttribute("command") !== source.hasAttribute("commandfor")) {
      const attr = source.hasAttribute("command") ? "command" : "commandfor";
      const missing = source.hasAttribute("command") ? "commandfor" : "command";
      throw new Error(
        `Element with ${attr} attribute must also have a ${missing} attribute to function.`,
      );
    }

    if (
      source.command !== "show-popover" &&
      source.command !== "hide-popover" &&
      source.command !== "toggle-popover" &&
      source.command !== "show-modal" &&
      source.command !== "close" &&
      !source.command.startsWith("--")
    ) {
      console.warn(
        `"${source.command}" is not a valid command value. Custom commands must begin with --`,
      );
      return;
    }

    const invokee = source.commandForElement;
    const invokeEvent = new CommandEvent("command", {
      command: source.command,
      source,
    });
    invokee.dispatchEvent(invokeEvent);
    if (invokeEvent.defaultPrevented) return;

    const command = invokeEvent.command.toLowerCase();

    if (invokee.popover) {
      const canShow = !invokee.matches(":popover-open");
      const shouldShow =
        canShow && (command === "toggle-popover" || command === "show-popover");
      const shouldHide = !canShow && command === "hide-popover";

      if (shouldShow) {
        invokee.showPopover();
      } else if (shouldHide) {
        invokee.hidePopover();
      }
    } else if (invokee.localName === "dialog") {
      const canShow = !invokee.hasAttribute("open");
      const shouldShow = canShow && command === "show-modal";
      const shouldHide = !canShow && command === "close";

      if (shouldShow) {
        invokee.showModal();
      } else if (shouldHide) {
        invokee.close();
      }
    }
  }

  function setupInvokeListeners(target) {
    target.addEventListener("click", handleInvokerActivation, true);
  }

  function observeShadowRoots(ElementClass, callback) {
    const attachShadow = ElementClass.prototype.attachShadow;
    ElementClass.prototype.attachShadow = function (init) {
      const shadow = attachShadow.call(this, init);
      callback(shadow);
      return shadow;
    };
    const attachInternals = ElementClass.prototype.attachInternals;
    ElementClass.prototype.attachInternals = function () {
      const internals = attachInternals.call(this);
      if (internals.shadowRoot) callback(internals.shadowRoot);
      return internals;
    };
  }

  applyInvokerMixin(globalThis.HTMLButtonElement || function () {});

  observeShadowRoots(globalThis.HTMLElement || function () {}, (shadow) => {
    setupInvokeListeners(shadow);
  });

  setupInvokeListeners(document);

  Object.defineProperty(window, "CommandEvent", {
    value: CommandEvent,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "InvokeEvent", {
    value: InvokeEvent,
    configurable: true,
    writable: true,
  });
})();
