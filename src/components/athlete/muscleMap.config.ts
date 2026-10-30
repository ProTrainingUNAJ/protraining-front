/**
 * ProTraining — Precise Anatomical Geometry for 12 Official Muscle Groups + 8 Joints
 * Reconstructed with exact sub-pixel boundaries from official reference image.
 */
import {
  OfficialMuscleGroup,
  JointRegion,
  ColorPaletteItem,
  MUSCLE_COLORS,
} from './muscleMap.types';

export const INJURY_PALETTE_ITEM: ColorPaletteItem = {
  id: 'injury',
  name: 'Activa',
  hex: MUSCLE_COLORS.injury,
  colorVar: '#000000',
  level: 6,
  description: 'Zona con lesión activa registrada.',
};

export const OFFICIAL_PALETTE_ITEMS: ColorPaletteItem[] = [
  {
    id: 'white',
    name: 'Sin dolor',
    hex: MUSCLE_COLORS.white,
    colorVar: 'var(--muscle-color-white)',
    level: 0,
    description: 'Estado normal, sin dolor registrado.',
  },
  {
    id: 'darkGreen',
    name: 'Leve',
    hex: MUSCLE_COLORS.darkGreen,
    colorVar: 'var(--muscle-color-dark-green)',
    level: 1,
    description: 'Sensación leve / ligera sobrecarga.',
  },
  {
    id: 'lightGreen',
    name: 'Molestia',
    hex: MUSCLE_COLORS.lightGreen,
    colorVar: 'var(--muscle-color-light-green)',
    level: 2,
    description: 'Molestia perceptible al movimiento.',
  },
  {
    id: 'yellow',
    name: 'Moderado',
    hex: MUSCLE_COLORS.yellow,
    colorVar: 'var(--muscle-color-yellow)',
    level: 3,
    description: 'Dolor limitante pero tolerable.',
  },
  {
    id: 'orange',
    name: 'Fuerte',
    hex: MUSCLE_COLORS.orange,
    colorVar: 'var(--muscle-color-orange)',
    level: 4,
    description: 'Dolor agudo que restringe el esfuerzo.',
  },
  {
    id: 'red',
    name: 'Máximo',
    hex: MUSCLE_COLORS.red,
    colorVar: 'var(--muscle-color-red)',
    level: 5,
    description: 'Dolor severo / molestia máxima.',
  },
  INJURY_PALETTE_ITEM,
];

export const getColorByPainLevel = (level: number = 0): string => {
  if (level === 6) return '#000000';
  const item = OFFICIAL_PALETTE_ITEMS.find((p) => p.level === level);
  return item ? item.colorVar : 'var(--muscle-color-white)';
};

export const getHexByPainLevel = (level: number = 0): string => {
  if (level === 6) return '#000000';
  const item = OFFICIAL_PALETTE_ITEMS.find((p) => p.level === level);
  return item ? item.hex : MUSCLE_COLORS.white;
};

