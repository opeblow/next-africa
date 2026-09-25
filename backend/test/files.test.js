import { test } from "node:test";
import assert from "node:assert/strict";
import { readCaptureFile } from "../src/lib/capture-file.js";

function pdf(text) {
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(document)); document += `${i+1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(document);
  document += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(document).toString("base64");
}
test("PDF text is parsed from the document, not decoded as raw bytes", async () => {
  const result = await readCaptureFile("request.pdf", pdf("Send the client proposal by Friday at 3pm."));
  assert.match(result.text, /Send the client proposal by Friday/);
  assert.ok(!result.text.includes("/Type /Catalog"));
});
test("unsupported files and mislabeled images are rejected", async () => {
  await assert.rejects(readCaptureFile("file.docx", Buffer.from("data").toString("base64")), /Attach a PDF/);
  await assert.rejects(readCaptureFile("file.png", Buffer.from("data").toString("base64")), /not a valid/);
});
