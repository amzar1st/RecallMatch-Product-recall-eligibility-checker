# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import json
import re

SOURCE = "https://www.cpsc.gov/Recalls/2024/FeraDyne-Outdoors-Recalls-Rhino-Climbing-Sticks-Due-to-Fall-and-Laceration-Hazards"
NOTICE = "24-120"
MODEL_LINE = re.compile(r'The model name ["“]([A-Z0-9-]+)["”] and lot codes are printed on a label attached to the support pole\.')
YEAR_LINE = re.compile(r'Lot codes with calendar year (20[0-9]{2}) and all previous years are included in this recall\.')
FORMAT_LINE = "The lot codes have a two-digit year followed by a two-digit month"
LOT = re.compile(r"[0-9]{4}[A-Z0-9]{2}")
MODEL = re.compile(r"[A-Z0-9]+(?:-[A-Z0-9]+)*")


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def encode(data: dict) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def parse_notice(page: str) -> str:
    if not page or len(page) > 120_000:
        raise ValueError("Notice content missing or too large")
    text = " ".join(page.split())
    start = text.find("Recall Details")
    end = text.find("Related Recalls", start)
    if start < 0 or end < 0:
        raise ValueError("Recall Details section missing")
    details = text[start:end]
    models = list(MODEL_LINE.finditer(details))
    years = list(YEAR_LINE.finditer(details))
    if (not re.search(r"Recall number:\s*24-120\b", details, re.I)
            or len(models) != 1 or len(years) != 1 or details.count(FORMAT_LINE) != 1):
        raise ValueError("Unsupported or ambiguous CPSC notice")
    model = models[0].group(1)
    cutoff = int(years[0].group(1))
    # Scope is pinned to the reviewed rule. Any update needs a new release.
    if model != "RTSL-24" or cutoff != 2023:
        raise ValueError("Published criteria changed")
    description = details[models[0].start():details.index(FORMAT_LINE) + len(FORMAT_LINE)]
    if not re.fullmatch(MODEL_LINE.pattern + " " + YEAR_LINE.pattern + " " + FORMAT_LINE, description):
        raise ValueError("Eligibility passage layout changed")
    # Compare the entire recall details section, including the remedy and scope.
    return encode({"notice": NOTICE, "source": SOURCE, "model": model,
                   "max_lot_year": cutoff, "lot_format": "YYMMxx",
                   "section": "Recall Details / Description",
                   "evidence": years[0].group(0), "details_sha256": digest(details.strip())})


def verdict(model: str, lot: str, rule: dict) -> tuple[str, str]:
    if not MODEL.fullmatch(model):
        return "NEEDS_MORE_INFO", "MODEL_REQUIRED_OR_INVALID"
    if model != rule["model"]:
        return "NO_MATCH", "MODEL_EXCLUDED"
    if not LOT.fullmatch(lot) or not 1 <= int(lot[2:4]) <= 12:
        return "NEEDS_MORE_INFO", "LOT_REQUIRED_OR_INVALID"
    year = 2000 + int(lot[:2])
    if year <= rule["max_lot_year"]:
        return "MATCH", "LOT_YEAR_INCLUDED"
    # The notice uses two-digit years. Avoid classifying a possible older lot
    # with an ambiguous century as excluded. The immediate post-cutoff years
    # are supported for the demo, while other values require clarification.
    if year <= 2026:
        return "NO_MATCH", "LOT_YEAR_EXCLUDED"
    return "NEEDS_MORE_INFO", "LOT_YEAR_AMBIGUOUS"


class RecallMatch(gl.Contract):
    owner: Address
    verified_rule: str
    checks: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.verified_rule = ""

    @gl.public.write
    def verify_notice(self) -> None:
        if gl.message.sender_address != self.owner:
            raise ValueError("Only the deployer can verify this notice")
        if self.verified_rule:
            raise ValueError("Notice already verified")

        def independently_read_notice() -> str:
            return parse_notice(gl.nondet.web.render(SOURCE, mode="text"))

        self.verified_rule = gl.eq_principle.strict_eq(independently_read_notice)

    @gl.public.view
    def get_rule(self) -> str:
        return self.verified_rule

    @gl.public.view
    def preview(self, model: str, lot: str) -> str:
        if not self.verified_rule:
            raise ValueError("Notice has no consensus-verified rule")
        if len(model) > 32 or len(lot) > 32:
            raise ValueError("Model and lot have a 32-character limit")
        if not model.isascii() or not lot.isascii():
            raise ValueError("Use ASCII product codes")
        rule = json.loads(self.verified_rule)
        outcome, reason = verdict(model.strip().upper(), lot.strip().upper(), rule)
        return encode({"outcome": outcome, "reason": reason,
                       "rule_sha256": digest(self.verified_rule), **rule})

    @gl.public.write
    def record_check(self, check_id: str, model: str, lot: str) -> str:
        if not re.fullmatch(r"[0-9a-f]{32}", check_id):
            raise ValueError("Check ID must be 32 lowercase hexadecimal characters")
        key = str(gl.message.sender_address).lower() + ":" + check_id
        result = json.loads(self.preview(model, lot))
        result["input_sha256"] = digest(encode({"model": model.strip().upper(), "lot": lot.strip().upper()}))
        result = encode(result)
        existing = self.checks.get(key, "")
        if existing and existing != result:
            raise ValueError("Check ID already used for a different result")
        self.checks[key] = result
        return check_id

    @gl.public.view
    def get_check(self, account: str, check_id: str) -> str:
        if not re.fullmatch(r"0x[0-9a-fA-F]{40}", account) or not re.fullmatch(r"[0-9a-f]{32}", check_id):
            raise ValueError("Invalid account or check ID")
        return self.checks.get(account.lower() + ":" + check_id, "")
