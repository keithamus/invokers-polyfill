interface InvokerMixin {
  commandForElement: HTMLElement | null;
  command: string;
}

declare global {
  interface CommandEvent extends Event {
    invoker: Element;
    command: string;
  }
  /* eslint-disable @typescript-eslint/no-empty-interface */
  interface HTMLButtonElement extends InvokerMixin {}
  interface HTMLInputElement extends InvokerMixin {}
  /* eslint-enable @typescript-eslint/no-empty-interface */
  interface Window {
    CommandEvent: CommandEvent;
  }
}
