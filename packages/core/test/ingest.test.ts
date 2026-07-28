import { describe, it, expect } from "vitest";
import {
  IngestError,
  normalizeExtractedText,
  MAX_UPLOAD_BYTES,
  MIN_TEXT_CHARS,
  assertUsableText,
  joinTextItems,
  modeForFile,
  assertUploadSize,
} from "../src/ingest";

describe("modeForFile — which extractor a file needs", () => {
  it("routes each supported extension to its mode", () => {
    expect(modeForFile("resume.pdf")).toBe("pdf");
    expect(modeForFile("resume.docx")).toBe("docx");
    expect(modeForFile("resume.txt")).toBe("text-file");
    expect(modeForFile("notes.md")).toBe("text-file");
    expect(modeForFile("posting.png")).toBe("image");
    expect(modeForFile("posting.jpg")).toBe("image");
    expect(modeForFile("posting.jpeg")).toBe("image");
    expect(modeForFile("posting.webp")).toBe("image");
  });

  it("is case-insensitive, because macOS exports .PDF", () => {
    expect(modeForFile("RESUME.PDF")).toBe("pdf");
    expect(modeForFile("Shot.PNG")).toBe("image");
  });

  it("picks the mode from the LAST extension, not the first", () => {
    expect(modeForFile("my.resume.2026.pdf")).toBe("pdf");
  });

  it("rejects legacy .doc by name — mammoth reads .docx only, and a wrong-format error mid-parse is worse than an upfront one", () => {
    expect(() => modeForFile("resume.doc")).toThrow(IngestError);
    expect(() => modeForFile("resume.doc")).toThrow(/\.docx/);
  });

  it("rejects an unsupported extension and names what IS supported", () => {
    expect(() => modeForFile("resume.pages")).toThrow(IngestError);
    expect(() => modeForFile("resume.pages")).toThrow(/PDF/i);
  });

  it("rejects a file with no extension at all", () => {
    expect(() => modeForFile("resume")).toThrow(IngestError);
  });
});

describe("joinTextItems — pdf.js text runs to a document string", () => {
  const item = (str: string, hasEOL = false) => ({ str, hasEOL });

  it("concatenates runs on one line without inventing spaces", () => {
    // pdf.js splits runs at font changes: "Air"+"flow" is one word, and a
    // join(" ") here would corrupt it into "Air flow".
    expect(joinTextItems([item("Air"), item("flow")])).toBe("Airflow");
  });

  it("breaks a line where pdf.js reports hasEOL", () => {
    expect(joinTextItems([item("JOB TITLE", true), item("Data Analyst")])).toBe(
      "JOB TITLE\nData Analyst",
    );
  });

  it("keeps the spaces pdf.js already encodes in its runs", () => {
    expect(joinTextItems([item("3+ years of "), item("SQL")])).toBe("3+ years of SQL");
  });

  it("collapses a run of blank lines to at most one, so page gaps don't become paragraphs", () => {
    const items = [
      item("end of page", true),
      item("", true),
      item("", true),
      item("", true),
      item("next page"),
    ];
    expect(joinTextItems(items)).toBe("end of page\n\nnext page");
  });

  it("strips trailing whitespace from each line", () => {
    expect(joinTextItems([item("Airflow   ", true), item("SQL  ")])).toBe("Airflow\nSQL");
  });

  it("returns an empty string for no items rather than throwing", () => {
    expect(joinTextItems([])).toBe("");
  });

  it("survives items missing hasEOL entirely (older pdf.js shapes)", () => {
    expect(joinTextItems([{ str: "a" }, { str: "b" }])).toBe("ab");
  });
});

describe("assertUsableText — an empty extraction must be loud", () => {
  it("accepts text past the minimum", () => {
    const good = "Data Analyst. Requires 3+ years of SQL and dbt experience across teams.";
    expect(() => assertUsableText(good, "resume.pdf")).not.toThrow();
  });

  it("throws on a scanned PDF that yielded no text layer", () => {
    expect(() => assertUsableText("", "scan.pdf")).toThrow(IngestError);
    expect(() => assertUsableText("   \n  \n ", "scan.pdf")).toThrow(IngestError);
  });

  it("throws below the minimum character count and names the file", () => {
    expect(() => assertUsableText("too short", "resume.pdf")).toThrow(/resume\.pdf/);
  });

  it("counts characters after trimming, not before", () => {
    const padded = " ".repeat(500) + "short" + " ".repeat(500);
    expect(() => assertUsableText(padded, "f.pdf")).toThrow(IngestError);
  });

  it("uses MIN_TEXT_CHARS as the boundary", () => {
    expect(() => assertUsableText("x".repeat(MIN_TEXT_CHARS), "f.pdf")).not.toThrow();
    expect(() => assertUsableText("x".repeat(MIN_TEXT_CHARS - 1), "f.pdf")).toThrow(IngestError);
  });
});

describe("assertUploadSize — reject before reading, not after", () => {
  it("accepts a normal resume", () => {
    expect(() => assertUploadSize(400_000, "resume.pdf")).not.toThrow();
  });

  it("throws past the cap and states the limit in MB", () => {
    expect(() => assertUploadSize(MAX_UPLOAD_BYTES + 1, "huge.pdf")).toThrow(IngestError);
    expect(() => assertUploadSize(MAX_UPLOAD_BYTES + 1, "huge.pdf")).toThrow(/MB/);
  });

  it("accepts exactly the cap", () => {
    expect(() => assertUploadSize(MAX_UPLOAD_BYTES, "edge.pdf")).not.toThrow();
  });

  it("throws on an empty file", () => {
    expect(() => assertUploadSize(0, "empty.pdf")).toThrow(IngestError);
  });
});

describe("normalizeExtractedText — one shape for every extractor", () => {
  it("collapses runs of blank lines to a single paragraph break", () => {
    expect(normalizeExtractedText("A\n\n\n\nB")).toBe("A\n\nB");
  });

  it("strips trailing whitespace per line", () => {
    expect(normalizeExtractedText("A   \nB\t")).toBe("A\nB");
  });

  it("normalizes CRLF, which is what Word-authored files carry", () => {
    expect(normalizeExtractedText("A\r\nB")).toBe("A\nB");
  });

  it("trims the document ends but keeps interior structure", () => {
    expect(normalizeExtractedText("\n\n A\n\nB \n\n")).toBe("A\n\nB");
  });

  it("leaves already-clean text untouched", () => {
    expect(normalizeExtractedText("A\n\nB")).toBe("A\n\nB");
  });
});
