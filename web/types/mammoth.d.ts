// mammoth ships no type declarations, and there is no @types package for it.
// We use exactly one function, so declare exactly that rather than pulling in a
// dependency for types we don't need.
//
// The prebuilt browser bundle is imported (rather than the "mammoth" main entry)
// because it is mammoth's documented browser target and is self-contained — the
// main entry relies on the package's `browser` field remapping its unzip and
// file-reading internals, which is one more bundler behaviour to depend on.
declare module "mammoth/mammoth.browser.js" {
  export interface MammothMessage {
    type: string;
    message: string;
  }
  export interface RawTextResult {
    /** Plain text; each paragraph followed by two newlines. */
    value: string;
    messages: MammothMessage[];
  }
  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<RawTextResult>;
}
