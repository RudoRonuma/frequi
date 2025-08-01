import type { ExchangeSelectPayload } from './types';

export interface AvailablePairPayload {
  timeframe?: string;
  stake_currency?: string;
}

export type PairIntervalTuple = [string, string, string];

export interface AvailablePairResult {
  pairs: string[];
  /**
   * List of lists, as [pair, timeframe, candletype]
   */
  pair_interval: PairIntervalTuple[];
  length: number;
}

export interface PairCandlePayload {
  pair: string;
  timeframe: string;
  limit?: number;
  columns?: string[];
}

export interface CandleInfoPayload {
  pair: string;
  timeframe: string;
  date: string;
  filter: string | null;
}

export interface PushComboPayload {
  pair: string;
  timeframe: string;
  date: string;
  side: string;
  combo_id: number;
  confidence: number;
  inner_side: string;
  is_bad: boolean;
}

export interface RemoveComboPayload {
  pair: string;
  timeframe: string;
  date: string;
  side: string;
  combo_id: number;
  inner_side: string;
  is_bad: boolean;
}

export interface PairHistoryPayload extends ExchangeSelectPayload {
  pair: string;
  timeframe: string;
  timerange: string;
  strategy: string;
  freqaimodel?: string;
  columns?: string[];
  live_mode?: boolean;
}

export interface MarkArea {
  type: 'area';
  start?: string;
  end?: string;
  y_start?: number;
  y_end?: number;
  color?: string;
  label?: string;
}

export interface PairHistory {
  strategy: string;
  pair: string;
  timeframe: string;
  timeframe_ms: number;
  columns: string[];
  /** All columns - available starting with api 2.35
   * Contains all columns - columns may be filtered to the ones available.
   */
  all_columns?: string[];
  /** Actual data */
  data: number[][];
  annotations: MarkArea[];

  length: number;
  /** Number of buy signals in this response */
  buy_signals: number;
  /** Number of sell signals in this response */
  sell_signals: number;

  /** Number of long entry signals in this response */
  enter_long_signals?: number;
  /** Number of long exit signals in this response */
  exit_long_signals?: number;
  /** Number of short entry signals in this response */
  enter_short_signals?: number;
  /** Number of short exit signals in this response */
  exit_short_signals?: number;

  last_analyzed: number;
  /** Data start date in as millisecond timestamp */
  data_start_ts: number;
  /** Data start date in in the format YYYY-MM-DD HH24:MI:SS+00:00 */
  data_start: string;
  /** End date in in the format YYYY-MM-DD HH24:MI:SS+00:00 */
  data_stop: string;
  /** Data end date in as millisecond timestamp */
  data_stop_ts: number;
}

export interface CandleInfoElement {
  label: string;
  value: any;
  max_value: any;
  min_value: any;
}

export interface SingleCandleInfo {
  data: CandleInfoElement[];
}

export interface PushComboFileResponse {
  fileContent: string;
  fileName: string;
}

export interface RemoveComboResponse {
  fileContent: string;
  fileName: string;
}
