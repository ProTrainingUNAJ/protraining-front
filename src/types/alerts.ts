export type AlertSeverity = 'High' | 'Medium' | 'Low';

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
  /** Fecha del aviso en hora de Argentina (YYYY-MM-DD) para buscar su check-in. */
  generatedDate?: string;
}

export interface ApplyNoticeResult {
  success: boolean;
  message: string;
  pendingArchiving?: boolean;
  /** Fecha (AAAA-MM-DD) de la sesión ajustada, cuando se aplicó a la próxima sesión. */
  sessionDate?: string;
}
