# Allegro: search offers and collect prices

## When to use
The human wants offers, prices or sellers for a product on allegro.pl.

## Parameters
- {query}: the product to search for, for example "RTX 5090".
- {count}: how many offers to report (default 10).
- {filters}: optional constraints (max price, condition, delivery).

## Steps
1. browser_act navigate to https://allegro.pl/listing?string={query} (URL-encode the query). Do not start from the home page; the listing URL skips one page load.
2. If a consent dialog covers the page, click "Zgadzam się" (browser_observe shows it as a button). It appears once per profile.
3. browser_read the listing. Offers are the list items with a price in "zł"; "Sponsorowane" items are ads, skip them unless the human asked for them. Sort by price: append &order=p to the URL (cheapest first) instead of clicking the sort control.
4. For {filters} use URL parameters where possible: price_to={max}, stan=nowe (new) or stan=używane (used), freeDelivery=1. Reading a filtered URL is one turn; clicking through the filter sidebar is three or more.
5. Collect for each offer: title, price, seller, delivery cost when shown, and the offer URL. Save with browser_save before opening any offer page.
6. Open an offer page only when the human needs details the listing does not show (description, seller rating, parameters).

## Pitfalls
- A page titled "allegro.pl" with the text "You have been blocked" is a DataDome block, not a network problem. It comes from a cookie left by a failed challenge and lasts up to a year. Call request_human with exactly this: "Allegro blocked the browser. Take the browser and click Clear site cookies, then give it back." Do not retry the navigation before that.
- A "slide to verify" or puzzle page is a DataDome captcha: call request_human; the human solves it in the sandbox browser. After that the profile is trusted again.
- The listing loads more offers on scroll; a browser_read capture holds only the loaded part. For more than about 60 offers, use page=2, page=3 in the URL.
- Prices on the listing may show "z dostawą" (including delivery) and the raw price separately; report which one you took.

## Ask the human when
- A block or captcha page appears (see Pitfalls).
- Buying, bidding, messaging a seller or logging in is required; those are the human's actions.
