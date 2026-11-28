#!/usr/bin/env node
/**
 * Rules invariant checker — the deploy-safety net that CAN run here.
 *
 * The Firestore emulator needs a Java runtime this machine does not
 * have, so full rules unit tests cannot run locally. What CAN run is a
 * static check that the security invariants the app was designed
 * around are still present in firestore.rules before any push:
 * if a future edit quietly drops one (a hasOnly, a pending-only claim,
 * the append-only history), this script fails loudly.
 *
 * Run before every rules push:  node scripts/check-rules.mjs
 */
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const slice = (from, to) => {
  const a = rules.indexOf(from);
  const b = rules.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`slice anchors not found: ${from} -> ${to}`);
  return rules.slice(a, b);
};

const ordersBlock = slice('match /orders/{orderId}', '// Public proof');
const historyBlock = slice('match /platformConfig/payment/history', '// Product showcase CMS');
const configBlock = slice('match /platformConfig/{docId}', 'match /platformConfig/payment/history');
const usersBlock = slice('match /users/{userId}', 'match /phoneRegistry');
const registryBlock = slice('match /phoneRegistry/{phone}', '// Client roster records');

const checks = [
  [
    'Public order create is shape-locked (hasOnly allowlist)',
    () => ordersBlock.includes('hasOnly(['),
  ],
  [
    "Public order create must start as status 'intake'",
    () => ordersBlock.includes("request.resource.data.status == 'intake'"),
  ],
  [
    'Orders are never world-readable',
    () => !ordersBlock.includes('allow read: if true'),
  ],
  [
    'Payment claims are created pending-only',
    () => ordersBlock.includes("request.resource.data.status == 'pending'"),
  ],
  [
    'Claim currencies are exactly BDT / INR / USD',
    () => ordersBlock.includes("['BDT', 'INR', 'USD']"),
  ],
  [
    'Chat sender is bound to the writer role (architect/client)',
    () =>
      ordersBlock.includes("request.resource.data.sender == 'architect'") &&
      ordersBlock.includes("request.resource.data.sender == 'client'"),
  ],
  [
    'Order files are size-capped in the rules (1,000,000)',
    () => ordersBlock.includes('request.resource.data.size <= 1000000'),
  ],
  [
    'Owner cascade-delete exists for order subcollections (>= 6 grants)',
    () => (ordersBlock.match(/allow delete: if isOwner\(\)/g) ?? []).length >= 6,
  ],
  [
    'Reviews are always created unpublished',
    () => rules.includes('request.resource.data.published == false'),
  ],
  [
    'Payment history is owner-only to read and create',
    () => historyBlock.includes('allow read, create: if isOwner();'),
  ],
  [
    'Payment history is append-only (update/delete denied to everyone)',
    () => historyBlock.includes('allow update, delete: if false;'),
  ],
  [
    'Payment config is signed-in-only, never public',
    () => configBlock.includes("docId == 'payment' && isSignedIn()"),
  ],
  [
    'Client roster records are owner-only',
    () => rules.includes('match /clients/{clientId}') && rules.includes('allow read, write: if isOwner();'),
  ],
  [
    'Audit logs are append-only',
    () => slice('match /audit_logs/{docId}', '// Audit report leads').includes('allow update, delete: if false;'),
  ],
  [
    'Client profiles are bound to the account uid',
    () => usersBlock.includes('request.auth.uid == userId'),
  ],
  [
    'Profile email must equal the sign-in token email',
    () => usersBlock.includes('request.resource.data.email == request.auth.token.email'),
  ],
  [
    'Clients can never self-verify a phone number',
    () =>
      usersBlock.includes('request.resource.data.phoneVerified == false') &&
      usersBlock.includes('request.resource.data.phoneVerified == resource.data.phoneVerified'),
  ],
  [
    'A saved profile phone must be claimed in the registry (getAfter)',
    () => usersBlock.includes('getAfter(') && usersBlock.includes('phoneRegistry'),
  ],
  [
    'Phone registry is create-only (updates denied to everyone)',
    () => registryBlock.includes('allow update: if false;'),
  ],
  [
    'Phone registry is never listable (no number enumeration)',
    () => registryBlock.includes('allow list: if false;'),
  ],
  [
    'Registry claims are bound to the claimant uid',
    () => registryBlock.includes('request.resource.data.uid == request.auth.uid'),
  ],
];

let failed = 0;
for (const [name, fn] of checks) {
  let ok = false;
  try {
    ok = fn();
  } catch {
    ok = false;
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} invariants hold.`);
process.exit(failed === 0 ? 0 : 1);
