# RecallMatch

RecallMatch checks a model and lot code against a scoped product recall. The MVP supports U.S. Consumer Product Safety Commission notice **24-120**, covering Rhino 24-foot Hot Foot Climbing Sticks with model RTSL-24 and a lot year of 2023 or earlier.

[Public checker](https://recallmatch.tinymule33.chatgpt.site/) · [Studionet contract](https://explorer-studio.genlayer.com/address/0x81F97A3AB7422E77E5C6A07db9A26496b342Ba3A)

## How it works

1. The deployer runs `verify_notice` in full-consensus mode. The GenLayer leader and validating nodes independently read the same official CPSC page. Strict equivalence compares the parsed eligibility rule, its cited passage, and a SHA-256 digest of the normalized recall details.
2. The contract stores the verified rule once. Its deterministic `preview` method applies that rule to the model and lot and returns `MATCH`, `NO_MATCH`, or `NEEDS_MORE_INFO`.
3. Users can record a result through Studio’s built-in account. The frontend checks the transaction’s sender, target, finalized execution, and returned check ID, then reads the stored record from finalized state.

The verifier accepts one pinned CPSC URL and notice identity. It stops if the expected criteria, evidence structure, or notice ID change. The checker supports this notice's model and lot-year criteria. Regions, purchase dates, additional notices, amended notices, and other code formats would need separately reviewed adapters.

The public site reads finalized state from the deployed Studionet contract and includes four recorded transactions for review. Results apply only to the selected notice. Follow the [official CPSC notice](https://www.cpsc.gov/Recalls/2024/FeraDyne-Outdoors-Recalls-Rhino-Climbing-Sticks-Due-to-Fall-and-Laceration-Hazards) for the remedy and product-safety guidance.

## Run locally

```sh
npm ci
npm test
python -m unittest discover -s tests -p 'test_*.py' -v
npm run build
python -m http.server 4173 --directory dist
```

See [live verification and deployment](docs/LIVE_VERIFICATION.md) and [Project Explorer draft](docs/SUBMISSION.md).
