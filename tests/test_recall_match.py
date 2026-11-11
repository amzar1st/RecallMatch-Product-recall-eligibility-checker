import json
import pathlib
import sys
import types
import unittest
from unittest.mock import Mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "contracts"))
identity = lambda func: func
sender = "0x" + "a" * 40
fake = types.ModuleType("genlayer")
fake.Address = str
fake.TreeMap = dict
fake.gl = types.SimpleNamespace(
    Contract=object, public=types.SimpleNamespace(view=identity, write=identity),
    message=types.SimpleNamespace(sender_address=sender),
    nondet=types.SimpleNamespace(web=types.SimpleNamespace(render=Mock())),
    eq_principle=types.SimpleNamespace(strict_eq=Mock(side_effect=lambda fetch: fetch())),
)
sys.modules["genlayer"] = fake
from recall_match import RecallMatch, SOURCE, parse_notice, verdict

PAGE = (
    "Navigation\nRecall Details\nDescription:\n"
    "The model name “RTSL-24” and lot codes are printed on a label attached to the support pole. "
    "Lot codes with calendar year 2023 and all previous years are included in this recall. "
    "The lot codes have a two-digit year followed by a two-digit month, i.e., 2312xx, 2212xx.\n"
    "Remedy:\nContact the importer.\nRecall number:\n24-120\nRelated Recalls"
)


class RecallMatchTests(unittest.TestCase):
    def setUp(self):
        fake.gl.message.sender_address = sender
        fake.gl.nondet.web.render.reset_mock()
        fake.gl.nondet.web.render.side_effect = None
        fake.gl.nondet.web.render.return_value = PAGE
        fake.gl.eq_principle.strict_eq.reset_mock()
        self.contract = RecallMatch()
        self.contract.checks = {}

    def test_official_scope_and_web_call(self):
        self.contract.verify_notice()
        fake.gl.nondet.web.render.assert_called_once_with(SOURCE, mode="text")
        fake.gl.eq_principle.strict_eq.assert_called_once()
        rule = json.loads(self.contract.get_rule())
        self.assertEqual((rule["notice"], rule["model"], rule["max_lot_year"]), ("24-120", "RTSL-24", 2023))
        self.assertRegex(rule["details_sha256"], r"^[0-9a-f]{64}$")

    def test_notice_failures(self):
        for page in ("", "x" * 120001, PAGE.replace("24-120", "24-121"),
                     PAGE.replace("2023", "2024"), PAGE.replace("RTSL-24", "RTSL-25"),
                     PAGE.replace("included", "excluded"),
                     PAGE.replace("Remedy:", "Lot codes with calendar year 2023 and all previous years are included in this recall."),
                     PAGE.replace("Related Recalls", "")):
            with self.subTest(page=page[:80]), self.assertRaises(ValueError):
                parse_notice(page)

    def test_consensus_canonicalizes_whitespace_but_detects_content_change(self):
        self.assertEqual(parse_notice(PAGE), parse_notice(PAGE.replace(" ", " \n ")))
        self.assertNotEqual(parse_notice(PAGE), parse_notice(PAGE.replace("Contact the importer.", "Contact the manufacturer.")))

    def test_access_and_one_time_lock(self):
        fake.gl.message.sender_address = "0x" + "b" * 40
        with self.assertRaisesRegex(ValueError, "Only"):
            self.contract.verify_notice()
        fake.gl.nondet.web.render.assert_not_called()
        fake.gl.message.sender_address = sender
        self.contract.verify_notice()
        with self.assertRaisesRegex(ValueError, "already"):
            self.contract.verify_notice()

    def test_unavailable_source_and_unverified_state(self):
        fake.gl.nondet.web.render.side_effect = RuntimeError("source unavailable")
        with self.assertRaises(RuntimeError):
            self.contract.verify_notice()
        self.assertEqual(self.contract.get_rule(), "")
        with self.assertRaisesRegex(ValueError, "no consensus"):
            self.contract.preview("RTSL-24", "2312AB")

    def test_case_matrix(self):
        rule = json.loads(parse_notice(PAGE))
        for model, lot, expected in [
            ("RTSL-24", "2312AB", "MATCH"), ("RTSL-24", "0001AB", "MATCH"),
            ("RTSL-24", "2401AB", "NO_MATCH"), ("RTSL-25", "", "NO_MATCH"),
            ("RTSL-24", "", "NEEDS_MORE_INFO"), ("RTSL-24", "2300AB", "NEEDS_MORE_INFO"),
            ("RTSL-24", "2313AB", "NEEDS_MORE_INFO"), ("RTSL-24", "9912AB", "NEEDS_MORE_INFO"),
            ("RTSL-24", "2312A", "NEEDS_MORE_INFO"), ("", "2312AB", "NEEDS_MORE_INFO"),
        ]:
            with self.subTest(model=model, lot=lot):
                self.assertEqual(verdict(model, lot, rule)[0], expected)

    def test_normalization_and_input_bounds(self):
        self.contract.verify_notice()
        result = json.loads(self.contract.preview(" rtsl-24 ", " 2312ab "))
        self.assertEqual(result["outcome"], "MATCH")
        for bad in ("x" * 33, "２３１２ＡＢ"):
            with self.assertRaises(ValueError):
                self.contract.preview("RTSL-24", bad)

    def test_record_isolation_and_input_bound_retries(self):
        self.contract.verify_notice()
        key = "f" * 32
        self.assertEqual(self.contract.record_check(key, "RTSL-24", "2312AB"), key)
        self.contract.record_check(key, "rtsl-24", "2312ab")
        with self.assertRaises(ValueError):
            self.contract.record_check(key, "RTSL-24", "2312AC")
        other = "0x" + "b" * 40
        self.assertEqual(self.contract.get_check(other, key), "")
        self.assertEqual(json.loads(self.contract.get_check(sender.upper().replace("0X", "0x"), key))["outcome"], "MATCH")
        fake.gl.message.sender_address = other
        self.contract.record_check(key, "RTSL-24", "2401AB")
        self.assertEqual(json.loads(self.contract.get_check(other, key))["outcome"], "NO_MATCH")
        with self.assertRaises(ValueError):
            self.contract.record_check("invalid", "RTSL-24", "2312AB")


if __name__ == "__main__":
    unittest.main()
