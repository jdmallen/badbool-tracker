"""Regenerate src/entries.json from BADBOOL's README.

Usage: python3 scripts/extract.py
"""

import html
import json
import re
import urllib.request
from pathlib import Path

README_URL = "https://raw.githubusercontent.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List/master/README.md"
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "src" / "entries.json"
SITES_OUTPUT_PATH = REPO_ROOT / "api" / "src" / "sites.json"

SYMBOL_MEANINGS = {
	"💐": "crucial",
	"☠": "high priority",
	"🎫": "requires driver’s license (cross out your ID #!)",
	"📞": "must pick up a (gasp!) phone",
	"💰": "site charges money for access or removal (whaaaat?)",
}
LINK_PATTERN = re.compile(r"\[([^\]]*)\]\(([^)]*)\)")
ANGLE_LINK_PATTERN = re.compile(r"<([^<>\s]+)>")
OPT_OUT_HINTS = re.compile(r"opt|remov|suppression|privacy|control|delete|cancel", re.I)

# Hand-picked (search page, opt-out page) where the heuristic picks the wrong links
OVERRIDES = {
	"CheckPeople": ("", "https://checkpeople.com/opt-out"),
	"Acxiom": ("", "https://www.acxiom.com/optout/"),
	"Ancestry.com": ("https://www.ancestry.com/account/", "mailto:privacy@ancestry.com"),
	"Classmates.com": ("", "https://help.classmates.com/hc/en-us/articles/115002224171-How-can-I-cancel-my-membership-"),
	"Facecheck": ("https://Facecheck.id", "https://facecheck.id/Face-Search/RemoveMyPhotos"),
	"FamilySearch": ("https://www.familysearch.org/search/", "https://submit-irm.trustarc.com/services/validation/b8d6e704-e5b1-42a0-9f86-bbdec35939a1"),
	"OpenDataUSA": ("https://opendatausa.com/optout", "https://opendatausa.com/optout"),
	"PropertyRecs": ("https://dashboard.propertyrecs.com/opt-out", "https://dashboard.propertyrecs.com/opt-out"),
	"Rehold": ("https://rehold.com/", "https://rehold.com/"),
	"Searchbug": ("https://www.searchbug.com/", "https://www.searchbug.com/contact-us.aspx"),
	"TruePeopleSearch.com": ("https://www.truepeoplesearch.com/removal", "https://www.truepeoplesearch.com/removal"),
	"TruePeopleSearch.net": ("https://truepeoplesearch.net", "https://docs.google.com/forms/d/e/1FAIpQLSeCPggzv4iXE20iUjcr6vdVWxBOblCyGwDLcO-jZA5j2YF5fQ/viewform"),
	"United States Phone Book": ("https://www.unitedstatesphonebook.com/search.php", "https://www.unitedstatesphonebook.com/contact.php"),
	"USPhoneBook": ("", "https://www.usphonebook.com/opt-out/"),
	"PeopleSearchNow": ("", "https://www.peoplesearchnow.com/opt-out"),
	"FamilyTreeNow": ("", "https://www.familytreenow.com/optout"),
	"VoterRecords": ("https://voterrecords.com/", ""),
	"ZoomInfo": ("https://privacyrequest.zoominfo.com/remove/verify", "https://privacyrequest.zoominfo.com/remove/verify"),
	"White Pages": ("https://www.whitepages.com/", "https://www.whitepages.com/suppression_requests"),
	"BeenVerified": ("https://www.beenverified.com/app/optout/search", "https://www.beenverified.com/app/optout/search"),
	"Clustal": ("http://Clustal.org", "https://www.clustal.org/privacy-control"),
	"Intelius": ("https://www.intelius.com/", "https://suppression.peopleconnect.us/login"),
	"InfoTracer": ("https://www.infotracer.com", "https://infotracer.com/optout/"),
	"MyLife": ("https://www.mylife.com", "https://www.mylife.com/privacyrequest"),
}


def anchor(url, text):
	href = url if re.match(r"^(https?:|mailto:)", url) else f"mailto:{url}" if "@" in url else url
	return f'<a href="{html.escape(href)}" target="_blank" rel="noopener noreferrer">{html.escape(text)}</a>'


def markdown_to_html(markdown):
	"""Escape everything, then re-insert only the links."""
	pieces = []
	cursor = 0
	combined_pattern = re.compile(f"{LINK_PATTERN.pattern}|{ANGLE_LINK_PATTERN.pattern}")
	for match in combined_pattern.finditer(markdown):
		pieces.append(html.escape(markdown[cursor:match.start()]))
		if match.group(1) is not None:
			pieces.append(anchor(match.group(2), match.group(1)))
		else:
			pieces.append(anchor(match.group(3), match.group(3)))
		cursor = match.end()
	pieces.append(html.escape(markdown[cursor:]))
	paragraphs = re.split(r"\n\s*\n", "".join(pieces).strip())
	return "".join(f"<p>{re.sub(r'\s+', ' ', paragraph).strip()}</p>" for paragraph in paragraphs)


def slugify(name):
	return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main():
	with urllib.request.urlopen(README_URL) as response:
		readme_text = response.read().decode("utf-8")

	people_section = readme_text.split("## People Search Sites", 1)[1].split("## Special Circumstances", 1)[0]
	entry_blocks = re.split(r"^### ", people_section, flags=re.M)[1:]

	entries = []
	for block in entry_blocks:
		heading, _, body = block.partition("\n")
		symbols = [symbol for symbol in SYMBOL_MEANINGS if symbol in heading]
		name = heading
		for symbol in SYMBOL_MEANINGS:
			name = name.replace(symbol, "")
		name = name.strip()

		search_url = ""
		opt_out_url = ""
		for link_text, url in LINK_PATTERN.findall(body):
			if not opt_out_url and OPT_OUT_HINTS.search(link_text + " " + url):
				opt_out_url = url
			elif not search_url:
				search_url = url
		if name in OVERRIDES:
			search_url, opt_out_url = OVERRIDES[name]

		entries.append({
			"id": slugify(name),
			"name": name,
			"symbols": symbols,
			"searchUrl": search_url,
			"optOutUrl": opt_out_url,
			"instructionsHtml": markdown_to_html(body),
		})

	output = {"symbolMeanings": SYMBOL_MEANINGS, "entries": entries}
	OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
	print(f"Wrote {len(entries)} entries to {OUTPUT_PATH}")

	# Keeps the API's slug allowlist (validate.js) in sync with the site list
	slugs = [entry["id"] for entry in entries]
	SITES_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
	SITES_OUTPUT_PATH.write_text(json.dumps(slugs, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
	print(f"Wrote {len(slugs)} slugs to {SITES_OUTPUT_PATH}")


if __name__ == "__main__":
	main()
