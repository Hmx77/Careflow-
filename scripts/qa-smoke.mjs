import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.CAREFLOW_BASE_URL || "http://127.0.0.1:5173";
const forbidden = ["doctor", "treatment", "insurance", "notes", "department", "patient name"];
const queueCodesSource = await readFile(new URL("../src/queueCodes.ts", import.meta.url), "utf8");
const queueCodesJs = ts.transpileModule(queueCodesSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const queueCodesModule = await import(`data:text/javascript;base64,${Buffer.from(queueCodesJs).toString("base64")}`);
const {
  clearedQueueMarkerPrefix,
  completedQueueMarkerPrefix,
  formatQueueCode,
  nextQueueCodeForSession,
  queueLocationForCategory,
  queueLocationForCode,
  queueProceedInstruction,
} = queueCodesModule;

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const receptionPage = await context.newPage();
const results = {};
const queueNumberingRows = [];

results.queueDentalStartsAtD001 = nextQueueCodeForSession(queueNumberingRows, "dental") === "D-001";
queueNumberingRows.push({ code: "D-001", status: "completed", room_location: `${completedQueueMarkerPrefix}D001` });
results.queueDentalCompletionDoesNotReuseD001 = nextQueueCodeForSession(queueNumberingRows, "dental") === "D-002";
queueNumberingRows.push({ code: "D-002", status: "waiting", room_location: "Dental Clinic" });
results.queueGeneralStartsAtG001 = nextQueueCodeForSession(queueNumberingRows, "general") === "G-001";
queueNumberingRows.push({ code: "G-001", status: "completed", room_location: `${completedQueueMarkerPrefix}G001` });
results.queueGeneralCompletionDoesNotReuseG001 = nextQueueCodeForSession(queueNumberingRows, "general") === "G-002";
queueNumberingRows.push({ code: "G-002", status: "waiting", room_location: "Nurse Station" });

const clearedRows = queueNumberingRows.map((row) => ({
  ...row,
  status: "completed",
  room_location: `${clearedQueueMarkerPrefix}${formatQueueCode(row)}`,
}));
results.queueDentalRestartsAfterClear = nextQueueCodeForSession(clearedRows, "dental") === "D-001";
results.queueGeneralRestartsAfterClear = nextQueueCodeForSession(clearedRows, "general") === "G-001";
results.queueDentalCreatesAtDentalClinic = queueLocationForCategory("dental") === "Dental Clinic";
results.queueGeneralCreatesAtNurseStation = queueLocationForCategory("general") === "Nurse Station";
results.queueCallingD001KeepsDentalClinic = queueLocationForCode("D001") === "Dental Clinic";
results.queueCallingG001KeepsNurseStation = queueLocationForCode("G001") === "Nurse Station";
results.displayDentalInstruction = queueProceedInstruction("D001") === "Please proceed to Dental Clinic";
results.displayGeneralInstruction = queueProceedInstruction("G001") === "Please proceed to Nurse Station";

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function pageText(path) {
  await receptionPage.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  return bodyText(receptionPage);
}

async function waitForText(page, text) {
  await page.waitForFunction((expected) => document.body.innerText.includes(expected), text, { timeout: 7000 });
}

const home = await pageText("/");
results.home = [
  "CareFlow helps Newcastle Medical Centre manage patient waiting privately after reception registration.",
  "Register at reception",
  "Receive your private queue code",
  "Track your turn privately",
  "Open Reception Dashboard",
  "Open Queue Display",
  "Enter Queue Code",
].every((text) => home.includes(text));

const join = await pageText("/join");
results.join = join.includes("Enter your queue code") && join.includes("View my queue status");

const patientInitial = await pageText("/q/999");
const hasSupabaseConfig = !patientInitial.includes("Supabase setup required");

if (!hasSupabaseConfig) {
  results.supabaseSetupPatient = patientInitial.includes("VITE_SUPABASE_URL") && patientInitial.includes("VITE_SUPABASE_ANON_KEY");
  const displaySetup = await pageText("/display");
  results.supabaseSetupDisplay = displaySetup.includes("Supabase setup required");
  const receptionSetup = await pageText("/reception");
  results.receptionNoGate = !receptionSetup.includes("Staff access") && receptionSetup.includes("Supabase setup required");
  await waitForText(receptionPage, "Supabase setup required");
  const receptionSetupBody = await bodyText(receptionPage);
  results.supabaseSetupReception = receptionSetupBody.includes("supabase/schema.sql");
} else {
  results.notFound = patientInitial.includes("Queue code not found");

  const displayEmpty = await pageText("/display");
  results.displayEmpty =
    displayEmpty.includes("No active queue yet") && displayEmpty.includes("No code is currently being served");

  const receptionOpen = await pageText("/reception");
  results.receptionNoGate = !receptionOpen.includes("Staff access") && receptionOpen.includes("Create Queue Number");
  await waitForText(receptionPage, "Create Queue Number");

  let reception = await bodyText(receptionPage);
  results.receptionEmpty = reception.includes("No active queue yet");

  await receptionPage.getByRole("button", { name: "Create Queue Number" }).click();
  await waitForText(receptionPage, "Queue created");
  reception = await bodyText(receptionPage);
  const createdCode = reception.match(/\b\d{3}\b/)?.[0];

  results.createdCode = Boolean(createdCode);
  results.receptionCreated =
    Boolean(createdCode) &&
    reception.includes("Copy patient link") &&
    reception.includes("Show QR code") &&
    reception.includes("Call next") &&
    reception.includes("Call code") &&
    reception.includes("Complete") &&
    reception.includes("Delay") &&
    !reception.includes("Configuration") &&
    !reception.includes("NC-");

  const patientPage = await context.newPage();
  await patientPage.goto(`${baseUrl}/q/${createdCode}`, { waitUntil: "domcontentloaded" });
  await waitForText(patientPage, createdCode);
  let patient = await bodyText(patientPage);
  results.patientWaiting =
    patient.includes("Your Queue Number") &&
    patient.includes(createdCode) &&
    patient.includes("Current status") &&
    patient.includes("Waiting") &&
    !patient.includes("People ahead") &&
    !patient.includes("Estimated wait");
  results.patientForbidden = forbidden.filter((word) => patient.toLowerCase().includes(word));

  const displayPage = await context.newPage();
  await displayPage.goto(`${baseUrl}/display`, { waitUntil: "domcontentloaded" });
  await waitForText(displayPage, createdCode);
  let display = await bodyText(displayPage);
  results.displayNext =
    display.includes("Newcastle Medical Centre") &&
    display.includes("NOW SERVING") &&
    display.includes("Waiting Queue") &&
    display.includes("Thank you for your patience") &&
    display.includes(createdCode) &&
    !display.includes("Patient Queue Display") &&
    !display.includes(["Private", "queue display"].join(" "));
  results.displayForbidden = forbidden.filter((word) => display.toLowerCase().includes(word));

  await receptionPage.getByRole("button", { name: "Call next" }).click();
  await waitForText(displayPage, "Now Serving");
  await waitForText(displayPage, createdCode);
  display = await bodyText(displayPage);
  results.displayCalled = display.includes("Now Serving") && display.includes(createdCode);

  await waitForText(patientPage, "It is your turn");
  patient = await bodyText(patientPage);
  results.patientCalled = patient.includes("It is your turn");

  await receptionPage.getByRole("button", { name: "Complete" }).click();
  await waitForText(displayPage, "No code is currently being served");
  display = await bodyText(displayPage);
  results.displayCompleted = display.includes("No code is currently being served") && !display.includes(createdCode);
  await waitForText(patientPage, "Your visit has been completed");
  patient = await bodyText(patientPage);
  results.patientCompleted = patient.includes("Your visit has been completed");

  const nurseContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const nursePage = await nurseContext.newPage();
  await nursePage.goto(`${baseUrl}/nurse`, { waitUntil: "domcontentloaded" });
  const nurseGate = await bodyText(nursePage);
  results.nurseGate = nurseGate.includes("Staff access") && nurseGate.includes("Staff PIN");
  await nursePage.locator("#staff-pin").fill("1234");
  await nursePage.getByRole("button", { name: "Open staff page" }).click();
  await waitForText(nursePage, "Nurse");
  const nurse = await bodyText(nursePage);
  results.nurse =
    nurse.includes("Call next") &&
    nurse.includes("Manage called and waiting queue numbers") &&
    !nurse.includes("Create Queue Number") &&
    !nurse.includes("Optional internal reference");
}

const adminPage = await context.newPage();
await adminPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
await waitForText(adminPage, "CareFlow helps Newcastle Medical Centre manage patient waiting privately after reception registration.");
const admin = await bodyText(adminPage);
results.adminRemoved =
  admin.includes("CareFlow helps Newcastle Medical Centre manage patient waiting privately after reception registration.") &&
  !admin.includes("Configuration") &&
  !admin.includes("Staff access");

await browser.close();

console.log(JSON.stringify(results, null, 2));

const failed = Object.entries(results).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : !value));
if (failed.length) {
  process.exitCode = 1;
}
