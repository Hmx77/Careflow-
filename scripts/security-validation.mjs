import { readFile } from "node:fs/promises";

const stageA = await readFile(new URL("../supabase/migrations/20260922_private_queue_names_stage_a_additive.sql", import.meta.url), "utf8");
const stageB = await readFile(new URL("../supabase/migrations/20260922_private_queue_names_stage_b_lockdown.sql", import.meta.url), "utf8");
const migration = `${stageA}\n${stageB}`;
const queueStore = await readFile(new URL("../src/queueStore.ts", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");

const checks = {
  stageAPreservesLegacyQueueGrants:
    !/revoke all privileges on table public\.queue from/i.test(stageA) &&
    !/grant select .* on public\.queue to anon/i.test(stageA) &&
    !/drop policy if exists "CareFlow queue (read|insert|update|delete) access" on public\.queue/i.test(stageA),
  stageBCarriesQueueLockdown:
    /revoke all privileges on table public\.queue from PUBLIC, anon, authenticated/i.test(stageB) &&
    /grant select \(id, code, created_at, status, room_location\) on public\.queue to anon/i.test(stageB),
  stageBDropsAnonymousWritePolicies:
    /cmd in \('INSERT', 'UPDATE', 'DELETE', 'ALL'\)/i.test(stageB) &&
    /'anon' = any \(roles\)/i.test(stageB) &&
    /drop policy if exists "CareFlow queue insert access" on public\.queue/i.test(stageB) &&
    /drop policy if exists "CareFlow queue update access" on public\.queue/i.test(stageB),
  queueRevokesBroadLegacyPrivileges:
    /revoke all privileges on table public\.queue from PUBLIC, anon, authenticated/i.test(stageB),
  allSensitiveTablesRevokePublic:
    /revoke all privileges on table public\.careflow_staff_users from PUBLIC, anon, authenticated/i.test(migration) &&
    /revoke all privileges on table public\.queue_private from PUBLIC, anon, authenticated/i.test(migration) &&
    /revoke all privileges on table public\.queue from PUBLIC, anon, authenticated/i.test(stageB),
  anonGetsOnlyPublicQueueSelect:
    /grant select \(id, code, created_at, status, room_location\) on public\.queue to anon/i.test(stageB),
  anonQueueSelectOmitsPriority:
    !/grant select \(id, code, created_at, status, priority, room_location\) on public\.queue to anon/i.test(stageB),
  queuePatientNameRevoked:
    /revoke select \(id, code, created_at, status, priority, room_location, patient_name, internal_reference, phone_number\)/i.test(stageB),
  authenticatedGetsNoDirectQueueInsert:
    !/grant insert .* on public\.queue to authenticated/i.test(migration),
  authenticatedQueueUpdateIsColumnLimited:
    /grant update \(code, status, room_location, internal_reference\) on public\.queue to authenticated/i.test(stageB),
  queuePrivateRevokesAnonAndAuthenticatedBeforeMinimalGrant:
    /revoke all privileges on table public\.queue_private from PUBLIC, anon, authenticated/i.test(migration),
  queuePrivateSelectOnlyForAuthenticated:
    /grant select \(queue_id, patient_name\) on public\.queue_private to authenticated/i.test(migration) &&
    !/grant (insert|update|delete).*public\.queue_private/i.test(migration),
  queuePrivateRlsRequiresStaff:
    /on public\.queue_private for select[\s\S]*using \(public\.careflow_is_staff\(\)\)/i.test(migration),
  anonCannotExecuteCreateRpc:
    /revoke all on function public\.careflow_create_queue_item\(text, text, text, text, text\) from PUBLIC, anon, authenticated/i.test(migration),
  authenticatedCanExecuteCreateRpc:
    /grant execute on function public\.careflow_create_queue_item\(text, text, text, text, text\) to authenticated/i.test(migration),
  securityDefinerSearchPathHardened:
    (migration.match(/set search_path = pg_catalog, public/gi) || []).length >= 3,
  createRpcChecksStaff:
    /if not public\.careflow_is_staff\(\) then[\s\S]*Staff access required/i.test(migration),
  createRpcRejectsNullCategory:
    /if input_category is null[\s\S]*input_category not in/i.test(migration),
  createRpcUsesAdvisoryLock:
    /pg_advisory_xact_lock\(hashtext\('careflow_queue_code_' \|\| queue_prefix\)\)/i.test(migration),
  createRpcWritesPrivateNames:
    /insert into public\.queue_private \(queue_id, patient_name\)/i.test(migration),
  completedQueueCleansPrivateNames:
    /create trigger careflow_delete_queue_private_on_completed/i.test(migration) &&
    /delete from public\.queue_private[\s\S]*where queue_id = new\.id/i.test(migration),
  queuePrivateNotAddedToRealtime:
    !/alter publication supabase_realtime add table public\.queue_private/i.test(migration),
  appDoesNotSelectStar:
    !/\.select\(\s*["'`]?\*["'`]?\s*\)/.test(queueStore + main),
  appPublicQueueSelectIsExplicit:
    /return "id, code, created_at, status, room_location";/.test(queueStore),
  appNeverRequestsQueuePatientName:
    !/from\("queue"\)[\s\S]{0,160}patient_name/.test(queueStore),
  appUsesCreateRpc:
    /\.rpc\("careflow_create_queue_item"/.test(queueStore),
  staffRoutesUseSupabaseAuthGate:
    /<Route path="\/reception" element={<StaffGate><ReceptionPage \/><\/StaffGate>} \/>/.test(main) &&
    /<Route path="\/nurse" element={<StaffGate><NursePage \/><\/StaffGate>} \/>/.test(main) &&
    /<Route path="\/dental" element={<StaffGate><DentalPage \/><\/StaffGate>} \/>/.test(main),
};

console.log(JSON.stringify(checks, null, 2));

const failed = Object.entries(checks).filter(([, passed]) => !passed);
if (failed.length) {
  console.error(`Security validation failed: ${failed.map(([name]) => name).join(", ")}`);
  process.exitCode = 1;
}
