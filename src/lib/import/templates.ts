import ExcelJS from "exceljs";
import JSZip from "jszip";

// Downloadable templates for question import and bulk course upload. Each has an
// Instructions sheet, real column headings, sample rows and drop-down lists where a column
// takes fixed values.

const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1701C1" } };
const NOTE_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F3F0" } };

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; width: number; note: string }[], rows: (string | number)[][]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = HEAD_FILL;
  head.alignment = { vertical: "middle", wrapText: true };
  head.height = 22;
  columns.forEach((c, i) => { head.getCell(i + 1).note = c.note; });
  for (const r of rows) ws.addRow(r).alignment = { vertical: "top", wrapText: true };
  return ws;
}

function list(ws: ExcelJS.Worksheet, column: number, values: string[], rows = 500) {
  // Excel limits an inline list to 255 characters; long lists (subjects) use a hidden sheet.
  const inline = `"${values.join(",")}"`;
  for (let r = 2; r <= rows; r++) {
    ws.getCell(r, column).dataValidation = { type: "list", allowBlank: true, formulae: [inline.length <= 255 ? inline : values.join(",")], showErrorMessage: true, errorTitle: "Choose from the list", error: `Use one of: ${values.join(", ")}` };
  }
}

function instructions(wb: ExcelJS.Workbook, title: string, lines: string[]) {
  const ws = wb.addWorksheet("Instructions");
  ws.getColumn(1).width = 120;
  ws.addRow([title]).font = { bold: true, size: 14 };
  ws.addRow([]);
  for (const l of lines) {
    const row = ws.addRow([l]);
    row.alignment = { wrapText: true, vertical: "top" };
    if (/^[A-Z][A-Za-z ]+:$/.test(l)) { row.font = { bold: true }; row.getCell(1).fill = NOTE_FILL; }
  }
}

const QUESTION_TYPES = ["SINGLE", "MULTIPLE", "TRUE_FALSE", "FILL_BLANK", "MATCHING", "SHORT_ANSWER"];
const QUESTION_COLUMNS = [
  { header: "Type", width: 15, note: "SINGLE, MULTIPLE, TRUE_FALSE, FILL_BLANK, MATCHING or SHORT_ANSWER. Leave empty to work it out from the options and answer." },
  { header: "Question", width: 50, note: "The question text (required)." },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ header: `Option ${n}`, width: 22, note: n <= 2 ? "An answer choice. FILL_BLANK: an accepted answer. MATCHING: left=right." : "Optional extra choice." })),
  { header: "Correct", width: 12, note: "The correct option: its number (2), letter (B) or text. MULTIPLE: two or more, e.g. 1,3 or A,C. Empty for FILL_BLANK, MATCHING and SHORT_ANSWER." },
  { header: "Points", width: 8, note: "Whole number, default 1." },
  { header: "Explanation", width: 45, note: "Shown to the learner after they submit. For SHORT_ANSWER, a model answer for the reviewer." },
  { header: "Scenario", width: 40, note: "Optional case text shown above the question." },
];
const QUESTION_EXAMPLES: (string | number)[][] = [
  ["SINGLE", "Which feature moves a running VM to another host with no downtime?", "vSphere HA", "vMotion", "Storage DRS", "DPM", "", "", "B", 1, "vMotion moves running VMs between hosts without interrupting them.", ""],
  ["MULTIPLE", "Which of these need vCenter Server?", "vMotion", "DRS", "vSphere HA", "Running a VM on one host", "", "", "1,2,3", 2, "Cluster features need vCenter.", ""],
  ["TRUE_FALSE", "RAID is a replacement for backup.", "True", "False", "", "", "", "", "False", 1, "RAID protects against disk failure, not deletion or ransomware.", ""],
  ["FILL_BLANK", "A GSTIN has ___ characters.", "15", "fifteen", "", "", "", "", "", 1, "The GST Identification Number has 15 characters.", ""],
  ["MATCHING", "Match each term to its meaning.", "LAN=Network in a building", "WAN=Network between sites", "VLAN=Logical network on a switch", "", "", "", "", 2, "Basic networking terms.", ""],
  ["SHORT_ANSWER", "In two sentences, explain why backups must be tested.", "", "", "", "", "", "", "", 3, "Model answer: untested backups often fail when needed; tests prove restores work.", ""],
];

