# Live verification

Deployment is pending. Both the Studionet browser and RPC timed out from the build environment. There is no verified contract address, deployment receipt, signer address, or finalized check transaction for RecallMatch yet.

## Reproduce on Studionet

1. Open [GenLayer Studio](https://studio.genlayer.com/) on Studionet (61999). Use the built-in Studio account and faucet. Paste `contracts/recall_match.py` into the editor, run GenVM validation, then deploy with no constructor arguments in **Normal (Full Consensus)** mode.
2. Save the deployment hash, finalized execution receipt, deployed address, and source commit. Verify deployed code against the exact committed bytes using the GenLayer JS SDK's `getContractCode` method.
3. Call `verify_notice` in full-consensus mode from the deploying account. Wait for successful execution and read `get_rule` from finalized state. Record the validator agreement and compare the model, cutoff, citation, and notice ID to the official source.
4. Set `contractAddress` in `dist/deployment.mjs`, rebuild, and publish. Use the site to check the three examples. The site gives each new check a 32-character ID and shows arguments to use in Studio's `record_check` form.
5. Sign one transaction per row below with the built-in account. Track each hash from the website. Confirm it displays pending, then successful finalization and the stored verdict. Submit one invalid check ID and confirm the site reports failed execution if the transaction is finalized. Save the public links and receipts. A failed receipt can be tracked with the intended valid ID to confirm the execution status before ID verification.
6. Reopen the public site without a wallet and verify that its finalized-state read works. On an RPC error, the frontend should display an unavailable state. Transaction tracking preserves the hash, account and check ID for that browser session.

| Model | Lot code | Expected result |
| --- | --- | --- |
| RTSL-24 | 2312AB | `MATCH` |
| RTSL-24 | 2401AB | `NO_MATCH` |
| RTSL-24 | blank | `NEEDS_MORE_INFO` |

## Current verification

- Eight Python tests cover the parser, official-source binding, whitespace normalization, notice changes, access control, result matrix, input limits, and record isolation. The tests use a mocked GenLayer runtime.
- Five JavaScript tests cover pending, terminal consensus failure, failed execution, mismatched receipts, finalized state reads, and malformed payloads. The tests use a mocked RPC client.
- The three illustrative demo buttons were verified in the browser. They use fixed examples until a Studionet contract address is configured.
- The MVP never asks for a seed phrase, private key, or MetaMask connection. Built-in account writes happen in Studio. Public transaction calldata can expose submitted model and lot values. SHA-256 commitments are intended for integrity and do not provide secrecy for short codes.
