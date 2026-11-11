import test from "node:test";
import assert from "node:assert/strict";
import {decodeResult, inspectRecord} from "../src/lifecycle.mjs";

const address = "0x" + "1".repeat(40);
const account = "0x" + "2".repeat(40);
const id = "3".repeat(32);
const options = {hash: "0x" + "4".repeat(64), address, account, id, finalVariant: "latest-final"};
const result = {
  outcome: "MATCH", reason: "LOT_YEAR_INCLUDED", model: "RTSL-24",
  max_lot_year: 2023, evidence: "Evidence", rule_sha256: "5".repeat(64),
};
const finalized = {
  from_address: account, to_address: address, statusName: "FINALIZED",
  consensus_data: {leader_receipt: [{execution_result: "SUCCESS",
    result: {status: "return", payload: {readable: JSON.stringify(id)}}}]},
};
const client = (receipt, raw = JSON.stringify(result)) => ({
  async getTransaction({hash}) { assert.equal(hash, options.hash); return receipt; },
  async readContract(args) {
    assert.deepEqual(args, {address, functionName: "get_check", args: [account, id], transactionHashVariant: "latest-final"});
    return raw;
  },
});
test("unindexed, pending and accepted receipts remain pending", async () => {
  for (const receipt of [null, {...finalized, statusName: "PENDING"}, {...finalized, statusName: "ACCEPTED"}]) {
    assert.equal((await inspectRecord(client(receipt), options)).stage, "pending");
  }
});
test("failed execution and terminal consensus failure stay failed", async () => {
  for (const receipt of [{...finalized, txExecutionResultName: "FINISHED_WITH_ERROR"},
    {...finalized, statusName: "UNDETERMINED"}, {...finalized, consensus_data: {}}]) {
    assert.equal((await inspectRecord(client(receipt), options)).stage, "failed");
  }
});
test("an unrelated receipt cannot vouch for a record", async () => {
  for (const [receipt, search] of [[{...finalized, from_address: address}, options],
    [{...finalized, to_address: account}, options], [finalized, {...options, id: "0".repeat(32)}]]) {
    assert.equal((await inspectRecord(client(receipt), search)).stage, "failed");
  }
});
test("finalized success requires the stored record", async () => {
  assert.equal((await inspectRecord(client(finalized, ""), options)).stage, "failed");
  assert.deepEqual((await inspectRecord(client(finalized), options)).result, result);
});
test("malformed results fail closed", () => {
  for (const raw of ["", "null", JSON.stringify({...result, outcome: "UNKNOWN"}), JSON.stringify({...result, rule_sha256: "bad"})]) {
    assert.throws(() => decodeResult(raw));
  }
});
