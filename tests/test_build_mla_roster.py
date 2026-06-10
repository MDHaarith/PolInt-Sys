import unittest

from scripts.build_mla_roster import (
    normalize_party_id,
    parse_candidate_line,
    parse_constituency_header,
    parse_winner_blocks,
)


SAMPLE_TEXT = """
Election Commission of India, State Election,2026 to the legislative assembly of Tamil Nadu
Constituency 1 - GUMMIDIPOONDI ( TOTAL ELECTORS - 254175)
1 S.vijayakumar MALE 56 GENERAL TVK Whistle 93820 500 94320 40.56 37.11
2 Sudhakar.v MALE 40 GENERAL ADMK Two leaves 65894 481 66375 28.55 26.11
3 T.j.govindarajan MALE 65 GENERAL DMK Rising sun 61922 570 62492 26.88 24.59
TURN OUT TOTAL: 230900 1622 232522 - 91.48
Constituency 2 - PONNERI (SC) ( TOTAL ELECTORS - 251421)
1 Dr.ravi.m.s MALE 67 SC TVK Whistle 110051 388 110439 48.69 43.93
2 Durai Chandrasekar MALE 53 SC INC Hand 54301 370 54671 24.1 21.74
TURN OUT TOTAL: 225676 1143 226819 - 90.21
"""


class BuildMlaRosterTest(unittest.TestCase):
    def test_normalize_party_id(self):
        self.assertEqual(normalize_party_id("TVK"), "tvk")
        self.assertEqual(normalize_party_id("ADMK"), "aiadmk")
        self.assertEqual(normalize_party_id("DMK"), "dmk")
        self.assertEqual(normalize_party_id("AMMKMNKZ"), "ammk")
        self.assertEqual(normalize_party_id("Independent"), "ind")

    def test_parse_constituency_header(self):
        parsed = parse_constituency_header(
            "Constituency 2 - PONNERI (SC) ( TOTAL ELECTORS - 251421)"
        )
        self.assertEqual(parsed["constituencyNumber"], 2)
        self.assertEqual(parsed["constituency"], "PONNERI")
        self.assertEqual(parsed["reservationCategory"], "SC")
        self.assertEqual(parsed["totalElectors"], 251421)

    def test_parse_candidate_line(self):
        parsed = parse_candidate_line(
            "1 S.vijayakumar MALE 56 GENERAL TVK Whistle 93820 500 94320 40.56 37.11"
        )
        self.assertEqual(parsed["rank"], 1)
        self.assertEqual(parsed["candidateName"], "S.vijayakumar")
        self.assertEqual(parsed["gender"], "MALE")
        self.assertEqual(parsed["age"], 56)
        self.assertEqual(parsed["category"], "GENERAL")
        self.assertEqual(parsed["partyCode"], "TVK")
        self.assertEqual(parsed["votes"], 94320)
        self.assertEqual(parsed["voteShare"], 40.56)

    def test_parse_candidate_line_tolerates_page_artifact_in_elector_share(self):
        parsed = parse_candidate_line(
            "1 Ayyanar.r MALE 38 SC TVK Whistle 67953 627 68580 34.71 P3a0g.e9 1560"
        )
        self.assertEqual(parsed["candidateName"], "Ayyanar.r")
        self.assertEqual(parsed["party"], "tvk")
        self.assertEqual(parsed["votes"], 68580)
        self.assertEqual(parsed["voteShare"], 34.71)
        self.assertIsNone(parsed["electorShare"])

    def test_parse_winner_blocks_computes_margin(self):
        winners = parse_winner_blocks(SAMPLE_TEXT)
        self.assertEqual(len(winners), 2)
        self.assertEqual(winners[0]["mlaName"], "S.vijayakumar")
        self.assertEqual(winners[0]["party"], "tvk")
        self.assertEqual(winners[0]["marginVotes"], 27945)
        self.assertEqual(winners[1]["constituency"], "PONNERI")
        self.assertEqual(winners[1]["runnerUpName"], "Durai Chandrasekar")

    def test_parse_winner_blocks_uses_highest_votes_not_serial_number(self):
        text = """
Constituency 99 - SAMPLE ( TOTAL ELECTORS - 100000)
1 First Candidate MALE 50 GENERAL DMK Rising sun 10000 0 10000 10.0 10.0
2 Winning Candidate FEMALE 42 GENERAL TVK Whistle 30000 0 30000 30.0 30.0
3 Runner Candidate MALE 52 GENERAL ADMK Two leaves 20000 0 20000 20.0 20.0
TURN OUT TOTAL: 60000 0 60000 - 60.0
"""
        winners = parse_winner_blocks(text)
        self.assertEqual(winners[0]["mlaName"], "Winning Candidate")
        self.assertEqual(winners[0]["party"], "tvk")
        self.assertEqual(winners[0]["runnerUpName"], "Runner Candidate")
        self.assertEqual(winners[0]["marginVotes"], 10000)

    def test_parse_winner_blocks_handles_wrapped_winning_candidate_name(self):
        text = """
Constituency 142 - THIRUVERUMBUR ( TOTAL ELECTORS - 259701)
1 Vijayakumar (a)
MALE 56 GENERAL TVK Whistle 88886 951 89837 42.06 34.59
Navalpattu S. Viji
2 Anbil Mahesh Poyyamozhi MALE 48 GENERAL DMK Rising sun 79778 1354 81132 37.99 31.24
TURN OUT TOTAL: 210743 2840 213583 - 82.24
"""
        winners = parse_winner_blocks(text)
        self.assertEqual(winners[0]["mlaName"], "Vijayakumar (a) Navalpattu S. Viji")
        self.assertEqual(winners[0]["party"], "tvk")
        self.assertEqual(winners[0]["marginVotes"], 8705)


if __name__ == "__main__":
    unittest.main()
