# Project Explorer submission

| Field | Value |
| --- | --- |
| Contribution type | Builder → Projects |
| Project name | RecallMatch |
| Suggested topics | Oracles, real-world data, consumer safety |
| One-liner | Check whether a product model and lot code fall within an official recall, using an eligibility rule verified by GenLayer validators. |
| Repository | https://github.com/amzar1st/RecallMatch-Product-recall-eligibility-checker |
| Public frontend | https://recallmatch.tinymule33.chatgpt.site/ |
| Contract | https://explorer-studio.genlayer.com/address/0x81F97A3AB7422E77E5C6A07db9A26496b342Ba3A |
| Studio contract | https://studio.genlayer.com/?import-contract=0x81F97A3AB7422E77E5C6A07db9A26496b342Ba3A |
| Verification evidence | https://github.com/amzar1st/RecallMatch-Product-recall-eligibility-checker/blob/main/docs/LIVE_VERIFICATION.md |
| Official source | https://www.cpsc.gov/Recalls/2024/FeraDyne-Outdoors-Recalls-Rhino-Climbing-Sticks-Due-to-Fall-and-Laceration-Hazards |

## Overview

RecallMatch turns an official recall notice into a reproducible eligibility check. GenLayer validators independently retrieve a U.S. CPSC notice and use strict equivalence to agree on the model, lot-year cutoff, cited passage, and digest of the recall details. The Intelligent Contract locks the verified rule and deterministically evaluates product codes as MATCH, NO_MATCH, or NEEDS_MORE_INFO. The public app reads finalized contract state, links to the official notice, and tracks transactions signed with Studio’s built-in account through finalization and execution. The Studionet demo covers CPSC recall 24-120 for Rhino climbing sticks and includes three finalized eligibility records plus a finalized transaction rejected for invalid input.
