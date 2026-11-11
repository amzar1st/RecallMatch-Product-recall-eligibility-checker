export const txHash = /^0x[a-f0-9]{64}$/i;
export const accountAddress = /^0x[a-f0-9]{40}$/i;
export const checkId = /^[a-f0-9]{32}$/;

export function decodeResult(raw) {
  const data = JSON.parse(raw);
  if (!["MATCH", "NO_MATCH", "NEEDS_MORE_INFO"].includes(data?.outcome)
      || typeof data.reason !== "string" || typeof data.model !== "string"
      || !Number.isInteger(data.max_lot_year) || typeof data.evidence !== "string"
      || !/^[a-f0-9]{64}$/.test(data.rule_sha256)) {
    throw new Error("Unexpected contract result");
  }
  return data;
}

export async function inspectRecord(client, options) {
  const {hash, address, account, id, finalVariant} = options;
  const tx = await client.getTransaction({hash});
  if (!tx) return {stage: "pending", label: "Waiting for receipt"};
  const status = String(tx.statusName ?? tx.status ?? "pending");
  const target = tx.to_address ?? tx.recipient;
  const sender = tx.from_address ?? tx.sender;
  if (target?.toLowerCase() !== address.toLowerCase()
      || sender?.toLowerCase() !== account.toLowerCase()) {
    return {stage: "failed", label: "Receipt does not match this contract and Studio account."};
  }
  if (["UNDETERMINED", "CANCELED", "CANCELLED", "FAILED"].includes(status.toUpperCase())) {
    return {stage: "failed", label: `Transaction ended with status ${status}.`};
  }
  if (status !== "FINALIZED") {
    return {stage: "pending", label: `Consensus status · ${status}`};
  }
  const leader = tx.consensus_data?.leader_receipt;
  const receipt = Array.isArray(leader) ? leader[0] : leader;
  const execution = tx.txExecutionResultName ?? receipt?.execution_result ?? receipt?.result?.status;
  if (!["FINISHED_WITH_RETURN", "SUCCESS", "return"].includes(execution)) {
    return {stage: "failed", label: "Finalized without successful contract execution."};
  }
  if (receipt?.result?.payload?.readable !== JSON.stringify(id)) {
    return {stage: "failed", label: "The finalized return value does not match this check ID."};
  }
  const raw = await client.readContract({
    address, functionName: "get_check", args: [account, id],
    transactionHashVariant: finalVariant,
  });
  if (!raw) return {stage: "failed", label: "Finalized receipt found, but the check ID was absent."};
  return {stage: "success", label: "Finalized execution and record verified", result: decodeResult(raw)};
}
