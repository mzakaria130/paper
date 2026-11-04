/**
 * Shared Security Audit Engine (pure, no browser deps — imported by both
 * the browser agent src/agents/security-auditor.js and the Node bridge
 * tools/paper-bridge.mjs so both sides run identical checks).
 *
 * Common best-practice checklist for EVM/Solidity code review. Lightweight
 * static text checks only — NOT a substitute for Slither/Mythril/manual review.
 */

export const CHECKLIST = [
  { id: 'pragma-lock', name: 'Pragma version lock', bestPractice: 'Pin an exact compiler version (e.g. pragma solidity 0.8.24;) to avoid compiler-bug drift.' },
  { id: 'reentrancy', name: 'Reentrancy guard', bestPractice: 'External calls before state updates need ReentrancyGuard / nonReentrant or checks-effects-interactions.' },
  { id: 'tx-origin', name: 'tx.origin usage', bestPractice: 'Never use tx.origin for auth (phishable). Use msg.sender / roles.' },
  { id: 'delegatecall', name: 'delegatecall safety', bestPractice: 'delegatecall runs foreign code in your storage context — verify implementation slot safety.' },
  { id: 'oracle', name: 'Oracle freshness', bestPractice: 'Price feeds need freshness checks (updatedAt / heartbeat / medianizer) before use.' },
  { id: 'access', name: 'Access control', bestPractice: 'Privileged functions gated by Ownable / AccessControl / onlyRole.' },
  { id: 'unchecked-call', name: 'Low-level call handling', bestPractice: 'Check return values of .call/.delegatecall/.transfer — failed calls must not silently pass.' },
  { id: 'selfdestruct', name: 'selfdestruct / suicide', bestPractice: 'selfdestruct can permanently destroy contracts/funds — grep and justify any use.' },
  { id: 'randomness', name: 'On-chain randomness', bestPractice: 'Never use block.timestamp/blockhash/block.number for randomness — miners can influence them.' },
  { id: 'front-run', name: 'Front-running / approve race', bestPractice: 'approve() races: use increaseAllowance or require allowance==0 before setting.' },
  { id: 'visibility', name: 'Function visibility', bestPractice: 'Every function declares visibility; default-visibility functions are a review smell.' },
  { id: 'unbounded-loop', name: 'Unbounded loops / gas', bestPractice: 'Loops over user-controlled arrays can run out of gas — paginate or cap iterations.' },
];

const FIXES = {
  'pragma-lock': 'Add at top of file:\n// SPDX-License-Identifier: MIT\npragma solidity 0.8.24;',
  'reentrancy': 'import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";\n// contract X is ReentrancyGuard { ... }\n// apply nonReentrant to external state-changing functions, and\n// follow checks -> effects -> interactions ordering.',
  'tx-origin': 'Replace `tx.origin == owner` with `msg.sender == owner`\n(or a role check via AccessControl).',
  'delegatecall': 'Prefer regular calls / libraries over delegatecall. If required:\n- restrict who can set the implementation address (onlyOwner),\n- use EIP-1967 slots, never let user input choose the target.',
  'oracle': 'Require freshness before use, e.g.:\nrequire(block.timestamp - updatedAt <= HEARTBEAT, "stale price");\nConsider medianized feeds for critical pricing.',
  'access': 'Add an ownership/role gate:\n// import "@openzeppelin/contracts/access/Ownable.sol";\n// function privileged() external onlyOwner { ... }',
  'unchecked-call': '(bool ok, ) = target.call{value: amt}(data);\nrequire(ok, "call failed");\nNever ignore the success flag of low-level calls.',
  'selfdestruct': 'Remove selfdestruct/suicide if present. If truly required, gate it\nbehind onlyOwner and document the irreversibility.',
  'randomness': 'Use Chainlink VRF (or another verifiable randomness source)\nfor anything value-bearing. Never block.timestamp/blockhash.',
  'front-run': '// Instead of approve(spender, amount):\n// spenderSite.increaseAllowance(spender, amount)\n// or require(allowance(from, spender) == 0) before approve.',
  'visibility': 'Declare visibility on every function:\nfunction foo() external/public/internal/private { ... }',
  'unbounded-loop': 'Cap iterations or paginate:\nuint256 end = start + PAGE_SIZE;\nif (end > arr.length) end = arr.length;\nfor (uint256 i = start; i < end; i++) { ... }',
};

function lineOf(src, matchIndex) {
  return src.slice(0, matchIndex).split('\n').length;
}

