# Contexto del Proyecto: Sistema de Gestión de Flota Uber

## Descripción General

Aplicación web para que un propietario de vehículos de alquiler (para conductores de Uber) administre su flota: vehículos, conductores, mantenimientos, y pagos semanales de alquiler.

Es un sistema de **un solo usuario administrador** (el propietario). Los conductores NO tienen acceso a la aplicación; solo son registros administrados por el dueño. No se requiere manejo de roles ni permisos múltiples en esta versión.

**Escala esperada:** 3 vehículos iniciales, con crecimiento planeado hasta 8. Cada vehículo se asigna a un único conductor a la vez (relación 1 a 1, con historial si el conductor cambia).

---

## Stack Tecnológico

- **Frontend:** Next.js (App Router), en español.
- **Backend:** NestJS (API REST).
- **Base de datos:** MongoDB Atlas (ya existe una cuenta creada; se debe usar Mongoose como ODM).
- **Almacenamiento de imágenes:** Un servicio externo (Cloudinary recomendado por su rapidez de integración; alternativa: AWS S3 o Firebase Storage). MongoDB solo almacena la URL de cada imagen, nunca el binario.
- **Autenticación:** JWT emitido por NestJS. Contraseña del administrador cifrada con bcrypt. Un solo usuario administrador (no hay registro público de usuarios).

---

## Módulos y Funcionalidades

### 1. Autenticación
- Login con usuario y contraseña (un solo usuario administrador, precreado o sembrado por seed script).
- Protección de todas las rutas de la API mediante JWT (guards de NestJS).
- Recuperación de contraseña por correo (puede quedar para una segunda iteración si se prioriza velocidad).

### 2. Vehículos (`vehicles`)
Campos por vehículo:
- Foto(s) del vehículo (URLs).
- Marca, modelo, año, color, placa.
- Kilometraje actual + historial de actualizaciones de kilometraje (subdocumento o colección aparte con fecha y valor).
- Documentos legales (foto de tarjeta de circulación, etc.).
- Estado: `activo`, `en_mantenimiento`, `inactivo`, `vendido`.
- Fecha de compra y valor de compra (opcional).
- Referencia al conductor actualmente asignado (`currentDriverId`, puede ser null si no tiene conductor asignado).

CRUD completo + endpoint para actualizar kilometraje (que también guarda el registro histórico).

### 3. Mantenimientos y Reparaciones (`maintenances`)
Un documento por evento, referenciando `vehicleId`:
- Fecha del evento.
- Tipo: mantenimiento preventivo, reparación, cambio de llantas, otro.
- Descripción del trabajo realizado.
- Costo, taller/proveedor.
- Kilometraje del vehículo al momento del servicio.
- Fotos (facturas o evidencia del trabajo).

Endpoint para listar el historial de mantenimientos por vehículo, ordenado por fecha descendente.

### 4. Conductores (`drivers`)
Campos por conductor:
- Nombre completo, número de identificación/cédula, teléfono, correo, dirección.
- Foto del conductor.
- Fotos del contrato de arrendamiento (puede ser un arreglo de URLs de imágenes o un PDF).
- Fecha de inicio del contrato, monto semanal acordado (en colones, CRC), depósito de garantía (si aplica, en colones).
- Día de inicio de semana de pago (`weekStartDay`): configurable por conductor, no es un valor fijo global. Ej. si el contrato empieza un miércoles, sus "semanas de pago" corren de miércoles a martes.
- Estado: `activo`, `inactivo`, `suspendido`.
- Historial de vehículos asignados a lo largo del tiempo (colección de asignaciones, ver siguiente sección).

### 5. Asignaciones Conductor–Vehículo (`assignments`)
Para mantener el historial cuando un conductor cambia de vehículo o un vehículo cambia de conductor:
- `vehicleId`, `driverId`, `startDate`, `endDate` (null si es la asignación activa).
- Al crear una nueva asignación para un vehículo, se debe cerrar (poner `endDate`) la asignación activa anterior de ese vehículo, y actualizar `currentDriverId` en el documento del vehículo.

### 6. Pagos (`payments`)
Un documento por pago semanal registrado:
- `driverId`, `vehicleId`, fecha del pago, semana correspondiente (rango de fechas, calculado a partir del `weekStartDay` del conductor).
- Monto acordado de la semana (`weeklyAmount` del conductor) + saldo pendiente de la semana anterior (`previousBalance`) = monto total adeudado de esa semana (`amountDue`).
- Monto pagado (`amountPaid`), método de pago (efectivo, transferencia).
- Saldo pendiente resultante (`remainingBalance = amountDue - amountPaid`), que se convierte en el `previousBalance` del siguiente pago de ese conductor.
- Todos los montos se registran en **colones (CRC)**.
- Estado derivado: pagado completo (`remainingBalance == 0`), pago parcial (`remainingBalance > 0` pero `amountPaid > 0`), no pagado (`amountPaid == 0`).
- Todo el registro es manual (no hay integración con pasarelas de pago).

**Regla de negocio clave:** el saldo pendiente de una semana SIEMPRE se acumula a la semana siguiente (no se maneja como deuda separada ni se descarta). El cálculo de `amountDue` de cada nuevo pago debe sumar automáticamente el `remainingBalance` del pago anterior de ese mismo conductor.

