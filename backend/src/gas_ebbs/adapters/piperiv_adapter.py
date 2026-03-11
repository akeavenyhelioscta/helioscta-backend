"""
PipeRiv source-family adapter.

Handles all pipelines hosted on www.piperiv.com (13 pipelines).
Simple HTML table parsing — no session or JavaScript required.

Legacy reference: .refactor/helioscta_api_scrapes_gas_ebbs/algonquin/algonquin_critical_notices.py
"""

import re
from typing import Optional

from bs4 import BeautifulSoup

from backend.src.gas_ebbs.base_scraper import EBBScraper, register_adapter
from backend.src.gas_ebbs.ebb_utils import clean_text, extract_numeric_id


@register_adapter("piperiv")
class PipeRivAdapter(EBBScraper):
    """Adapter for all PipeRiv-hosted pipeline EBB pages.

    PipeRiv serves critical notices in a standard HTML table with <thead>/<tbody>.
    Each row has 8 cells:
        0: notice_type
        1: posted_datetime
        2: effective_datetime
        3: end_datetime
        4: notice_identifier (numeric)
        5: notice_status
        6: subject (may contain <a> link)
        7: response_datetime
    """

    def _parse_listing(self, html: str, **kwargs) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")

        table = soup.find("table")
        if not table:
            return []

        tbody = table.find("tbody")
        if not tbody:
            return []

        rows = tbody.find_all("tr")
        notices = []

        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 7:
                continue

            notice_id = clean_text(cells[4])
            if not extract_numeric_id(notice_id):
                continue

            # Extract detail URL from subject link if present
            detail_url = ""
            subject_cell = cells[6] if len(cells) > 6 else cells[5]
            subject_link = subject_cell.find("a")
            subject_text = clean_text(subject_cell)

            if subject_link and subject_link.get("href"):
                href = subject_link["href"]
                if href.startswith("/"):
                    detail_url = f"https://www.piperiv.com{href}"
                elif href.startswith("http"):
                    detail_url = href

            # Fallback: build detail URL from template
            if not detail_url and self.detail_url_template:
                detail_url = self.detail_url_template.format(
                    notice_identifier=notice_id,
                    **self.config,
                )

            notice = {
                "notice_type": clean_text(cells[0]),
                "notice_subtype": "",
                "posted_datetime": clean_text(cells[1]),
                "effective_datetime": clean_text(cells[2]),
                "end_datetime": clean_text(cells[3]),
                "notice_identifier": notice_id,
                "notice_status": clean_text(cells[5]) if len(cells) > 7 else "",
                "subject": subject_text,
                "response_datetime": clean_text(cells[7]) if len(cells) > 7 else "",
                "detail_url": detail_url,
            }
            notices.append(notice)

        return notices