export async function questionsTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LMS";
  instructions(wb, "Questions template", [
    "Fill in the Questions sheet: one row per question. Delete the sample rows before importing.",
    "How to answer:",
    "Type: choose from the list. SINGLE has one correct option; MULTIPLE has two or more; TRUE_FALSE uses the options True and False; FILL_BLANK lists the accepted answers as options; MATCHING writes each option as left=right; SHORT_ANSWER has no options and is marked by a reviewer.",
    "Correct: the number (2), letter (B) or text of the correct option. For MULTIPLE, separate them with commas (1,3 or A,C).",
    "Points: whole numbers; leave empty for 1.",
    "Where to import:",
    "Admin portal → Assessments → open an assessment → Import questions from a file. Or add the file as the questions file when you upload a course.",
    "Every row is checked before anything is imported. If a row has a mistake, nothing is imported and you are told which row to fix.",
  ]);
  const ws = sheet(wb, "Questions", QUESTION_COLUMNS, QUESTION_EXAMPLES);
  list(ws, 1, QUESTION_TYPES);
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: "visible" }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function bulkCourseTemplate(subjects: string[], departments: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LMS";
  instructions(wb, "Bulk course upload template", [
    "Use this workbook to create many courses at once, with their modules, lessons and completion-check questions. Delete the sample rows first.",
    "Courses:",
    "One row per course. Course code is your own short reference (C1, C2, ...) used to link the other sheets. Subject must be one of the portal's subjects (drop-down). Level: Basic, Intermediate or Advanced. Departments: leave empty for everyone, or list departments separated by commas. Publish: Yes to publish straight away. Mandatory: Yes to assign the course to its departments, with an optional due date (YYYY-MM-DD).",
    "Modules:",
    "Optional. One row per module: course code, module number (1, 2, 3 ...), title and estimated minutes.",
    "Lessons:",
    "One row per lesson, in the order learners should take them. Type: File (a PDF, PowerPoint, Word, Excel, MP4, MOV or MKV file), Text (write the lesson in the Text column) or Link (a web address). File name must match a file you upload with the workbook, exactly, including the extension. Module number links the lesson to a module. Caption file: for videos, a .vtt captions file (needed before a course with videos can be published).",
    "Questions:",
    "Optional. The completion check for each course: course code plus the same columns as the questions template (Type, Question, Option 1-6, Correct, Points, Explanation).",
    "Uploading:",
    "Admin portal → Courses → Bulk upload. Choose this workbook, then the lesson files: select them all, or put them in one ZIP file. Everything is checked first: if anything is wrong, nothing is created and you get a list of what to fix.",
  ]);
  const courses = sheet(wb, "Courses", [
    { header: "Course code", width: 12, note: "Your short reference, e.g. C1. Unique in this workbook." },
    { header: "Title", width: 40, note: "Course title (required)." },
    { header: "Subject", width: 22, note: "One of the portal's subjects." },
    { header: "Level", width: 14, note: "Basic, Intermediate or Advanced." },
    { header: "Description", width: 50, note: "A sentence or two for the catalogue." },
    { header: "Departments", width: 28, note: "Empty = everyone. Otherwise departments separated by commas." },
    { header: "Pass mark", width: 10, note: "1-100, default 70." },
    { header: "Publish", width: 10, note: "Yes or No (default No: saved as a draft)." },
    { header: "Mandatory", width: 11, note: "Yes to assign to the departments listed (needs Publish = Yes)." },
    { header: "Due date", width: 12, note: "Optional, YYYY-MM-DD." },
  ], [
    ["C1", "Month-end closing for accounts", subjects[0] ?? "Accounts", "Basic", "Steps and checks for closing the books each month.", departments[0] ?? "", 70, "Yes", "Yes", ""],
    ["C2", "Introduction to our ERP", subjects[1] ?? subjects[0] ?? "IT INFRA", "Basic", "Finding your way around the ERP.", "", 70, "No", "No", ""],
  ]);
  if (subjects.length > 0) {
    const lists = wb.addWorksheet("Lists", { state: "veryHidden" });
    subjects.forEach((s, i) => { lists.getCell(i + 1, 1).value = s; });
    for (let r = 2; r <= 500; r++) {
      courses.getCell(r, 3).dataValidation = { type: "list", allowBlank: true, formulae: [`Lists!$A$1:$A$${subjects.length}`], showErrorMessage: true, errorTitle: "Choose a subject", error: "Choose a subject from the list" };
    }
  }
  list(courses, 4, ["Basic", "Intermediate", "Advanced"]);
  list(courses, 8, ["Yes", "No"]);
  list(courses, 9, ["Yes", "No"]);
  sheet(wb, "Modules", [
    { header: "Course code", width: 12, note: "From the Courses sheet." },
    { header: "Module number", width: 15, note: "1, 2, 3 ... in order." },
    { header: "Module title", width: 40, note: "Required." },
    { header: "Minutes", width: 10, note: "Estimated minutes (optional)." },
  ], [["C1", 1, "Before the close", 30], ["C1", 2, "Closing the books", 45]]);
  const lessons = sheet(wb, "Lessons", [
    { header: "Course code", width: 12, note: "From the Courses sheet." },
    { header: "Module number", width: 15, note: "Optional: the module this lesson belongs to." },
    { header: "Lesson title", width: 36, note: "Leave empty for a file to use the file name." },
    { header: "Type", width: 10, note: "File, Text or Link." },
    { header: "File name", width: 32, note: "For File lessons: the exact name of an uploaded file, e.g. 01 Checklist.pptx." },
    { header: "Text", width: 50, note: "For Text lessons: the lesson text. Blank lines start new paragraphs; lines starting with - are bullets." },
    { header: "URL", width: 32, note: "For Link lessons: https://..." },
    { header: "Caption file", width: 22, note: "For video files: the name of an uploaded .vtt captions file." },
  ], [
    ["C1", 1, "Month-end checklist", "File", "01 Month-end checklist.pptx", "", "", ""],
    ["C1", 2, "Bank reconciliation", "File", "02 Bank reconciliation.pdf", "", "", ""],
    ["C1", 2, "Key points", "Text", "", "Reconcile every bank account before closing.\n- Match the statement to the ledger\n- Explain every difference", "", ""],
    ["C2", "", "ERP training video", "File", "ERP tour.mp4", "", "", "ERP tour.vtt"],
  ]);
  list(lessons, 4, ["File", "Text", "Link"]);
  const qs = sheet(wb, "Questions", [{ header: "Course code", width: 12, note: "From the Courses sheet." }, ...QUESTION_COLUMNS],
    QUESTION_EXAMPLES.slice(0, 3).map((r) => ["C1", ...r]));
  list(qs, 2, QUESTION_TYPES);
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: "visible" }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// A small Word document showing the question layout the Word importer reads.
export async function questionsWordExample(): Promise<Buffer> {
  const paras = [
    ["Questions for import", true],
    ["Write each question like the examples below. Start a question with Q1., Q2. (or 1., 2.), write options as A), B), and add an Answer line. Type, Points, Explanation and Scenario lines are optional.", false],
    ["", false],
    ["Q1. Which feature moves a running VM to another host with no downtime?", false], ["A) vSphere HA", false], ["B) vMotion", false], ["C) Storage DRS", false],
    ["Answer: B", false], ["Explanation: vMotion moves running VMs between hosts without interrupting them.", false], ["", false],
    ["Q2. Which of these need vCenter Server?", false], ["A) vMotion", false], ["B) DRS", false], ["C) Running one VM on one host", false],
    ["Answer: A, B", false], ["Points: 2", false], ["", false],
    ["Q3. RAID is a replacement for backup.", false], ["A) True", false], ["B) False", false], ["Answer: False", false], ["", false],
    ["Q4. A GSTIN has how many characters?", false], ["Type: FILL_BLANK", false], ["Answer: 15 | fifteen", false], ["", false],
    ["Q5. In two sentences, explain why backups must be tested.", false], ["Type: SHORT_ANSWER", false], ["Points: 3", false],
    ["Explanation: Untested backups often fail when needed; regular tests prove restores work.", false],
  ] as const;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = paras.map(([t, bold]) => `<w:p><w:r>${bold ? "<w:rPr><w:b/><w:sz w:val=\"32\"/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}
