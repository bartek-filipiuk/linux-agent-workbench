import http from "node:http";

const page = body => `<!doctype html><html lang="en"><meta charset="utf-8"><title>LAW browser evaluation</title><style>body{font:18px system-ui;max-width:720px;margin:40px auto}label,button,select,input{display:block;margin:16px 0;padding:8px}button{cursor:pointer}#result{padding:20px}</style><body>${body}</body></html>`;
export const scenarios = [
  { id: "search", goal: "Search the catalog for blue notebook and leave its search results visible.", expected: "Search results for blue notebook: Blue Notebook, 12 EUR", html: `<h1>Catalog</h1><label>Search catalog<input id="q"></label><button onclick="document.getElementById('result').textContent='Search results for '+document.getElementById('q').value+': Blue Notebook, 12 EUR'">Search</button><p id="result"></p>` },
  { id: "filters", goal: "Filter the catalog to Books with In stock enabled. Apply the filters and leave the results visible.", expected: "Applied: Books, in stock: yes", html: `<h1>Catalog filters</h1><label>Category<select id="category"><option>All</option><option>Books</option><option>Music</option></select></label><label><input type="checkbox" id="stock">In stock</label><button onclick="document.getElementById('result').textContent='Applied: '+document.getElementById('category').value+', in stock: '+(document.getElementById('stock').checked?'yes':'no')">Apply filters</button><p id="result"></p>` },
  { id: "autocomplete", goal: "Choose Paris, France as the destination using the autocomplete suggestion.", expected: "Selected destination: Paris, France", html: `<h1>Destination</h1><label>Destination<input id="q"></label><div id="suggestions"></div><p id="result"></p><script>
    document.getElementById('q').addEventListener('input', e => {
      const suggestions = document.getElementById('suggestions'); suggestions.textContent = '';
      if (e.target.value.toLowerCase().includes('par')) setTimeout(() => {
        const button = document.createElement('button'); button.textContent = 'Paris, France';
        button.onclick = () => { document.getElementById('result').textContent = 'Selected destination: Paris, France'; suggestions.textContent = ''; };
        suggestions.append(button);
      }, 250);
    });
  </script>` },
  { id: "form", goal: "Prepare a contact preview for Ada in the Research department. Stop at the preview; do not send anything.", expected: "Preview: Ada — Research", html: `<h1>Contact preview</h1><label>Name<input id="name"></label><label>Department<select id="department"><option>Choose</option><option>Research</option><option>Support</option></select></label><button onclick="document.getElementById('result').textContent='Preview: '+document.getElementById('name').value+' — '+document.getElementById('department').value">Preview</button><p id="result"></p>` },
  { id: "navigation", goal: "Open the documentation, then open the Installation guide.", expected: "Installation guide: install the package and start the service.", html: `<h1>Project</h1><a href="/docs">Documentation</a><a href="/pricing">Pricing</a>` },
  { id: "tabs", goal: "Open the reference in its new tab and leave the Reference article visible.", expected: "Reference article: the orbit period is 42 days.", html: `<h1>Research</h1><a target="_blank" href="/reference">Open reference</a>` },
  { id: "scroll", goal: "Find the More details button near the bottom of the page and open the details.", expected: "Expanded details: warranty lasts two years.", html: `<h1>Product</h1><p>Read the details at the bottom.</p><div style="height:1700px"></div><button onclick="document.getElementById('result').textContent='Expanded details: warranty lasts two years.'">More details</button><p id="result"></p>` },
  { id: "disclosure", goal: "Expand the Shipping section and read the shipping time.", expected: "Shipping time: three business days.", html: `<h1>Help</h1><details><summary>Shipping</summary><p>Shipping time: three business days.</p></details><details><summary>Returns</summary><p>Return within thirty days.</p></details>` },
];

export async function startFixtures() {
  const extra = { "/docs": `<h1>Documentation</h1><a href="/installation">Installation guide</a>`, "/installation": `<h1>Installation guide</h1><p>Installation guide: install the package and start the service.</p>`, "/reference": `<h1>Reference article</h1><p>Reference article: the orbit period is 42 days.</p>` };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://fixture").pathname;
    const html = extra[pathname] ?? scenarios.find(s => pathname === `/${s.id}`)?.html;
    res.writeHead(html ? 200 : 404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(page(html ?? "Not found"));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
