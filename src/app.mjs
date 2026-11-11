import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionHashVariant} from "genlayer-js/types";
import {contractAddress} from "../dist/deployment.mjs";
import {accountAddress, checkId, decodeResult, inspectRecord, txHash} from "./lifecycle.mjs";

const byId = id => document.getElementById(id);
const set = (id, text) => { byId(id).textContent = text; };
const configured = accountAddress.test(contractAddress);
const client = configured ? createClient({chain: studionet}) : null;
const finalVariant = TransactionHashVariant.LATEST_FINAL;
const studio = document.querySelector("#ledger a");
const draftKey = "recallmatch.studionet." + contractAddress;
let trackGeneration = 0;
let checkGeneration = 0;

const outcomes = {MATCH: "Covered by this notice", NO_MATCH: "Outside this notice", NEEDS_MORE_INFO: "More information needed"};
const reasons = {
  LOT_YEAR_INCLUDED: "The model and lot year fall within the published criteria.",
  LOT_YEAR_EXCLUDED: "The lot year is later than the cutoff in this notice.",
  MODEL_EXCLUDED: "The entered model differs from the model named in this notice.",
  MODEL_REQUIRED_OR_INVALID: "Enter the model number printed on the product.",
  LOT_REQUIRED_OR_INVALID: "Enter the six-character lot code from the support pole. The third and fourth digits are the month.",
  LOT_YEAR_AMBIGUOUS: "This lot year is outside the range the checker can interpret. Consult the official notice and manufacturer.",
};
const demos = new Map([
  ["2312AB", {outcome: "MATCH", reason: "LOT_YEAR_INCLUDED"}],
  ["2401AB", {outcome: "NO_MATCH", reason: "LOT_YEAR_EXCLUDED"}],
  ["", {outcome: "NEEDS_MORE_INFO", reason: "LOT_REQUIRED_OR_INVALID"}],
]);

function render(result, origin) {
  set("provenance", origin);
  set("outcome", outcomes[result.outcome]);
  set("explanation", reasons[result.reason] ?? "See the notice for eligibility details.");
  set("rule", `Model ${result.model ?? "RTSL-24"} with a lot year of ${result.max_lot_year ?? 2023} or earlier.`);
  byId("proof").hidden = !result.rule_sha256;
  if (result.rule_sha256) {
    set("proof-text", `${result.section}. “${result.evidence}” Rule SHA-256 ${result.rule_sha256}.`);
  }
}

function error(title, message) {
  set("provenance", "RECALL ELIGIBILITY");
  set("outcome", title);
  set("explanation", message);
  byId("proof").hidden = true;
  set("studio-args", "");
}

async function check() {
  const request = ++checkGeneration;
  const model = byId("model").value.trim().toUpperCase();
  const lot = byId("lot").value.trim().toUpperCase();
  if (!client) {
    if (model === "RTSL-24" && demos.has(lot)) {
      render(demos.get(lot), "ILLUSTRATIVE DEMO · " + demos.get(lot).outcome);
    } else {
      error("Live checks are unavailable", "Use one of the three example cases or consult the official CPSC notice for your product.");
    }
    return;
  }
  error("Checking finalized state…", "Reading the published rule from Studionet.");
  try {
    const raw = await client.readContract({address: contractAddress, functionName: "preview",
      args: [model, lot], transactionHashVariant: finalVariant});
    if (request !== checkGeneration) return;
    const result = decodeResult(raw);
    render(result, "FINALIZED RULE · " + result.outcome);
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, "0")).join("");
    byId("id").value = id;
    set("studio-args", JSON.stringify([id, model, lot]));
  } catch {
    if (request === checkGeneration) error("Live check unavailable", "Studionet could not provide a verified result. Consult the official notice.");
  }
}

async function track(hash, account, id) {
  const request = ++trackGeneration;
  const checkRequest = checkGeneration;
  const explorer = byId("explorer");
  explorer.href = "https://explorer-studio.genlayer.com/tx/" + hash;
  explorer.hidden = false;
  set("tracking", "Looking up the submitted transaction…");
  for (let attempt = 0; attempt < 60 && request === trackGeneration; attempt++) {
    try {
      const response = await inspectRecord(client, {hash, address: contractAddress, account, id, finalVariant});
      if (request !== trackGeneration) return;
      set("tracking", response.label);
      if (response.stage !== "pending") {
        if (response.result && checkRequest === checkGeneration) {
          render(response.result, "FINALIZED RECORD · " + response.result.outcome);
        }
        return;
      }
    } catch {
      if (request !== trackGeneration) return;
      set("tracking", "Waiting for the receipt or RPC connection…");
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (request === trackGeneration) set("tracking", "Tracking paused. Use the same hash to resume.");
}

byId("checker").addEventListener("submit", event => { event.preventDefault(); void check(); });
for (const example of document.querySelectorAll("[data-lot]")) {
  example.addEventListener("click", () => {
    byId("model").value = "RTSL-24";
    byId("lot").value = example.dataset.lot;
    void check();
  });
}
set("network", configured ? "GenLayer Studionet · Finalized state" : "Preview mode · Three illustrative cases");
if (configured) {
  byId("ledger").hidden = false;
  studio.href = "https://studio.genlayer.com/?import-contract=" + contractAddress;
  byId("track").addEventListener("submit", event => {
    event.preventDefault();
    const hash = byId("hash").value.trim();
    const account = byId("account").value.trim();
    const id = byId("id").value.trim();
    if (!txHash.test(hash) || !accountAddress.test(account) || !checkId.test(id)) {
      ++trackGeneration;
      byId("explorer").hidden = true;
      set("tracking", "Enter a valid transaction hash, Studio account address, and check ID.");
      return;
    }
    try { sessionStorage.setItem(draftKey, JSON.stringify({hash, account, id})); } catch {}
    void track(hash, account, id);
  });
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey));
    if (draft && txHash.test(draft.hash) && accountAddress.test(draft.account) && checkId.test(draft.id)) {
      for (const field of ["hash", "account", "id"]) byId(field).value = draft[field];
      void track(draft.hash, draft.account, draft.id);
    }
  } catch {}
}
