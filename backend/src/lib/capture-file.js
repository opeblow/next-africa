import { PDFParse } from "pdf-parse";

export async function readCaptureFile(filename, base64) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw Object.assign(new Error("That file could not be read. Please attach it again."), { status: 400 });
  }
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw Object.assign(new Error("Choose a file smaller than 8 MB."), { status: 400 });
  const ext = filename.split(".").pop().toLowerCase();
  const signatures = {
    png: bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    jpg: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    jpeg: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    webp: bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
  };
  if (Object.hasOwn(signatures, ext)) {
    if (!signatures[ext]) throw Object.assign(new Error("This image is not a valid PNG, JPEG or WebP."), { status: 400 });
    const mime = ext === "jpg" ? "jpeg" : ext;
    return { text: "Extract commitments from this image. Do not invent text you cannot read.", image: `data:image/${mime};base64,${base64}` };
  }
  if (ext === "pdf") {
    if (!bytes.toString("ascii", 0, 5).startsWith("%PDF-")) throw Object.assign(new Error("This is not a valid PDF."), { status: 400 });
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText({ first: 20 });
      if (result.total > 20) throw new Error("Please attach a PDF with at most 20 pages.");
      if (result.text.trim().length < 20) throw new Error("This PDF has no readable text. Attach a screenshot of the relevant page instead.");
      if (result.text.length > 20000) throw new Error("This PDF is too long. Attach only the relevant pages.");
      return { text: result.text };
    } catch (error) {
      throw Object.assign(new Error(error.message || "Could not read this PDF."), { status: 400 });
    } finally { await parser.destroy(); }
  }
  if (!["txt", "md", "csv"].includes(ext)) throw Object.assign(new Error("Attach a PDF, PNG, JPEG, WebP, TXT, Markdown or CSV file."), { status: 400 });
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(); }
  catch { throw Object.assign(new Error("This text file must use UTF-8 encoding."), { status: 400 }); }
  if (text.length < 3 || text.length > 20000 || text.includes("\0")) throw Object.assign(new Error("Choose a readable text file between 3 and 20,000 characters."), { status: 400 });
  return { text };
}
