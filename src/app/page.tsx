"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface NewsItem {
  title: string;
  link: string;
}

interface SentimentData {
  sentiment: string;
  score: number;
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [linked, setLinked] = useState(false);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [bookmarks, setBookmarks] = useState<NewsItem[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [sentimentMap, setSentimentMap] = useState<
    Record<string, SentimentData>
  >({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);

    const saved = localStorage.getItem("bookmarkedNews");
    if (saved) setBookmarks(JSON.parse(saved));

    const fetchNews = async () => {
      try {
        const res = await axios.get("/api/news");
        setNews(res.data);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      }
    };
    fetchNews();
  }, []);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
      return;
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }

    const enabled = !notificationsEnabled;
    setNotificationsEnabled(enabled);

    if (enabled) {
      if (filteredNews.length > 0) {
        const notification = new Notification("Filtered News Alert", {
          body: filteredNews[0].title,
          icon: "/file.svg",
        });

        notification.onclick = () => {
          window.open(filteredNews[0].link, "_blank");
        };
      } else {
        const notification = new Notification("Envest Notification Enabled", {
          body: "We'll notify you when news matches your portfolio!",
          icon: "/file.svg",
        });

        notification.onclick = () => {
          window.open("/", "_blank");
        };
      }
    }
  };

  const handleLinkPortfolio = () => {
    setLinked(true);
    localStorage.setItem("userPortfolio", portfolio);

    const symbols = portfolio.split(",").map((s) => s.trim().toLowerCase());

    const filtered = news.filter((item) =>
      symbols.some((symbol) => item.title.toLowerCase().includes(symbol))
    );

    setFilteredNews(filtered);
    setSentimentMap({});
  };

  const fetchSentiment = async (item: NewsItem) => {
    try {
      const res = await axios.post("/api/analysis", {
        headline: item.title,
      });
      setSentimentMap((prev) => ({
        ...prev,
        [item.link]: res.data,
      }));
    } catch (error) {
      console.error("Sentiment fetch failed:", error);
    }
  };

  const toggleBookmark = (item: NewsItem) => {
    const exists = bookmarks.some((b) => b.link === item.link);
    const updated = exists
      ? bookmarks.filter((b) => b.link !== item.link)
      : [...bookmarks, item];

    setBookmarks(updated);
    localStorage.setItem("bookmarkedNews", JSON.stringify(updated));
  };

  const isBookmarked = (link: string) => bookmarks.some((b) => b.link === link);

  const getFavicon = (link: string) => {
    try {
      const domain = new URL(link).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}`;
    } catch {
      return "";
    }
  };

  const getSentimentIcon = (s: string) => {
    if (s === "Positive") return "🟢";
    if (s === "Negative") return "🔴";
    return "🟡";
  };
  const getConfidence = (score: number) => {
    const capped = Math.min(Math.abs(score), 5); // Cap extreme values
    return Math.round((capped / 5) * 100); // Convert to %
  };

  const NewsCard = ({
    item,
    onBookmark,
    isBookmarked,
    showAnalyze = false,
  }: {
    item: NewsItem;
    onBookmark?: (item: NewsItem) => void;
    isBookmarked?: boolean;
    showAnalyze?: boolean;
  }) => {
    const sentiment = sentimentMap[item.link];
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded px-4 py-3 hover:shadow-lg hover:scale-[1.01] transition flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black dark:text-white hover:underline flex items-center gap-2"
            >
              <img
                src={getFavicon(item.link)}
                alt="favicon"
                className="w-5 h-5 inline-block"
              />
              {item.title}
            </a>
            {sentiment && (
              <div className="mt-2 space-y-1">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {getSentimentIcon(sentiment.sentiment)}{" "}
                  <span className="font-medium">{sentiment.sentiment}</span>{" "}
                  (Score: {sentiment.score.toFixed(2)})
                </div>

                {/* Confidence bar */}
                <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      sentiment.sentiment === "Positive"
                        ? "bg-green-500"
                        : sentiment.sentiment === "Negative"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                    style={{ width: `${getConfidence(sentiment.score)}%` }}
                  />
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Confidence: {getConfidence(sentiment.score)}%
                </div>
              </div>
            )}
          </div>
          {onBookmark && (
            <button
              onClick={() => onBookmark(item)}
              className="ml-3 text-xl"
              title={isBookmarked ? "Remove Bookmark" : "Add to Watchlist"}
            >
              {isBookmarked ? "❤️" : "🤍"}
            </button>
          )}
        </div>
        {showAnalyze && !sentiment && (
          <button
            onClick={() => fetchSentiment(item)}
            className="text-sm bg-yellow-500 text-white px-2 py-1 rounded w-fit"
          >
            Analyze Sentiment
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans">
      {/* Navbar */}
      <nav className="bg-gray-200 dark:bg-gray-900 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow">
        <a
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-black dark:text-white"
        >
          <img src="/file.svg" alt="logo" className="w-6 h-6" />
          Envest News
        </a>
        <ul className="flex gap-4 text-blue-700 dark:text-blue-300 font-medium">
          <li>
            <a href="#portfolio" className="hover:underline">
              Portfolio
            </a>
          </li>
          <li>
            <a href="#news" className="hover:underline">
              News
            </a>
          </li>
          <li>
            <a href="#bookmarks" className="hover:underline">
              Watchlist
            </a>
          </li>
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleNotifications}
            className="text-xl"
            title={
              notificationsEnabled
                ? "Disable Notifications"
                : "Enable Notifications"
            }
          >
            {notificationsEnabled ? "🔔" : "🔕"}
          </button>
        </div>
      </nav>

      {/* Welcome */}
      <section className="px-6 py-8 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Welcome to Envest News! 📊</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Stay updated with the latest stock market news tailored to your
          portfolio. Add your portfolio, read market news, filter it based on
          your stocks, and get AI-driven impact analysis — stay notified, stay
          ahead.
        </p>
      </section>

      {/* Portfolio */}
      <section
        id="portfolio"
        className="px-6 py-10 max-w-4xl mx-auto border-b border-gray-300 dark:border-gray-700"
      >
        <h2 className="text-xl font-semibold mb-4">
          🔗 Link Your Portfolio (Simulated)
        </h2>
        <input
          type="text"
          placeholder="e.g., Nifty, Groww, Nykaa"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 text-black dark:text-white rounded px-4 py-2 mb-4 placeholder-gray-500"
        />
        <button
          onClick={handleLinkPortfolio}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Link Portfolio
        </button>

        {linked && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold mb-2">
              📌 News Matching Your Portfolio
            </h3>
            {filteredNews.length > 0 ? (
              filteredNews.map((item, idx) => (
                <NewsCard
                  key={idx}
                  item={item}
                  onBookmark={toggleBookmark}
                  isBookmarked={isBookmarked(item.link)}
                  showAnalyze={true}
                />
              ))
            ) : (
              <p className="text-gray-500 mt-4">
                No relevant news for your portfolio symbols.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Bookmarks */}
      <section
        id="bookmarks"
        className="px-6 py-10 max-w-4xl mx-auto border-b border-gray-300 dark:border-gray-700"
      >
        <h2 className="text-2xl font-semibold mb-6">⭐ Bookmarked News</h2>
        {bookmarks.length > 0 ? (
          <div className="space-y-4">
            {bookmarks.map((item, idx) => (
              <NewsCard
                key={idx}
                item={item}
                onBookmark={toggleBookmark}
                isBookmarked={true}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No bookmarks yet. Click 🤍 to save news.
          </p>
        )}
      </section>

      {/* General News */}
      <section id="news" className="px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">📰 General Market News</h2>
        <div className="space-y-4">
          {news.map((item, idx) => (
            <NewsCard
              key={idx}
              item={item}
              onBookmark={toggleBookmark}
              isBookmarked={isBookmarked(item.link)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
