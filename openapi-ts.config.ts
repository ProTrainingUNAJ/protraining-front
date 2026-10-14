import { defineConfig } from '@hey-api/openapi-ts';

const contracts = '../protraining-back/contracts';

export default defineConfig({
  input: [
    `${contracts}/identidad.yaml`,
    `${contracts}/estructura.yaml`,
    `${contracts}/entrenamiento.yaml`,
    `${contracts}/seguimiento.yaml`,
    `${contracts}/asistente.yaml`,
  ],
  output: [
    'src/api/generated/identidad',
    'src/api/generated/estructura',
    'src/api/generated/entrenamiento',
    'src/api/generated/seguimiento',
    'src/api/generated/asistente',
  ],
  plugins: ['@hey-api/client-axios', '@hey-api/sdk'],
});
