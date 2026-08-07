import 'dotenv/config';
import mongoose from 'mongoose';
import { Driver, DriverSchema } from '../src/drivers/schemas/driver.schema';
import { Payment, PaymentSchema } from '../src/payments/schemas/payment.schema';
import { getBillingWeekRange } from '../src/payments/week-range.util';

/**
 * Corrige pagos cuyo weekStart/weekEnd quedó mal calculado por un bug ya
 * corregido en el código: antes, un pago hecho exactamente el día de
 * vencimiento del conductor (weekStartDay) se registraba bajo la semana
 * que EMPIEZA ese día en vez de la que se está saldando (la que terminó el
 * día anterior). El resultado: cada pago puntual quedó fechado una semana
 * "adelantado", y por eso el estado del conductor podía mostrarse "al día"
 * el mismo día que le tocaba pagar de nuevo.
 *
 * Este script reconstruye, por conductor afectado, todo su historial de
 * pagos en orden cronológico (por paymentDate) recalculando weekStart,
 * weekEnd y la cadena de saldos (previousBalance/amountDue/remainingBalance)
 * con la misma fórmula que usa PaymentsService, preservando la "porción
 * semanal" original de cada pago (amountDue - previousBalance) para no
 * perder tarifas históricas si weeklyAmount cambió desde entonces.
 *
 * Por defecto corre en modo DRY-RUN (solo reporta qué cambiaría). Pasar
 * --apply para escribir los cambios.
 *
 *   npm run fix:payment-weeks            # dry-run
 *   npm run fix:payment-weeks -- --apply # aplica los cambios
 */

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }

  const apply = process.argv.includes('--apply');

  await mongoose.connect(MONGODB_URI);
  const DriverModel = mongoose.model(Driver.name, DriverSchema);
  const PaymentModel = mongoose.model(Payment.name, PaymentSchema);

  const drivers = await DriverModel.find({}).exec();
  console.log(`Revisando ${drivers.length} conductor(es)...\n`);

  let affectedDrivers = 0;
  let affectedPayments = 0;

  for (const driver of drivers) {
    const payments = await PaymentModel.find({ driverId: driver._id })
      .sort({ paymentDate: 1 })
      .exec();

    if (payments.length === 0) continue;

    const corrected = payments.map((payment) => {
      const { weekStart, weekEnd } = getBillingWeekRange(
        payment.paymentDate,
        driver.weekStartDay,
      );
      const weeklyPortion = payment.amountDue - payment.previousBalance;
      return { original: payment, weekStart, weekEnd, weeklyPortion };
    });

    const needsFix = corrected.some(
      (c) => c.weekStart.getTime() !== c.original.weekStart.getTime(),
    );
    if (!needsFix) continue;

    affectedDrivers += 1;
    console.log(`Conductor: ${driver.fullName} (${driver._id.toString()})`);

    // Recalcula la cadena de saldos en orden cronológico real (paymentDate),
    // preservando previousBalance inicial del primer pago (normalmente 0).
    let previousBalance = corrected[0].original.previousBalance;
    const rebuilt = corrected.map((c) => {
      const amountDue = c.weeklyPortion + previousBalance;
      const remainingBalance = Math.max(0, amountDue - c.original.amountPaid);
      const row = {
        ownerId: c.original.ownerId,
        driverId: c.original.driverId,
        vehicleId: c.original.vehicleId,
        paymentDate: c.original.paymentDate,
        weekStart: c.weekStart,
        weekEnd: c.weekEnd,
        previousBalance,
        amountDue,
        amountPaid: c.original.amountPaid,
        remainingBalance,
        method: c.original.method,
      };
      previousBalance = remainingBalance;
      return row;
    });

    for (let i = 0; i < corrected.length; i++) {
      const c = corrected[i];
      const changed = c.weekStart.getTime() !== c.original.weekStart.getTime();
      const marker = changed ? '  [CORREGIDO]' : '';
      console.log(
        `  ${c.original.paymentDate.toISOString().slice(0, 10)}: ` +
          `weekStart ${c.original.weekStart.toISOString().slice(0, 10)} -> ` +
          `${c.weekStart.toISOString().slice(0, 10)}${marker}`,
      );
      if (changed) affectedPayments += 1;
    }
    console.log();

    if (apply) {
      const ids = payments.map((p) => p._id);
      await PaymentModel.deleteMany({ _id: { $in: ids } });
      await PaymentModel.insertMany(rebuilt);
      console.log(`  -> Reescrito historial de pagos de ${driver.fullName}.\n`);
    }
  }

  console.log(
    `\nResumen: ${affectedDrivers} conductor(es) afectado(s), ` +
      `${affectedPayments} pago(s) con weekStart incorrecto.`,
  );
  console.log(
    apply
      ? 'Cambios aplicados.'
      : 'Modo dry-run: no se escribió nada. Corre con --apply para aplicar.',
  );

  await mongoose.disconnect();
}

main().catch((error: Error) => {
  console.error('Error corrigiendo pagos:', error.message);
  process.exit(1);
});
