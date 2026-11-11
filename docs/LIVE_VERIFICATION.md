# RecallMatch on Studionet

Open the [public checker](https://recallmatch.tinymule33.chatgpt.site/) and select a lot example. The frontend reads `preview` from finalized contract state. Under **Record on Studionet**, select a recorded example to load and verify its transaction and record, or select **Rejected transaction** to inspect a finalized failure.

| Item | Evidence |
| --- | --- |
| Network | GenLayer Studionet, chain ID 61999 |
| Contract | [`0x81F97A3AB7422E77E5C6A07db9A26496b342Ba3A`](https://explorer-studio.genlayer.com/address/0x81F97A3AB7422E77E5C6A07db9A26496b342Ba3A) |
| Deployment | [Finalized successful deployment](https://explorer-studio.genlayer.com/tx/0xf64cf4d7ee491f412c63c3569f2894201be5277ba253ce7bca66d65ea8e02e40) |
| Notice review | [Finalized successful verification](https://explorer-studio.genlayer.com/tx/0x180256c29607eda5140f772c1a96703bfa186673ec704741b767e85144f12df7) |
| Built-in Studio signer | `0x62750Bb60A705B27B96867c60665D47cCF5B1Dd7` |
| Deployed source SHA-256 | `43329742e113055b80846c882f4a901cb997bb53eca5ff9645f2c53ee72f0b9b` |
| Finalized rule SHA-256 | `47dbfc372e9a694cd06cc86b8d2b0094fca4102cc03477db6bc70c160a41067c` |
| Normalized recall details SHA-256 | `d5ba8b7cbb597f1838e10edb9168ac1f3e55b515a1342cea50cc4582b422d2c9` |
| Official source | [U.S. CPSC recall 24-120](https://www.cpsc.gov/Recalls/2024/FeraDyne-Outdoors-Recalls-Rhino-Climbing-Sticks-Due-to-Fall-and-Laceration-Hazards) |

| Model | Lot code | Result | Transaction | Check ID |
| --- | --- | --- | --- | --- |
| RTSL-24 | 2312AB | `MATCH` | [Finalized success](https://explorer-studio.genlayer.com/tx/0x2919ed9d9ee505d73d114e76dafe0568f9315101a049425ae612de2e87e88879) | `3c7eb0a228dc6b49d4d9722b3ce6055b` |
| RTSL-24 | 2401AB | `NO_MATCH` | [Finalized success](https://explorer-studio.genlayer.com/tx/0xc4e4d6cbc154f983103bfa1b6cf913418571703801cabfbc7aa3dbf1acadac86) | `c06ec342d75f4a4385c0e0bb113a97cc` |
| RTSL-24 | blank | `NEEDS_MORE_INFO` | [Finalized success](https://explorer-studio.genlayer.com/tx/0x686dce7f9d0ca2560ef934a2f8a1b88b304b4e4f914256037c57f7fb0f7a904e) | `bc1ecc82d646470fb794ba543372950e` |
| RTSL-24 | 2312AB | Invalid check ID rejected | [Finalized execution error](https://explorer-studio.genlayer.com/tx/0x92ba0e5d1532f553ab7f9fe231c2852b4c945e5f3e75f938bebed41b4f4e74e8) | `invalid-check-id` |

[Recorded RPC evidence](studionet-evidence.json) includes validator votes, execution results, the agreed rule and stored decisions. The invalid ID was rejected with a contract user error. Consensus finalized the transaction without recording an eligibility result.

## Reproduce

1. Run `npm ci`, `npm test`, `python -m unittest discover -s tests -p 'test_*.py'`, `uvx --from genvm-linter genvm-lint check contracts/recall_match.py`, and `npm run build`. The local suite passed eight Python tests, five JavaScript tests, and GenVM lint and schema validation.
2. Run `node tests/verify-live.mjs`. It confirms source equality, finalized execution and consensus votes, the rule and hashes, all three live reads and stored decisions, and failed-execution handling.
3. [Import the deployed contract in Studio](https://studio.genlayer.com/?import-contract=0x81F97A3AB7422E77E5C6A07db9A26496b342Ba3A). Use the built-in Studio account and **Normal (Full Consensus)** mode. You can read `get_rule`, `preview`, and `get_check` in **Finalized** state.
4. To submit a new check, select an example or enter your own model and lot on the public site. Copy the three arguments shown into Studio's `record_check` form. Send the transaction using the Studio account. Enter that account, check ID and hash in the public tracker. The tracker waits through accepted consensus, checks execution after finalization, and verifies the returned ID and finalized record.
5. To reproduce deployment on a fresh chain, deploy `contracts/recall_match.py` with no constructor parameters, then call `verify_notice` from the deployer with full consensus. Compare the finalized rule with the official source before configuring the new address. The verified deployment above can be reused on Studionet.

Public transaction calldata can expose submitted model and lot values. SHA-256 commitments provide integrity. The browser never requests a seed phrase or private key. The signer runs on the Studio origin. This MVP covers a single notice and does not continuously check for amendments.
