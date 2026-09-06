import 'dotenv/config';
import mongoose from 'mongoose';
import { Driver, DriverSchema } from '../src/drivers/schemas/driver.schema';
import {
  buildLedger,
  getFirstBillingWeek,
  LedgerPayment,
} from '../src/payments/ledger.util';
import { Payment, PaymentSchema } from '../src/payments/schemas/payment.schema';
import { getTodayUTC, getWeekRange } from '../src/payments/week-range.util';

/**
 * Reconstruye el historial de pagos con el modelo correcto: renta pagada POR
 * ADELANTADO (la semana 1-7 se cobra el día 1) y deuda calculada sobre el
 * calendario de semanas, no sobre la cadena de registros.
 *
 * Qué corrige:
 *
 * 1. La semana imputada a cada pago. Convivían dos reglas: la original
 *    (semana que contiene la fecha de pago) y la que introdujo el arreglo de
 *    agosto de 2026 (semana que acababa de terminar), aplicada además solo a
 *    parte de los datos. Por eso el mismo pago del 31 de julio quedó en
 *    semanas distintas en cada cuenta.
 * 2. Los pagos hechos con atraso, que quedaban imputados a la semana
 *    siguiente y dejaban sin cobrar la que realmente se debía.
 * 3. La primera semana del contrato, que antes era la que contenía
 *    contractStartDate aunque hubiera arrancado antes de que el conductor
 *    tuviera el carro.
 * 4. weeklyAmount, que no existía y se reconstruye desde amountDue -
 *    previousBalance para no perder tarifas históricas.
 *
 * Regla de reimputación: los pagos se recorren en orden cronológico y cada
 * uno se aplica a la semana más antigua que ya empezó y sigue sin registro.
 * Es como funciona el cobro real -el dinero salda primero lo más viejo- y
 * arregla de una vez el arrastre de quien paga tarde. Si ninguna semana
 * empezó todavía (pago por adelantado), se aplica a la más próxima.
 *
 * Por defecto solo reporta. Pasar --apply para escribir.
 *
 *   npm run reconcile:payments            # informe, no escribe nada
 *   npm run reconcile:payments -- --apply # aplica los cambios
 */

const crc = (n: number) => `₡${n.toLocaleString('es-CR')}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }

  const apply = process.argv.includes('--apply');
  await mongoose.connect(MONGODB_URI);
  console.log(
    `Base: ${mongoose.connection.name} · modo: ${apply ? 'APLICAR' : 'solo informe'}\n`,
  );

  const DriverModel = mongoose.model(Driver.name, DriverSchema);
  const PaymentModel = mongoose.model(Payment.name, PaymentSchema);

  const today = getTodayUTC();
  const drivers = await DriverModel.find({}).sort({ fullName: 1 }).exec();

  let reasignados = 0;
  let tocados = 0;

  for (const driver of drivers) {
    const payments = await PaymentModel.find({ driverId: driver._id })
      .sort({ paymentDate: 1 })
      .exec();
    if (payments.length === 0) continue;

    console.log(`\n### ${driver.fullName} (cuenta ${String(driver.ownerId)})`);
    console.log(
      `    cobra los ${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][driver.weekStartDay]}` +
        ` · ${crc(driver.weeklyAmount)}/sem · contrato ${iso(driver.contractStartDate)}`,
    );

    // Semanas candidatas: desde la primera del contrato hasta la siguiente a
    // la actual, que es hasta donde llega el ledger.
    const firstWeek = getFirstBillingWeek(driver);
    const lastStart = new Date(
      getWeekRange(today, driver.weekStartDay).weekStart.getTime() +
        7 * 86_400_000,
    );
    const semanas: Date[] = [];
    for (
      let c = firstWeek.weekStart;
      c.getTime() <= lastStart.getTime();
      c = new Date(c.getTime() + 7 * 86_400_000)
    ) {
      semanas.push(c);
    }

    const tomadas = new Set<number>();
    for (const payment of payments) {
      const fecha = new Date(payment.paymentDate);
      fecha.setUTCHours(0, 0, 0, 0);

      const yaEmpezadas = semanas.filter(
        (w) => !tomadas.has(w.getTime()) && w.getTime() <= fecha.getTime(),
      );
      const destino =
        yaEmpezadas[0] ??
        semanas.find((w) => !tomadas.has(w.getTime())) ??
        payment.weekStart;

      tomadas.add(destino.getTime());
      const anterior = iso(payment.weekStart);
      const nuevo = iso(destino);

      if (anterior !== nuevo) {
        reasignados += 1;
        console.log(
          `    pago del ${iso(fecha)} (${crc(payment.amountPaid)}): semana ${anterior} -> ${nuevo}`,
        );
      }

      const { weekStart, weekEnd } = getWeekRange(destino, driver.weekStartDay);
      payment.weekStart = weekStart;
      payment.weekEnd = weekEnd;
      if (payment.weeklyAmount === undefined) {
        // La "porción semanal" del modelo viejo preserva la tarifa histórica.
        payment.weeklyAmount = Math.max(
          0,
          payment.amountDue - payment.previousBalance,
        );
      }
    }

    // Con las semanas ya asignadas, el ledger reescribe los derivados.
    const ledgerPayments: LedgerPayment[] = payments.map((p) => ({
      id: p._id.toString(),
      weekStart: p.weekStart,
      amountPaid: p.amountPaid,
      settled: p.settled,
      weeklyAmount: p.weeklyAmount,
    }));
    const ledger = buildLedger(driver, ledgerPayments, today);
    const porSemana = new Map(
      ledger.weeks.map((w) => [w.weekStart.getTime(), w]),
    );

    for (const payment of payments) {
      const semana = porSemana.get(payment.weekStart.getTime());
      if (!semana) continue;
      payment.previousBalance = semana.previousBalance;
      payment.amountDue = semana.isChargeable
        ? semana.amountDue
        : semana.previousBalance + semana.weeklyAmount;
      payment.forgivenAmount = semana.forgivenAmount;
      payment.remainingBalance = semana.remainingBalance;
      if (payment.isModified()) tocados += 1;
      if (apply) await payment.save();
    }

    console.log(
      `    => deuda vencida ${crc(ledger.overdueAmount)} (${ledger.weeksBehind} sem)` +
        ` · saldo neto ${crc(ledger.currentBalance)}` +
        (ledger.oldestOverdueWeek
          ? ` · desde ${iso(ledger.oldestOverdueWeek.weekStart)}`
          : ''),
    );
    const sinPagar = ledger.weeks.filter((w) => w.status === 'sin_pagar');
    if (sinPagar.length > 0) {
      console.log(
        `    => semanas sin pago: ${sinPagar.map((w) => iso(w.weekStart)).join(', ')}`,
      );
    }
  }

  console.log(
    `\n${'='.repeat(60)}\n${reasignados} pago(s) cambian de semana · ${tocados} registro(s) se reescriben`,
  );
  if (!apply) {
    console.log('Nada se escribió. Volvé a correrlo con --apply para aplicar.');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
