export class UnreadableFileError extends Error {
  constructor(cause?: unknown) {
    super("Could not extract readable text from the file", { cause });
    this.name = "UnreadableFileError";
  }
}
