"""
Notice classification engine for gas EBB critical notices.

Uses ordered regex rules adapted from the Synmax reference
(.refactor/synmax/pipeline_notices_with_analysis.py).
First matching rule wins.
"""

import re
from typing import Tuple


CLASSIFICATION_RULES: list[Tuple[str, str, int]] = [
    # (category, regex_pattern, default_severity 1-5)
    (
        "force_majeure",
        r"force\s*majeure|fmj|fm\s*(event|declaration|notice)",
        5,
    ),
    (
        "ofo",
        (
            r"ofo|operational\s*flow\s*order|critical\s*day|overage\s*alert"
            r"|underperformance|action\s*alert|system\s*overrun"
            r"|imbalance\s*order|penalty\s*factor"
        ),
        4,
    ),
    (
        "maintenance",
        (
            r"maintenance|planned.*outage|unplanned.*outage|repair"
            r"|construction|compressor\s*(station\s*)?work|pig\s*run"
            r"|hydro\s*test|inspection|turnaround|tie.in|dig\s*program"
        ),
        3,
    ),
    (
        "capacity_reduction",
        (
            r"capacity\s*(reduction|constraint)|restriction"
            r"|reduced\s*capacity|curtailment|capacity\s*posting"
            r"|pipeline\s*conditions|storage\s*conditions"
            r"|capacity\s*impact|pack\s*declaration"
        ),
        4,
    ),
    (
        "critical_alert",
        (
            r"critical|operational\s*alert|emergency|leak\s*investigation"
            r"|rupture|incident|interruption|shut.in|blow.down"
        ),
        4,
    ),
]


def classify(subject: str) -> Tuple[str, int]:
    """Classify a notice by its subject text.

    Returns (category, severity) tuple. Falls back to ("other", 1)
    if no rule matches.
    """
    if not subject:
        return ("other", 1)

    subject_lower = subject.lower()
    for category, pattern, severity in CLASSIFICATION_RULES:
        if re.search(pattern, subject_lower):
            return (category, severity)

    return ("other", 1)
