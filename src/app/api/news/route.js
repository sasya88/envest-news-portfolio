import axios from "axios";
import { parseStringPromise } from "xml2js";

const feedUrls = [
  "https://economictimes.indiatimes.com/rss/markets/rssfeeds/1977021501.cms",
  "https://economictimes.indiatimes.com/rss/markets/stocks/rssfeeds/2146842.cms",
  "https://www.moneycontrol.com/rss/MCtopnews.xml",
  "https://www.moneycontrol.com/rss/buzzingstocks.xml",
];

export async function GET() {
  try {
    const allItems = [];

    for (const url of feedUrls) {
      try {
        console.log(`Fetching from ${url}`);
        const res = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });

        console.log("Parsing RSS...");
        const parsed = await parseStringPromise(res.data);
        const items = parsed.rss.channel[0].item;

        for (let i = 0; i < items.length; i++) {
          const title = items[i].title?.[0];
          const link = items[i].link?.[0];
          if (title && link) {
            allItems.push({ title, link });
          }
        }
      } catch (innerErr) {
        console.error(`Error fetching or parsing ${url}:`, innerErr.message);
      }
    }

    const uniqueNews = Array.from(
      new Map(allItems.map((item) => [item.link, item])).values()
    );

    return Response.json(uniqueNews.slice(0, 100));
  } catch (error) {
    console.error("RSS Parsing Error:", error.message);
    return new Response("Failed to fetch RSS feed", { status: 500 });
  }
}