export const OFFICIAL_MUSCLE_GROUPS: OfficialMuscleGroup[] = [
  {
    id: 'pecho_derecho',
    name: 'Pecho derecho',
    view: 'front',
    category: 'Tren Superior',
    frontCenter: { x: 155, y: 172 },
    frontPath:
      'M 160 139 L 178 141 L 185 148 L 188 164 L 188 180 L 184 196 L 175 202 L 163 204 L 150 203 L 136 196 L 125 181 L 122 167 L 128 153 L 136 145 L 142 142 L 159 140 Z',
  },
  {
    id: 'pecho_izquierdo',
    name: 'Pecho izquierdo',
    view: 'front',
    category: 'Tren Superior',
    frontCenter: { x: 226, y: 172 },
    frontPath:
      'M 215 139 L 238 142 L 248 148 L 253 154 L 259 169 L 257 179 L 250 191 L 239 200 L 225 204 L 206 202 L 197 196 L 193 180 L 195 151 L 201 142 L 206 140 L 214 140 Z',
  },
  {
    id: 'hombro_derecho',
    name: 'Hombro derecho',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 111, y: 161 },
    frontPath:
      'M 114 131 L 125 131 L 139 138 L 126 148 L 114 170 L 105 179 L 88 191 L 83 178 L 83 166 L 89 149 L 101 136 L 113 132 Z',
    backCenter: { x: 276, y: 160 },
    backPath:
      'M 255 134 L 268 134 L 280 140 L 290 150 L 296 164 L 296 175 L 292 185 L 286 188 L 276 182 L 269 175 L 266 165 L 262 153 L 256 142 L 255 134 Z',
  },
  {
    id: 'hombro_izquierdo',
    name: 'Hombro izquierdo',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 269, y: 160 },
    frontPath:
      'M 256 131 L 264 131 L 277 136 L 289 148 L 296 166 L 296 180 L 293 189 L 291 190 L 274 178 L 264 167 L 255 149 L 242 138 L 255 132 Z',
    backCenter: { x: 104, y: 160 },
    backPath:
      'M 125 134 L 112 134 L 100 140 L 90 150 L 84 164 L 84 175 L 88 185 L 94 188 L 104 182 L 111 175 L 114 165 L 118 153 L 124 142 L 125 134 Z',
  },
  {
    id: 'cuello_trapecio_derecho',
    name: 'Cuello y trapecio derecho',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 153, y: 128 },
    frontPath:
      'M 172 96 L 166 104 L 158 113 L 148 122 L 136 128 L 124 131 L 114 131 L 126 132 L 138 136 L 150 140 L 162 140 L 174 143 L 184 151 L 189 168 L 186 144 L 183 126 L 178 108 L 174 96 Z',
    backCenter: { x: 215, y: 116 },
    backPath:
      'M 195 86 L 201 91 L 209 106 L 216 113 L 251 130 L 244 135 L 232 141 L 225 149 L 217 165 L 193 180 L 195 86 Z',
  },
  {
    id: 'cuello_trapecio_izquierdo',
    name: 'Cuello y trapecio izquierdo',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 227, y: 128 },
    frontPath:
      'M 208 96 L 214 104 L 222 113 L 232 122 L 244 128 L 256 131 L 266 131 L 254 132 L 242 136 L 230 140 L 218 140 L 206 143 L 196 151 L 191 168 L 194 144 L 197 126 L 202 108 L 206 96 Z',
    backCenter: { x: 165, y: 116 },
    backPath:
      'M 185 86 L 179 91 L 171 106 L 164 113 L 129 130 L 136 135 L 148 141 L 155 149 L 163 165 L 187 180 L 185 86 Z',
  },
  {
    id: 'biceps_derecho',
    name: 'Bíceps derecho',
    view: 'front',
    category: 'Tren Superior',
    frontCenter: { x: 102, y: 218 },
    frontPath:
      'M 114 178 L 120 198 L 120 216 L 116 233 L 107 249 L 94 259 L 87 247 L 85 228 L 87 213 L 93 198 L 113 179 Z',
  },
  {
    id: 'biceps_izquierdo',
    name: 'Bíceps izquierdo',
    view: 'front',
    category: 'Tren Superior',
    frontCenter: { x: 277, y: 219 },
    frontPath:
      'M 265 179 L 278 188 L 289 201 L 294 225 L 292 247 L 290 253 L 285 259 L 269 242 L 263 229 L 260 213 L 261 194 L 265 180 Z',
  },
  {
    id: 'triceps_derecho',
    name: 'Tríceps derecho',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 284, y: 217 },
    backPath:
      'M 269 175 L 277 184 L 281 192 L 289 233 L 289 248 L 285 256 L 279 254 L 272 247 L 265 234 L 262 214 L 269 176 Z M 283 187 L 293 198 L 297 206 L 301 222 L 301 241 L 299 249 L 298 251 L 297 250 L 292 238 L 283 188 Z',
  },
  {
    id: 'triceps_izquierdo',
    name: 'Tríceps izquierdo',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 96, y: 217 },
    backPath:
      'M 111 175 L 112 188 L 117 207 L 117 227 L 115 235 L 107 249 L 100 255 L 95 256 L 92 251 L 91 237 L 99 194 L 104 183 L 110 176 Z M 97 187 L 89 234 L 83 250 L 82 251 L 79 240 L 80 215 L 86 199 L 96 188 Z',
  },
  {
    id: 'abdominales',
    name: 'Abdominales',
    view: 'front',
    category: 'Zona Media',
    frontCenter: { x: 190, y: 262 },
    frontPath:
      'M 247 200 L 245 210 L 241 214 L 232 218 L 230 216 L 230 212 L 232 209 L 240 206 L 246 201 Z M 134 201 L 149 209 L 151 212 L 150 217 L 140 214 L 136 210 L 134 202 Z M 179 206 L 184 206 L 188 210 L 189 223 L 187 228 L 167 234 L 163 234 L 159 230 L 157 223 L 159 213 L 165 209 L 178 207 Z M 197 206 L 218 210 L 223 217 L 222 230 L 218 234 L 214 234 L 196 229 L 192 220 L 193 210 L 196 207 Z M 135 213 L 148 220 L 152 225 L 152 236 L 145 234 L 137 226 L 135 214 Z M 246 213 L 246 223 L 242 229 L 235 235 L 229 236 L 228 228 L 233 220 L 245 214 Z M 135 228 L 148 238 L 154 247 L 154 253 L 152 255 L 144 250 L 135 240 L 135 229 Z M 246 228 L 247 237 L 244 243 L 229 255 L 227 253 L 227 246 L 232 239 L 245 229 Z M 197 234 L 213 237 L 220 241 L 222 249 L 219 257 L 215 259 L 196 257 L 193 254 L 193 238 L 196 235 Z M 176 235 L 187 235 L 189 240 L 188 255 L 184 258 L 176 259 L 166 259 L 161 255 L 159 249 L 161 241 L 167 237 L 175 236 Z M 135 244 L 152 259 L 156 269 L 155 279 L 151 278 L 145 273 L 141 267 L 135 245 Z M 246 244 L 240 269 L 229 279 L 225 276 L 225 270 L 228 261 L 245 245 Z M 178 262 L 185 262 L 188 265 L 188 283 L 185 286 L 176 286 L 166 284 L 163 281 L 161 275 L 162 267 L 169 263 L 177 263 Z M 196 262 L 217 265 L 220 268 L 220 276 L 217 283 L 213 285 L 196 286 L 193 281 L 193 266 L 195 263 Z M 241 273 L 246 301 L 229 316 L 227 315 L 225 309 L 225 295 L 227 289 L 240 274 Z M 141 274 L 151 283 L 157 298 L 157 306 L 154 316 L 137 302 L 141 284 L 141 275 Z M 168 289 L 182 290 L 188 295 L 190 339 L 189 351 L 182 347 L 169 323 L 163 304 L 163 294 L 167 290 Z M 204 289 L 216 290 L 219 296 L 219 302 L 211 328 L 201 346 L 195 351 L 192 348 L 193 296 L 195 292 L 203 290 Z M 138 310 L 157 331 L 157 334 L 159 334 L 168 344 L 165 363 L 151 342 L 138 311 Z M 245 310 L 240 326 L 219 362 L 218 363 L 217 359 L 215 344 L 224 333 L 225 335 L 226 334 L 227 329 L 244 311 Z',
  },
  {
    id: 'cuadriceps_derecho',
    name: 'Cuádriceps derecho',
    view: 'front',
    category: 'Tren Inferior',
    frontCenter: { x: 151, y: 401 },
    frontPath:
      'M 139 323 L 156 364 L 160 387 L 160 400 L 157 416 L 147 437 L 131 406 L 126 386 L 126 364 L 137 340 L 139 324 Z M 156 353 L 171 378 L 180 406 L 179 429 L 177 410 L 173 398 L 162 380 L 156 354 Z M 124 368 L 123 383 L 126 401 L 142 439 L 142 450 L 140 455 L 136 457 L 127 442 L 120 422 L 117 405 L 117 391 L 119 380 L 124 369 Z M 162 384 L 174 409 L 177 426 L 177 441 L 173 453 L 166 459 L 160 459 L 153 450 L 152 440 L 162 409 L 162 385 Z',
  },
  {
    id: 'cuadriceps_izquierdo',
    name: 'Cuádriceps izquierdo',
    view: 'front',
    category: 'Tren Inferior',
    frontCenter: { x: 232, y: 401 },
    frontPath:
      'M 244 323 L 246 337 L 256 359 L 258 368 L 258 385 L 256 396 L 251 411 L 237 437 L 229 422 L 224 401 L 224 381 L 228 362 L 244 324 Z M 228 352 L 222 373 L 222 379 L 216 387 L 208 404 L 203 429 L 203 409 L 206 395 L 211 381 L 227 353 Z M 260 368 L 264 379 L 266 392 L 264 417 L 259 435 L 249 455 L 247 457 L 244 456 L 241 449 L 243 434 L 253 415 L 259 397 L 261 384 L 260 369 Z M 221 384 L 221 404 L 224 419 L 231 438 L 230 450 L 225 458 L 215 458 L 209 451 L 205 438 L 209 410 L 221 385 Z',
  },
  {
    id: 'gluteo_derecho',
    name: 'Glúteo derecho',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 228, y: 338 },
    backPath:
      'M 226 309 L 236 309 L 241 311 L 247 318 L 251 334 L 238 322 L 222 315 L 213 314 L 225 310 Z M 206 319 L 221 319 L 229 321 L 238 326 L 249 337 L 254 349 L 254 363 L 249 375 L 239 384 L 221 389 L 208 387 L 197 379 L 192 366 L 192 346 L 195 335 L 205 320 Z',
  },
  {
    id: 'gluteo_izquierdo',
    name: 'Glúteo izquierdo',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 152, y: 337 },
    backPath:
      'M 143 309 L 154 309 L 166 314 L 153 316 L 143 321 L 130 333 L 130 328 L 135 315 L 142 310 Z M 164 318 L 173 319 L 180 326 L 186 339 L 188 349 L 188 365 L 182 380 L 171 387 L 152 388 L 139 382 L 132 374 L 127 363 L 126 351 L 133 334 L 144 324 L 157 319 L 163 319 Z',
  },
  {
    id: 'isquiotibial_derecho',
    name: 'Isquiotibial derecho',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 221, y: 439 },
    backPath:
      'M 196 384 L 206 391 L 219 393 L 212 399 L 207 407 L 203 420 L 201 437 L 194 399 L 196 385 Z M 235 390 L 238 391 L 243 400 L 252 425 L 253 448 L 251 458 L 252 479 L 255 494 L 242 473 L 236 455 L 228 401 L 228 392 L 234 391 Z M 223 393 L 225 393 L 229 436 L 235 461 L 233 481 L 227 492 L 223 465 L 216 448 L 210 426 L 211 406 L 216 398 L 222 394 Z M 207 417 L 209 436 L 219 463 L 223 488 L 221 499 L 216 506 L 205 476 L 203 438 L 207 418 Z',
  },
  {
    id: 'isquiotibial_izquierdo',
    name: 'Isquiotibial izquierdo',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 158, y: 439 },
    backPath:
      'M 182 385 L 184 390 L 184 407 L 178 437 L 177 422 L 172 407 L 167 399 L 160 393 L 169 392 L 181 386 Z M 142 389 L 151 392 L 148 428 L 140 466 L 127 490 L 125 492 L 128 467 L 126 433 L 132 409 L 141 390 Z M 154 392 L 165 401 L 169 410 L 170 418 L 167 437 L 154 475 L 153 493 L 148 486 L 144 474 L 144 463 L 152 425 L 154 393 Z M 172 417 L 175 427 L 175 469 L 173 479 L 162 506 L 158 500 L 156 490 L 160 464 L 170 437 L 172 418 Z',
  },
  {
    id: 'gemelo_derecho',
    name: 'Gemelo derecho',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 238, y: 532 },
    backPath:
      'M 244 492 L 248 492 L 254 499 L 260 510 L 265 526 L 265 543 L 262 554 L 256 566 L 252 569 L 247 569 L 241 560 L 240 502 L 243 493 Z M 229 497 L 234 499 L 237 512 L 235 553 L 231 566 L 225 571 L 218 570 L 214 566 L 209 553 L 209 538 L 214 520 L 223 503 L 228 498 Z',
  },
  {
    id: 'gemelo_izquierdo',
    name: 'Gemelo izquierdo',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 141, y: 532 },
    backPath:
      'M 133 491 L 137 494 L 139 502 L 139 553 L 135 566 L 132 569 L 127 569 L 123 566 L 118 557 L 114 543 L 114 526 L 117 515 L 125 499 L 132 492 Z M 147 497 L 151 497 L 156 503 L 168 529 L 170 538 L 170 553 L 165 566 L 159 571 L 153 571 L 146 562 L 142 530 L 142 513 L 146 498 Z',
  },
  {
    id: 'espalda_alta',
    name: 'Espalda alta',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 190, y: 175 },
    backPath:
      'M 193 180 L 217 165 L 225 149 L 232 141 L 244 135 L 248 148 L 248 168 L 231 182 L 217 186 L 193 227 L 187 226 L 163 186 L 149 182 L 132 168 L 132 148 L 136 135 L 148 141 L 155 149 L 163 165 L 187 180 Z',
  },
  {
    id: 'espalda_media',
    name: 'Espalda media (Dorsales)',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 190, y: 222 },
    backPath:
      'M 123 161 L 138 178 L 153 187 L 138 193 L 123 190 L 118 185 L 116 180 L 118 168 L 123 162 Z M 257 161 L 264 172 L 264 181 L 262 185 L 257 190 L 249 193 L 236 192 L 227 187 L 242 178 L 256 162 Z M 158 189 L 161 190 L 173 210 L 179 226 L 161 254 L 157 268 L 156 284 L 127 232 L 120 210 L 118 192 L 124 196 L 136 198 L 157 190 Z M 219 189 L 241 198 L 254 197 L 262 192 L 259 213 L 250 239 L 224 284 L 223 271 L 219 256 L 201 227 L 203 217 L 219 190 Z M 182 234 L 185 236 L 186 240 L 185 272 L 181 276 L 166 280 L 160 285 L 165 258 L 173 243 L 181 235 Z M 196 234 L 199 235 L 206 243 L 213 255 L 217 266 L 219 285 L 211 279 L 197 275 L 193 269 L 193 240 L 195 235 Z',
  },
  {
    id: 'espalda_baja',
    name: 'Espalda baja (Lumbares)',
    view: 'back',
    category: 'Zona Media',
    backCenter: { x: 190, y: 291 },
    backPath:
      'M 138 261 L 147 273 L 153 285 L 153 296 L 151 299 L 139 302 L 137 304 L 136 303 L 135 290 L 139 277 L 138 262 Z M 241 262 L 241 278 L 245 289 L 245 300 L 243 304 L 230 300 L 226 295 L 228 282 L 240 263 Z M 186 277 L 186 323 L 174 310 L 159 301 L 160 293 L 166 286 L 185 278 Z M 193 277 L 215 287 L 221 297 L 221 301 L 204 311 L 194 323 L 193 278 Z',
  },
  {
    id: 'antebrazo_derecho',
    name: 'Antebrazo derecho',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 66, y: 308 },
    frontPath:
      'M 68 248 L 62 254 L 54 266 L 48 277 L 46 290 L 45 302 L 44 316 L 41 330 L 38 335 L 35 344 L 38 345 L 42 342 L 46 340 L 50 342 L 54 344 L 62 346 L 66 338 L 72 328 L 78 320 L 84 312 L 90 305 L 94 298 L 98 290 L 101 282 L 102 274 L 99 266 L 95 263 L 91 262 L 88 268 L 85 274 L 81 278 L 77 279 L 73 278 L 68 274 L 66 268 L 68 262 L 71 255 L 73 248 Z',
    backCenter: { x: 308, y: 308 },
    backPath:
      'M 309 248 L 317 260 L 324 275 L 327 290 L 329 310 L 332 328 L 335 338 L 340 344 L 337 342 L 334 340 L 330 342 L 326 344 L 316 346 L 312 344 L 307 336 L 300 326 L 293 315 L 286 305 L 279 294 L 276 282 L 275 272 L 277 263 L 282 260 L 286 263 L 289 265 L 292 268 L 295 274 L 299 278 L 303 279 L 307 278 L 312 274 L 314 268 L 312 262 L 307 255 L 304 248 Z',
  },
  {
    id: 'antebrazo_izquierdo',
    name: 'Antebrazo izquierdo',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 314, y: 308 },
    frontPath:
      'M 312 248 L 318 254 L 326 266 L 332 277 L 334 290 L 335 302 L 336 316 L 339 330 L 342 335 L 345 344 L 342 345 L 338 342 L 334 340 L 330 342 L 326 344 L 318 346 L 314 338 L 308 328 L 302 320 L 296 312 L 290 305 L 286 298 L 282 290 L 279 282 L 278 274 L 281 266 L 285 263 L 289 262 L 292 268 L 295 274 L 299 278 L 303 279 L 307 278 L 312 274 L 314 268 L 312 262 L 309 255 L 307 248 Z',
    backCenter: { x: 72, y: 308 },
    backPath:
      'M 71 248 L 63 260 L 56 275 L 53 290 L 51 310 L 48 328 L 45 338 L 40 344 L 43 342 L 46 340 L 50 342 L 54 344 L 64 346 L 68 344 L 73 336 L 80 326 L 87 315 L 94 305 L 101 294 L 104 282 L 105 272 L 103 263 L 98 260 L 94 263 L 91 265 L 88 268 L 85 274 L 81 278 L 77 279 L 73 278 L 68 274 L 66 268 L 68 262 L 73 255 L 76 248 Z',
  },
  {
    id: 'mano_derecha',
    name: 'Mano derecha',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 40, y: 383 },
    frontPath:
      'M 28 348 L 37 348 L 39 354 L 44 357 L 48 357 L 52 355 L 55 350 L 55 348 L 63 348 L 64 358 L 65 359 L 64 376 L 63 377 L 63 382 L 61 387 L 61 392 L 59 396 L 58 404 L 56 408 L 53 411 L 50 411 L 44 419 L 42 420 L 39 419 L 37 422 L 35 423 L 30 423 L 27 419 L 27 416 L 26 415 L 23 415 L 20 413 L 20 401 L 22 395 L 22 390 L 23 389 L 24 380 L 23 379 L 18 382 L 11 382 L 8 378 L 9 375 L 14 370 L 23 354 L 28 348 Z',
    backCenter: { x: 334, y: 383 },
    backPath:
      'M 311 348 L 319 348 L 321 354 L 326 357 L 330 357 L 334 355 L 337 350 L 337 348 L 344 348 L 350 355 L 352 360 L 359 371 L 364 376 L 364 380 L 363 382 L 360 383 L 353 382 L 350 379 L 348 380 L 349 381 L 350 391 L 351 392 L 352 402 L 353 403 L 353 412 L 351 415 L 346 416 L 344 422 L 341 424 L 338 424 L 334 420 L 330 420 L 328 419 L 324 412 L 321 412 L 317 409 L 315 403 L 314 395 L 313 394 L 310 375 L 309 374 L 309 357 L 311 352 L 311 348 Z',
  },
  {
    id: 'mano_izquierda',
    name: 'Mano izquierda',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 341, y: 383 },
    frontPath:
      'M 318 348 L 325 348 L 327 354 L 332 357 L 336 357 L 340 355 L 343 350 L 343 348 L 351 348 L 357 354 L 362 364 L 371 376 L 371 380 L 369 382 L 361 382 L 357 379 L 356 380 L 357 388 L 358 389 L 358 394 L 360 400 L 361 410 L 359 414 L 353 416 L 353 419 L 350 423 L 345 423 L 341 419 L 339 420 L 335 418 L 332 412 L 331 411 L 327 411 L 324 408 L 322 404 L 322 400 L 320 394 L 320 389 L 319 388 L 318 380 L 316 375 L 316 367 L 315 366 L 316 354 L 318 348 Z',
    backCenter: { x: 45, y: 382 },
    backPath:
      'M 35 348 L 43 348 L 45 354 L 50 357 L 54 357 L 58 355 L 61 350 L 61 348 L 68 348 L 69 356 L 70 357 L 70 369 L 69 370 L 69 375 L 68 376 L 68 380 L 67 381 L 67 384 L 65 389 L 65 393 L 64 394 L 64 397 L 62 403 L 60 407 L 58 409 L 54 410 L 53 413 L 49 417 L 45 417 L 39 422 L 36 421 L 34 419 L 32 413 L 30 414 L 28 413 L 26 410 L 26 402 L 27 401 L 28 390 L 30 384 L 30 379 L 29 378 L 24 381 L 18 381 L 16 380 L 15 378 L 15 376 L 27 360 L 31 352 L 35 348 Z',
  },
  {
    id: 'pie_derecho',
    name: 'Pie derecho',
    view: 'both',
    category: 'Tren Inferior',
    frontCenter: { x: 140, y: 651 },
    frontPath:
      'M 128 625 L 136 625 L 137 630 L 143 635 L 149 635 L 151 634 L 155 630 L 156 625 L 164 625 L 164 627 L 161 632 L 161 649 L 162 650 L 161 660 L 157 668 L 154 670 L 151 671 L 144 671 L 143 670 L 140 670 L 139 671 L 136 670 L 128 670 L 125 668 L 123 669 L 113 665 L 112 663 L 112 656 L 120 647 L 128 635 L 129 632 L 129 627 L 128 625 Z',
    backCenter: { x: 241, y: 651 },
    backPath:
      'M 219 625 L 229 625 L 230 630 L 236 635 L 242 635 L 244 634 L 248 630 L 249 625 L 254 625 L 255 627 L 254 640 L 256 644 L 267 657 L 268 663 L 266 667 L 261 670 L 251 670 L 250 671 L 241 672 L 240 673 L 232 673 L 223 670 L 220 665 L 220 655 L 221 654 L 221 649 L 222 648 L 222 639 L 219 630 L 219 625 Z',
  },
  {
    id: 'pie_izquierdo',
    name: 'Pie izquierdo',
    view: 'both',
    category: 'Tren Inferior',
    frontCenter: { x: 239, y: 651 },
    frontPath:
      'M 215 625 L 224 625 L 225 630 L 231 635 L 237 635 L 239 634 L 243 630 L 244 625 L 251 625 L 251 628 L 250 629 L 251 636 L 253 638 L 257 646 L 266 656 L 267 658 L 267 665 L 264 668 L 260 668 L 257 670 L 252 670 L 251 671 L 227 672 L 223 670 L 217 659 L 217 651 L 218 650 L 219 638 L 218 637 L 218 633 L 216 630 L 215 625 Z',
    backCenter: { x: 134, y: 651 },
    backPath:
      'M 121 625 L 131 625 L 132 630 L 138 635 L 144 635 L 146 634 L 150 630 L 151 625 L 157 625 L 156 634 L 154 638 L 154 649 L 156 655 L 156 664 L 155 667 L 151 671 L 149 672 L 145 672 L 144 673 L 136 673 L 135 672 L 130 672 L 126 670 L 116 670 L 111 668 L 108 665 L 107 660 L 109 655 L 117 647 L 121 641 L 121 634 L 120 633 L 121 625 Z',
  },
];

