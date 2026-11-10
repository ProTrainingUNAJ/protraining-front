# Acción de Reseteo de Contraseña por el PF y Flujo de Cambio Obligatorio (KAN-539)

> **Rama:** `feature/KAN-539-reset-athlete-password`  
> **Proyecto:** `protraining-front`  
> **Pull Request:** PR #108 (Merge a `develop`)  
> **Fecha:** 2026-11-10

---

## En una frase

Se implementó en la interfaz web de ProTraining la funcionalidad que permite al Preparador Físico (PF) resetear la contraseña de un atleta bajo su cargo desde la gestión de atletas con confirmación previa y copia segura de la clave temporal generada, junto con el flujo ineludible en la experiencia del atleta que le exige cambiar su contraseña obligatoriamente en el primer inicio de sesión antes de habilitarle el acceso a la plataforma.

---

## Para qué sirve y experiencia de usuario

Esta tarea resuelve la recuperación de cuentas para atletas que no recuerdan su contraseña mediante la asistencia presencial y directa de su Preparador Físico:

1. **Gestión ágil para el PF:**
   - En la vista de gestión o detalle del atleta, el PF dispone de la acción **"Resetear contraseña"**.
   - Al pulsar la acción, se despliega un diálogo modal de confirmación advirtiendo que la acción revocará de inmediato todas las sesiones activas del atleta y creará una contraseña temporal.
2. **Entrega segura de la contraseña temporal:**
   - Una vez confirmado el reseteo, el backend genera la contraseña temporal y el frontend la presenta en un modal con tipografía monoespaciada legible.
   - Cuenta con un botón **"Copiar contraseña"** que traslada la clave al portapapeles del sistema y brinda confirmación visual instantánea.
   - Advierte claramente al preparador físico que la clave temporal se muestra por única vez y no volverá a ser visible al cerrar el diálogo.
3. **Flujo de cambio obligatorio para el Atleta:**
   - Cuando el atleta inicia sesión ingresando su correo y la contraseña temporal suministrada por su PF, el token de autenticación y el perfil señalan `mustChangePassword: true`.
   - El enrutador y las guardas de autenticación interceptan el estado y redirigen automáticamente al atleta a la vista de cambio de contraseña obligatorio.
   - La navegación regular queda deshabilitada: el atleta no puede acceder a su rutina, al calendario, al perfil ni al check-in diario sin antes haber definido su nueva clave personal.
   - Una vez enviada y validada la nueva contraseña, el estado `mustChangePassword` se restablece a `false`, se renuevan las credenciales y el atleta es redirigido fluidamente a su panel principal.

---

## Criterios de Aceptación Verificados en Frontend

### CA-01: Disparador y confirmación de reseteo (Vista PF)

- El botón de reseteo de contraseña solo se renderiza en las opciones de atletas asignados al PF autenticado.
- Al hacer clic, no se envía la petición de inmediato; se solicita confirmación explícita mediante un modal accesible.
- En caso de error de red o rechazo de permisos, se despliega una notificación de error descriptiva sin alterar la interfaz.

### CA-02: Presentación y copiado de la contraseña temporal

- Al recibir la respuesta exitosa del backend (`HTTP 200 OK`), se visualiza la clave temporal generada.
- El botón de copiado utiliza la API del portapapeles (`navigator.clipboard.writeText`) con manejo de fallos y notificación de éxito.
- El modal permite cerrarse únicamente cuando el PF confirma haber copiado o entregado la clave.

### CA-03: Intercepción y cambio obligatorio (Vista Atleta)

- Las rutas protegidas del atleta verifican si la sesión requiere cambio de clave (`user.mustChangePassword === true` o claim JWT homónimo).
- Ante este estado, cualquier intento de navegación hacia rutas de rutina, calendario o progreso es redirigido a `/force-change-password`.
- El formulario solicita la contraseña actual (temporal) y la nueva contraseña con su confirmación, aplicando la **política unificada de contraseñas**:
  - Requisito visible y validado: `"Mínimo 8 caracteres y al menos un número"`.
  - Mensajes de error claros y consistentes en español.
- Tras el cambio exitoso, el atleta accede a su panel sin requerir un nuevo inicio de sesión manual.

---

## Componentes y Archivos Clave

- **Acción y modal de reseteo:**
  - `ResetAthletePasswordModal.tsx`: Diálogo de confirmación del PF y visualizador de la contraseña temporal generada con copiado al portapapeles.
- **Guardas de navegación y enrutamiento:**
  - `ForceChangePasswordPage.tsx`: Vista forzada para el cambio obligatorio con checklist visual de la política unificada.
- **Formulario de configuración:**
  - `ChangePasswordSection.tsx`: Componente de cambio voluntario de contraseña alineado a la política unificada.
- **Servicio API:**
  - `authService.ts`: Funciones de consumo HTTP que invocan `POST /api/v1/auth/athletes/{athleteId}/reset-password` y `POST /api/v1/auth/change-password`.

---

## Resultados de Pruebas Automatizadas

- **Suite de pruebas de Frontend (Vitest):**
  - **Archivos de prueba:** 72 superados de 72 (100%).
  - **Tests individuales:** 407 superados de 407 (100%).
  - **Pruebas de cambio voluntario (`ChangePasswordSection.test.tsx`):** 12/12 tests aprobados.
  - **Pruebas de cambio forzado (`ForceChangePasswordPage.test.tsx`):** 8/8 tests aprobados.

---

## Cómo Probarlo Localmente

```powershell
# 1. Ejecutar las pruebas automatizadas del frontend:
npm test --prefix protraining-front -- --run

# 2. Levantar el servidor de desarrollo del frontend:
npm run dev --prefix protraining-front
```
