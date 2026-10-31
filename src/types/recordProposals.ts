import type { RecordProposal } from '../api/generated/entrenamiento';

// Tipos para las propuestas de récord estimadas por Epley (KAN-393 / KAN-394 / #099)
// Tipados directamente desde el contrato oficial de Entrenamiento (RecordProposal).
export type RecordProposalStatus = RecordProposal['status'];
export type RecordProposalItem = RecordProposal;