export const OFFICIAL_JOINTS: JointRegion[] = [
  {
    id: 'rodilla_derecha',
    name: 'Rodilla derecha',
    view: 'both',
    frontCenter: { x: 149, y: 478 },
    frontPath:
      'M 149 465 C 156.2 465 162 470.8 162 478 C 162 485.2 156.2 491 149 491 C 141.8 491 136 485.2 136 478 C 136 470.8 141.8 465 149 465 Z',
    backCenter: { x: 233, y: 478 },
    backPath:
      'M 233 466 C 239.6 466 245 471.4 245 478 C 245 484.6 239.6 490 233 490 C 226.4 490 221 484.6 221 478 C 221 471.4 226.4 466 233 466 Z',
  },
  {
    id: 'rodilla_izquierda',
    name: 'Rodilla izquierda',
    view: 'both',
    frontCenter: { x: 231, y: 478 },
    frontPath:
      'M 231 465 C 238.2 465 244 470.8 244 478 C 244 485.2 238.2 491 231 491 C 223.8 491 218 485.2 218 478 C 218 470.8 223.8 465 231 465 Z',
    backCenter: { x: 147, y: 478 },
    backPath:
      'M 147 466 C 153.6 466 159 471.4 159 478 C 159 484.6 153.6 490 147 490 C 140.4 490 135 484.6 135 478 C 135 471.4 140.4 466 147 466 Z',
  },
  {
    id: 'codo_derecho',
    name: 'Codo derecho',
    view: 'both',
    frontCenter: { x: 77, y: 268 },
    frontPath:
      'M 77 257 C 83.1 257 88 261.9 88 268 C 88 274.1 83.1 279 77 279 C 70.9 279 66 274.1 66 268 C 66 261.9 70.9 257 77 257 Z',
    backCenter: { x: 298, y: 268 },
    backPath:
      'M 298 257 C 304.1 257 309 261.9 309 268 C 309 274.1 304.1 279 298 279 C 291.9 279 287 274.1 287 268 C 287 261.9 291.9 257 298 257 Z',
  },
  {
    id: 'codo_izquierdo',
    name: 'Codo izquierdo',
    view: 'both',
    frontCenter: { x: 303, y: 268 },
    frontPath:
      'M 303 257 C 309.1 257 314 261.9 314 268 C 314 274.1 309.1 279 303 279 C 296.9 279 292 274.1 292 268 C 292 261.9 296.9 257 303 257 Z',
    backCenter: { x: 82, y: 268 },
    backPath:
      'M 82 257 C 88.1 257 93 261.9 93 268 C 93 274.1 88.1 279 82 279 C 75.9 279 71 274.1 71 268 C 71 261.9 75.9 257 82 257 Z',
  },
  {
    id: 'muneca_derecha',
    name: 'Muñeca derecha',
    view: 'both',
    frontCenter: { x: 46, y: 348 },
    frontPath:
      'M 46 340 C 50.4 340 54 343.6 54 348 C 54 352.4 50.4 356 46 356 C 41.6 356 38 352.4 38 348 C 38 343.6 41.6 340 46 340 Z',
    backCenter: { x: 328, y: 348 },
    backPath:
      'M 328 340 C 332.4 340 336 343.6 336 348 C 336 352.4 332.4 356 328 356 C 323.6 356 320 352.4 320 348 C 320 343.6 323.6 340 328 340 Z',
  },
  {
    id: 'muneca_izquierda',
    name: 'Muñeca izquierda',
    view: 'both',
    frontCenter: { x: 334, y: 348 },
    frontPath:
      'M 334 340 C 338.4 340 342 343.6 342 348 C 342 352.4 338.4 356 334 356 C 329.6 356 326 352.4 326 348 C 326 343.6 329.6 340 334 340 Z',
    backCenter: { x: 52, y: 348 },
    backPath:
      'M 52 340 C 56.4 340 60 343.6 60 348 C 60 352.4 56.4 356 52 356 C 47.6 356 44 352.4 44 348 C 44 343.6 47.6 340 52 340 Z',
  },
  {
    id: 'tobillo_derecho',
    name: 'Tobillo derecho',
    view: 'both',
    frontCenter: { x: 146, y: 625 },
    frontPath:
      'M 146 616 C 151.0 616 155 620.0 155 625 C 155 630.0 151.0 634 146 634 C 141.0 634 137 630.0 137 625 C 137 620.0 141.0 616 146 616 Z',
    backCenter: { x: 239, y: 625 },
    backPath:
      'M 239 616 C 244.0 616 248 620.0 248 625 C 248 630.0 244.0 634 239 634 C 234.0 634 230 630.0 230 625 C 230 620.0 234.0 616 239 616 Z',
  },
  {
    id: 'tobillo_izquierdo',
    name: 'Tobillo izquierdo',
    view: 'both',
    frontCenter: { x: 234, y: 625 },
    frontPath:
      'M 234 616 C 239.0 616 243 620.0 243 625 C 243 630.0 239.0 634 234 634 C 229.0 634 225 630.0 225 625 C 225 620.0 229.0 616 234 616 Z',
    backCenter: { x: 141, y: 625 },
    backPath:
      'M 141 616 C 146.0 616 150 620.0 150 625 C 150 630.0 146.0 634 141 634 C 136.0 634 132 630.0 132 625 C 132 620.0 136.0 616 141 616 Z',
  },
];

export const FRONT_OFFICIAL_MUSCLES = OFFICIAL_MUSCLE_GROUPS.filter(
  (m) => m.view === 'front' || m.view === 'both',
);

export const BACK_OFFICIAL_MUSCLES = OFFICIAL_MUSCLE_GROUPS.filter(
  (m) => m.view === 'back' || m.view === 'both',
);

export const FRONT_JOINTS = OFFICIAL_JOINTS.filter((j) => j.view === 'front' || j.view === 'both');

export const BACK_JOINTS = OFFICIAL_JOINTS.filter((j) => j.view === 'back' || j.view === 'both');
