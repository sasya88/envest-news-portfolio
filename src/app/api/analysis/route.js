import { NextResponse } from 'next/server';
import natural from 'natural';

export async function POST(req) {
  const { headline } = await req.json(); // 👈 single headline string

  const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

  const score = analyzer.getSentiment(headline.split(" "));
  let sentiment = "Neutral";

  if (score > 0.2) sentiment = "Positive";
  else if (score < -0.2) sentiment = "Negative";
  

  return NextResponse.json({ score, sentiment });
}