export function runAudit(code, target = 'supplied text') {
  const src = String(code || '');
  const has = (re) => { const m = src.match(re); return m ? { found: true, line: lineOf(src, m.index) } : { found: false }; };
  const checks = [];
  const add = (id, status, severity, evidence) => {
    const meta = CHECKLIST.find((c) => c.id === id);
    const needsFix = status === 'FLAG' || status === 'REVIEW' || status === 'RECOMMEND';
    checks.push({ id, name: meta.name, bestPractice: meta.bestPractice, status, severity, evidence: evidence || '', fix: needsFix ? (FIXES[id] || '') : '' });
  };

  // 1 pragma
  const pragma = src.match(/pragma\s+solidity\s+([^\s;]+)/);
  if (!pragma) add('pragma-lock', 'RECOMMEND', 'LOW', 'no pragma solidity found');
  else if (/^\^|>=|<=|>|<|\|\|/.test(pragma[1])) add('pragma-lock', 'RECOMMEND', 'LOW', `floating/range pragma: ${pragma[1]} (line ${lineOf(src, pragma.index)})`);
  else add('pragma-lock', 'PASS', 'LOW', `locked pragma: ${pragma[1]}`);

  // 2 reentrancy
  const re = has(/ReentrancyGuard|nonReentrant/);
  add('reentrancy', re.found ? 'PASS' : 'REVIEW', 'MEDIUM', re.found ? `guard found (line ${re.line})` : 'no ReentrancyGuard/nonReentrant found');

  // 3 tx.origin
  const txo = has(/tx\.origin/);
  add('tx-origin', txo.found ? 'FLAG' : 'PASS', 'HIGH', txo.found ? `tx.origin at line ${txo.line}` : 'no tx.origin');

  // 4 delegatecall
  const dc = has(/delegatecall/);
  add('delegatecall', dc.found ? 'REVIEW' : 'PASS', 'MEDIUM', dc.found ? `delegatecall at line ${dc.line}` : 'no delegatecall');

  // 5 oracle
  const orc = has(/updatedAt|stale|freshness|median|heartbeat/i);
  add('oracle', orc.found ? 'PASS' : 'INFO', 'INFO', orc.found ? `freshness/median logic mentioned (line ${orc.line})` : 'no oracle freshness logic found');

  // 6 access
  const acc = has(/Ownable|onlyOwner|AccessControl|onlyRole/);
  add('access', acc.found ? 'PASS' : 'REVIEW', 'MEDIUM', acc.found ? `ownership/role gate found (line ${acc.line})` : 'no Ownable/AccessControl found');

  // 7 unchecked call
  const call = has(/\.call\s*\{|\.call\s*\(/);
  add('unchecked-call', !call.found ? 'PASS' : (/require\s*\(\s*ok|success/.test(src) ? 'PASS' : 'REVIEW'), 'MEDIUM', call.found ? `low-level call at line ${call.line}` : 'no low-level call');

  // 8 selfdestruct
  const sd = has(/selfdestruct|\bsuicide\s*\(/);
  add('selfdestruct', sd.found ? 'FLAG' : 'PASS', 'HIGH', sd.found ? `selfdestruct at line ${sd.line}` : 'no selfdestruct');

  // 9 randomness
  const rnd = has(/block\.timestamp|blockhash\s*\(|block\.number/);
  add('randomness', rnd.found ? 'REVIEW' : 'PASS', 'MEDIUM', rnd.found ? `chain data at line ${rnd.line} — unsafe if used for randomness` : 'no chain-data randomness');

  // 10 front-run approve
  const ap = has(/\.approve\s*\(/);
  add('front-run', !ap.found ? 'PASS' : (/increaseAllowance|allowance\(.*\)\s*==\s*0/.test(src) ? 'PASS' : 'REVIEW'), 'MEDIUM', ap.found ? `approve() at line ${ap.line}` : 'no approve()');

  // 11 visibility: functions missing visibility keyword
  const fns = [...src.matchAll(/function\s+[A-Za-z0-9_]+\s*\([^)]*\)[^{;]*[{;]/g)];
  const missing = fns.filter((m) => !/\b(public|external|internal|private|virtual|override)\b/.test(m[0]));
  add('visibility', src.trim() === '' || fns.length === 0 ? 'INFO' : (missing.length === 0 ? 'PASS' : 'REVIEW'), 'LOW', fns.length === 0 ? 'no functions found' : `${missing.length}/${fns.length} functions missing visibility`);

  // 12 unbounded loop
  const loop = has(/\b(for|while)\s*\([^)]*\.length/);
  add('unbounded-loop', loop.found ? 'REVIEW' : 'PASS', 'LOW', loop.found ? `loop over .length at line ${loop.line}` : 'no .length loops');

  const flags = checks.filter((c) => ['FLAG', 'REVIEW'].includes(c.status)).length;
  const score = Math.max(0, 100 - flags * 8);
  return { timestamp: new Date().toISOString(), target, score: `${score}/100`, checks, findings: checks.filter((c) => c.status !== 'PASS' && c.status !== 'INFO'), note: 'Lightweight static text checks only — run Slither/Mythril + manual review for a real audit.' };
}

export function buildFixes(audit) {
  return audit.checks
    .filter((c) => c.fix)
    .map((c) => ({ check: c.name, id: c.id, severity: c.severity, status: c.status, evidence: c.evidence, fix: c.fix }));
}

export function buildReport(audit, fixes) {
  const lines = [];
  lines.push('# SECURITY AUDIT REPORT');
  lines.push(`Target: ${audit.target}  |  Score: ${audit.score}  |  ${audit.timestamp}`);
  lines.push('');
  lines.push('> Lightweight static checks only. Not a substitute for Slither/Mythril or manual review.');
  lines.push('');
  lines.push('## Best-practice checklist');
  lines.push('| Check | Status | Severity | Evidence |');
  lines.push('|---|---|---|---|');
  for (const c of audit.checks) lines.push(`| ${c.name} | ${c.status} | ${c.severity} | ${String(c.evidence || '').replace(/\|/g, '/')} |`);
  lines.push('');
  lines.push('## Potential vulnerabilities');
  if (!audit.findings.length) lines.push('- None flagged by these checks.');
  for (const f of audit.findings) lines.push(`- **[${f.severity}] ${f.name}** (${f.status}) — ${f.evidence}`);
  lines.push('');
  lines.push('## Recommended fixes');
  if (!fixes.length) lines.push('- No fixes required by these checks.');
  for (const f of fixes) {
    lines.push(`### ${f.check} [${f.severity}]`);
    lines.push('```solidity');
    lines.push(f.fix);
    lines.push('```');
    lines.push('');
  }
  lines.push(`_${audit.note}_`);
  return lines.join('\n');
}
