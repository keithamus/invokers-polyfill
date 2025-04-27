export {};

declare global {
  interface CommandEvent extends Event {
    source: Element;
    command: string;
  }
  interface HTMLButtonElement {
    commandForElement: HTMLElement | null;
    command: '' | 'show-modal' | 'close' | 'hide-popover' | 'toggle-popover' | 'show-popover' | `--${string}`;
  }
  interface Window {
    CommandEvent: CommandEvent;
  }
}