Endpoint para listar pagos por conductor y para ver saldo/estado de la semana actual de cada conductor activo (incluyendo el saldo arrastrado).

### 7. Dashboard / Reportes
- Totales: vehículos activos, conductores activos, ingresos de la semana y del mes.
- Lista de vehículos con mantenimiento próximo o vencido (si se implementan reglas de alerta por kilometraje).
- Lista de conductores con pagos atrasados en la semana actual.
- Rentabilidad por vehículo: suma de pagos recibidos vs. suma de costos de mantenimiento, en un rango de fechas.

### 8. Notificaciones (puede quedar para una fase posterior)
- Alerta de mantenimiento próximo por kilometraje o fecha.
- Alerta de pago no registrado en la semana en curso.
- Alerta de vencimiento de documentos (seguro, revisión técnica, contrato).

---

## Modelo de Datos (Colecciones MongoDB / Mongoose Schemas)

```
users
  - username: string
  - passwordHash: string

vehicles
  - brand, model, year, color, plate: string
  - photos: string[] (URLs)
  - currentMileage: number
  - mileageHistory: [{ date: Date, mileage: number }]
  - documents: string[] (URLs)
  - status: enum ['activo','en_mantenimiento','inactivo','vendido']
  - currentDriverId: ObjectId | null (ref: drivers)
  - purchaseDate: Date (opcional)
  - purchaseValue: number (opcional)

drivers
  - fullName, idNumber, phone, email, address: string
  - photo: string (URL)
  - contractPhotos: string[] (URLs)
  - contractStartDate: Date
  - weeklyAmount: number (CRC)
  - weekStartDay: number (0-6, día de la semana en que inicia su ciclo de pago; 0 = domingo)
  - deposit: number (opcional, CRC)
  - status: enum ['activo','inactivo','suspendido']

maintenances
  - vehicleId: ObjectId (ref: vehicles)
  - date: Date
  - type: enum ['preventivo','reparacion','llantas','otro']
  - description: string
  - cost: number
  - provider: string
  - mileageAtService: number
  - photos: string[] (URLs)

assignments
  - vehicleId: ObjectId (ref: vehicles)
  - driverId: ObjectId (ref: drivers)
  - startDate: Date
  - endDate: Date | null

payments
  - driverId: ObjectId (ref: drivers)
  - vehicleId: ObjectId (ref: vehicles)
  - paymentDate: Date
  - weekStart: Date
  - weekEnd: Date
  - previousBalance: number (CRC, saldo pendiente de la semana anterior de este conductor)
  - amountDue: number (CRC, = weeklyAmount del conductor + previousBalance)
  - amountPaid: number (CRC)
  - remainingBalance: number (CRC, = amountDue - amountPaid; se traslada como previousBalance del siguiente pago)
  - method: enum ['efectivo','transferencia']
```

---

## Fases de Desarrollo Sugeridas

1. **Fase 1:** Autenticación (login único) + CRUD de vehículos (incluyendo fotos y kilometraje).
2. **Fase 2:** CRUD de conductores (incluyendo fotos y contrato) + módulo de asignaciones vehículo-conductor.
3. **Fase 3:** Módulo de mantenimientos y reparaciones.
4. **Fase 4:** Módulo de pagos semanales + historial y estado de saldo.
5. **Fase 5:** Dashboard con reportes y alertas.
6. **Fase 6:** Pruebas, ajustes y despliegue.

---

## Reglas de Negocio: Pagos

- **Moneda:** todos los montos (pagos, costos de mantenimiento, montos semanales, depósitos) se manejan en **colones costarricenses (CRC)**. No hay soporte multi-moneda.
- **Día de inicio de semana:** no es un valor fijo para toda la aplicación. Cada conductor tiene su propio `weekStartDay`, definido al momento de registrar su contrato (normalmente el día de la semana en que empezó a rentar el vehículo).
- **Saldo acumulado:** si un conductor paga menos del monto acordado en una semana, el saldo pendiente (`remainingBalance`) se suma automáticamente al monto adeudado (`amountDue`) de su siguiente semana de pago. Este saldo se sigue arrastrando semana a semana hasta que se salde por completo. Nunca se descarta ni se maneja como una deuda separada del ciclo de pagos.
- Al crear un nuevo pago para un conductor, el backend debe calcular `amountDue` buscando el `remainingBalance` del pago anterior de ese mismo conductor (si existe) y sumándolo al `weeklyAmount` actual del conductor.

## Consideraciones Generales

- Toda la interfaz y los mensajes de la aplicación deben estar en **español**.
- No implementar roles ni permisos múltiples por ahora: un solo usuario administrador.
- No implementar acceso de conductores a la aplicación.
- No integrar pasarelas de pago; los pagos se registran manualmente.
- Las imágenes (vehículos, conductores, contratos, facturas de mantenimiento) se suben a un servicio externo de almacenamiento, no directamente a MongoDB.
- Priorizar simplicidad: es un sistema de uso personal para un propietario pequeño de flota (3 a 8 vehículos), no un producto multi-tenant.
