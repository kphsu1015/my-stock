import { Schema, model, models, type Model } from "mongoose";

export interface WatchlistItemDoc {
  symbol: string;
  label: string;
  addedAt: Date;
}

export interface WatchlistDoc {
  userId: string;
  items: WatchlistItemDoc[];
}

const WatchlistItemSchema = new Schema<WatchlistItemDoc>(
  {
    symbol: { type: String, required: true },
    label: { type: String, default: "" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const WatchlistSchema = new Schema<WatchlistDoc>(
  {
    userId: { type: String, required: true, unique: true },
    items: { type: [WatchlistItemSchema], default: [] },
  },
  { timestamps: true },
);

export const Watchlist: Model<WatchlistDoc> =
  (models.Watchlist as Model<WatchlistDoc>) ||
  model<WatchlistDoc>("Watchlist", WatchlistSchema);
