# Project Explorer draft

| Field | Value |
| --- | --- |
| Contribution type | Builder → Projects |
| Project name | RecallMatch |
| Suggested topics | Oracles, real-world data, consumer safety |
| One-liner | Check whether a product model and lot code fall within an official recall, using an eligibility rule verified by GenLayer validators. |
| Repository | https://github.com/amzar1st/RecallMatch-Product-recall-eligibility-checker |
| Frontend preview | https://recallmatch.tinymule33.chatgpt.site/ |
| Contract and receipts | Pending Studionet deployment and verification |

## Overview draft

RecallMatch turns an official recall notice into a reproducible eligibility check. GenLayer validators independently retrieve the U.S. CPSC notice and use strict equivalence to agree on the model, lot-year cutoff, cited passage, and digest of the recall details. The Intelligent Contract locks the verified rule, then evaluates product codes deterministically as MATCH, NO_MATCH, or NEEDS_MORE_INFO. The web interface presents the rule and official source, reads finalized contract state, and tracks records submitted through Studio’s built-in account. The MVP covers CPSC recall 24-120 for Rhino climbing sticks and provides matching, excluded, and missing-lot examples.

The draft describes the intended live workflow. Add the verified deployment, consensus, three recorded results and failed-execution evidence before submission.
