export type AlertSeverity = 'High' | 'Medium' | 'Low';

export interface PreventiveAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  generatedAt: string;
  severity: AlertSeverity;
  reason: string;
  suggestion: string;
  reviewed: boolean;
}

export interface NoticeItem {
  id: string;
  athleteId: string;
  athleteName: string;
  generatedAt: string;
  severity: AlertSeverity;
  reason: string;
  suggestion: string;
  reviewed: boolean;
  canApplyWithOneClick: boolean;
  actionType?: 'routine_adjustment' | 'load_reduction' | 'habits_approval';
  actionLabel?: string;
  isDemo?: boolean;
  painZones?: string;
}

export interface ApplyNoticeResult {
  success: boolean;
  message: string;
  pendingArchiving?: boolean;
}
