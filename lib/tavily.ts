export interface TavilyResult {
  title: string;
  content: string;
  url: string;
}

export async function tavilySearch(
  query: string,
  apiKey: string,
  maxResults = 10
): Promise<TavilyResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return (data.results ?? []) as TavilyResult[];
  } catch {
    return [];
  }
}

export async function newsSearch(company: string): Promise<string[]> {
  try {
    const url =
      `https://news.google.com/rss/search?q=` +
      encodeURIComponent(`"${company}" Salesforce OR CRM OR funding`) +
      `&hl=en-US&gl=US`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    const matches = Array.from(text.matchAll(/<title>(.*?)<\/title>/g))
      .slice(1, 3)
      .map((m) => m[1].replace(/<[^>]+>|&amp;|&quot;|&#39;/g, "").trim())
      .filter((t) => t.length > 10);
    return matches;
  } catch {
    return [];
  }
}
