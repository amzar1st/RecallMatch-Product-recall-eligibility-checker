import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionHashVariant} from "genlayer-js/types";
import {contractAddress as address, deploymentHash, liveExamples, noticeHash, studioAccount as account} from "../dist/deployment.mjs";
import {decodeResult, inspectRecord} from "../src/lifecycle.mjs";

const client = createClient({chain: studionet});
const finalVariant = TransactionHashVariant.LATEST_FINAL;
assert.equal(studionet.id, 61999);
const read = (functionName, args = []) => client.readContract({
  address, functionName, args, transactionHashVariant: finalVariant,
});

const [local, remote, rawRule, ...receipts] = await Promise.all([
  readFile(new URL("../contracts/recall_match.py", import.meta.url)),
  client.getContractCode(address),
  read("get_rule"),
  ...[deploymentHash, noticeHash, ...liveExamples.map(row => row.hash)]
    .map(hash => client.waitForTransactionReceipt({hash, status: "FINALIZED", interval: 5000, retries: 24, fullTransaction: true})),
]);
assert.deepEqual(Buffer.from(remote), local);
const rule = JSON.parse(rawRule);
assert.equal(rule.notice, "24-120");
assert.equal(rule.model, "RTSL-24");
assert.equal(rule.max_lot_year, 2023);
assert.equal(rule.lot_format, "YYMMxx");
assert.match(rule.details_sha256, /^[a-f0-9]{64}$/);
const sourceSha256 = createHash("sha256").update(local).digest("hex");
const ruleSha256 = createHash("sha256").update(rawRule).digest("hex");

const [deployment, verification, ...checks] = receipts;
function evidence(tx, expectedExecution) {
  const leader = tx.consensus_data.leader_receipt[0];
  assert.equal(tx.statusName, "FINALIZED");
  assert.equal(tx.to_address.toLowerCase(), address.toLowerCase());
  assert.equal(tx.from_address.toLowerCase(), account.toLowerCase());
  assert.equal(leader.execution_result, expectedExecution);
  assert.ok(Object.values(tx.consensus_data.votes).filter(vote => vote === "agree").length >= 3);
  return {hash: tx.hash, status: tx.statusName, from: tx.from_address, to: tx.to_address,
    execution: leader.execution_result, result: leader.result, votes: tx.consensus_data.votes};
}
const records = await Promise.all(liveExamples.map(async (demo, index) => {
  const tx = checks[index];
  const receipt = evidence(tx, demo.outcome ? "SUCCESS" : "ERROR");
  assert.equal(receipt.hash, demo.hash);
  const result = await inspectRecord({getTransaction: async () => tx, readContract: client.readContract},
    {hash: demo.hash, address, account, id: demo.id, finalVariant});
  if (!demo.outcome) {
    assert.equal(result.stage, "failed");
    assert.match(result.label, /without successful contract execution/);
    return {label: demo.label, receipt};
  }
  assert.equal(result.stage, "success");
  assert.equal(result.result.outcome, demo.outcome);
  assert.equal(result.result.rule_sha256, ruleSha256);
  const preview = decodeResult(await read("preview", ["RTSL-24", demo.lot]));
  assert.equal(preview.outcome, demo.outcome);
  assert.equal(preview.rule_sha256, ruleSha256);
  const input = JSON.stringify({lot: demo.lot, model: "RTSL-24"});
  assert.equal(result.result.input_sha256, createHash("sha256").update(input).digest("hex"));
  return {label: demo.label, checkId: demo.id, lot: demo.lot, decision: result.result, receipt};
}));
console.log(JSON.stringify({chainId: studionet.id, address, account, sourceSha256, ruleSha256,
  deployment: evidence(deployment, "SUCCESS"), verification: evidence(verification, "SUCCESS"),
  rule, records}, null, 2));
