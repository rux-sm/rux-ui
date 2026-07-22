/* ==========================================================================
   RUX UI — ADDRESS DISPLAY FORMATTER
   --------------------------------------------------------------------------
   Presentation-only normalization for U.S. addresses. Stored/geocoded values
   remain unchanged; consumers use display() when rendering compact UI text.
   ========================================================================== */

(() => {
	"use strict";

	const STATE_ABBREVIATIONS = Object.freeze({
		Alabama: "AL",
		Alaska: "AK",
		Arizona: "AZ",
		Arkansas: "AR",
		California: "CA",
		Colorado: "CO",
		Connecticut: "CT",
		Delaware: "DE",
		Florida: "FL",
		Georgia: "GA",
		Hawaii: "HI",
		Idaho: "ID",
		Illinois: "IL",
		Indiana: "IN",
		Iowa: "IA",
		Kansas: "KS",
		Kentucky: "KY",
		Louisiana: "LA",
		Maine: "ME",
		Maryland: "MD",
		Massachusetts: "MA",
		Michigan: "MI",
		Minnesota: "MN",
		Mississippi: "MS",
		Missouri: "MO",
		Montana: "MT",
		Nebraska: "NE",
		Nevada: "NV",
		"New Hampshire": "NH",
		"New Jersey": "NJ",
		"New Mexico": "NM",
		"New York": "NY",
		"North Carolina": "NC",
		"North Dakota": "ND",
		Ohio: "OH",
		Oklahoma: "OK",
		Oregon: "OR",
		Pennsylvania: "PA",
		"Rhode Island": "RI",
		"South Carolina": "SC",
		"South Dakota": "SD",
		Tennessee: "TN",
		Texas: "TX",
		Utah: "UT",
		Vermont: "VT",
		Virginia: "VA",
		Washington: "WA",
		"West Virginia": "WV",
		Wisconsin: "WI",
		Wyoming: "WY",
		"District of Columbia": "DC",
	});

	const abbreviationByName = new Map(
		Object.entries(STATE_ABBREVIATIONS).map(([name, abbreviation]) => [
			name.toLocaleLowerCase(),
			abbreviation,
		]),
	);
	const statePattern = Object.keys(STATE_ABBREVIATIONS)
		.sort((a, b) => b.length - a.length)
		.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("|");
	const stateBeforeZip = new RegExp(
		`\\b(${statePattern})\\s*,?\\s+(\\d{5}(?:-\\d{4})?)$`,
		"i",
	);

	function display(address) {
		const withoutCountry = String(address || "")
			.replace(/,\s*(?:United States(?: of America)?|USA|US)\s*$/i, "")
			.trim();
		return withoutCountry.replace(stateBeforeZip, (_match, state, zip) => {
			const abbreviation = abbreviationByName.get(state.toLocaleLowerCase());
			return abbreviation ? `${abbreviation} ${zip}` : `${state} ${zip}`;
		});
	}

	window.RuxAddress = Object.freeze({ display });
})();
