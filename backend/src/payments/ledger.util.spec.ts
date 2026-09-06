import { buildLedger, LedgerDriver, LedgerPayment } from './ledger.util';

// La renta se paga POR ADELANTADO: la semana 4→10 se cobra el día 4.
//
// Martes como día de pago (weekStartDay 2). Fechas verificadas contra datos
// reales: 2026-08-04, 08-11, 08-18, 08-25 y 09-01 son martes; 09-06 es domingo.
//
//   W1 04→10 ago (cobra 4 ago)   W2 11→17 ago (cobra 11 ago)
//   W3 18→24 ago (cobra 18 ago)  W4 25→31 ago (cobra 25 ago)
//   W5 01→07 sep (cobra 1 sep)  <- en curso el domingo 6
//   W6 08→14 sep (cobra 8 sep)  <- próximo vencimiento
const SEMANAL = 90_000;
const HOY = new Date('2026-09-06T00:00:00.000Z');

const driver: LedgerDriver = {
  contractStartDate: new Date('2026-08-04T00:00:00.000Z'),
  weekStartDay: 2,
  weeklyAmount: SEMANAL,
  depositCoversFirstWeek: false,
};

function pago(
  weekStart: string,
  amountPaid = SEMANAL,
  settled = false,
): LedgerPayment {
  return {
    id: weekStart,
    weekStart: new Date(`${weekStart}T00:00:00.000Z`),
    amountPaid,
    settled,
  };
}

const W = [
  '2026-08-04',
  '2026-08-11',
  '2026-08-18',
  '2026-08-25',
  '2026-09-01',
  '2026-09-08',
];
const todasVencidas = W.slice(0, 5).map((w) => pago(w));

describe('buildLedger', () => {
  it('enumera hasta la semana siguiente, que es el próximo vencimiento', () => {
    const { weeks, currentWeek, nextWeek } = buildLedger(driver, [], HOY);
    expect(weeks.map((w) => w.weekStart.toISOString().slice(0, 10))).toEqual(W);
    expect(currentWeek?.weekStart.toISOString().slice(0, 10)).toBe(
      '2026-09-01',
    );
    expect(nextWeek?.weekStart.toISOString().slice(0, 10)).toBe('2026-09-08');
    expect(nextWeek?.status).toBe('por_venir');
    expect(nextWeek?.isChargeable).toBe(false);
  });

  it('cobra la semana en curso, porque se paga al empezarla', () => {
    const l = buildLedger(driver, [], HOY);
    // W5 empezó el 1 de septiembre: ya se debía ese día.
    expect(l.currentWeek?.isChargeable).toBe(true);
    expect(l.currentWeek?.isOverdue).toBe(true);
  });

  it('no marca deuda cuando pagó todas las semanas ya iniciadas', () => {
    const l = buildLedger(driver, todasVencidas, HOY);
    expect(l.currentBalance).toBe(0);
    expect(l.overdueAmount).toBe(0);
    expect(l.currentDueAmount).toBe(0);
    expect(l.weeksBehind).toBe(0);
    expect(l.oldestOverdueWeek).toBeNull();
  });

  // El fallo principal reportado: una semana sin registro de pago no dejaba
  // rastro y el conductor volvía a "al día" al día siguiente.
  it('cobra una semana saltada aunque no exista registro de pago', () => {
    const l = buildLedger(
      driver,
      [pago(W[0]), pago(W[2]), pago(W[3]), pago(W[4])],
      HOY,
    );
    expect(l.overdueAmount).toBe(SEMANAL);
    expect(l.weeksBehind).toBe(1);
    expect(l.oldestOverdueWeek?.weekStart.toISOString().slice(0, 10)).toBe(
      W[1],
    );
    expect(l.weeks[1].status).toBe('sin_pagar');
  });

  it('acumula varias semanas sin pagar', () => {
    const l = buildLedger(driver, [pago(W[0])], HOY);
    expect(l.overdueAmount).toBe(SEMANAL * 4);
    expect(l.weeksBehind).toBe(4);
  });

  it('marca atraso a un conductor que nunca pagó', () => {
    const l = buildLedger(driver, [], HOY);
    expect(l.overdueAmount).toBe(SEMANAL * 5);
    expect(l.weeksBehind).toBe(5);
  });

  it('el día que empieza la semana la cobra, pero todavía no la atrasa', () => {
    const alEmpezar = buildLedger(
      driver,
      todasVencidas,
      new Date('2026-09-08T00:00:00.000Z'),
    );
    expect(alEmpezar.currentDueAmount).toBe(SEMANAL);
    expect(alEmpezar.overdueAmount).toBe(0);
    expect(alEmpezar.weeks[5].isChargeable).toBe(true);
    expect(alEmpezar.weeks[5].isOverdue).toBe(false);
  });

  it('pasa a atraso al día siguiente de empezar la semana sin pagarla', () => {
    const l = buildLedger(
      driver,
      todasVencidas,
      new Date('2026-09-09T00:00:00.000Z'),
    );
    expect(l.overdueAmount).toBe(SEMANAL);
    expect(l.weeksBehind).toBe(1);
  });

  it('la víspera del cobro todavía no debe nada', () => {
    const l = buildLedger(
      driver,
      todasVencidas,
      new Date('2026-09-07T00:00:00.000Z'),
    );
    expect(l.currentDueAmount).toBe(0);
    expect(l.overdueAmount).toBe(0);
    expect(l.nextWeek?.weekStart.toISOString().slice(0, 10)).toBe('2026-09-08');
  });

  it('arrastra el sobrepago como crédito a las semanas siguientes', () => {
    const l = buildLedger(driver, [pago(W[0], SEMANAL * 3)], HOY);
    expect(l.weeks[0].remainingBalance).toBe(-SEMANAL * 2);
    expect(l.weeks[2].remainingBalance).toBe(0);
    expect(l.weeks[1].status).toBe('pagada');
    expect(l.weeks[2].status).toBe('pagada');
    // Quedan W4 y W5 sin cubrir.
    expect(l.overdueAmount).toBe(SEMANAL * 2);
  });

  it('deja crédito a favor cuando paga la semana siguiente por adelantado', () => {
    const l = buildLedger(driver, [...todasVencidas, pago(W[5])], HOY);
    expect(l.currentBalance).toBe(-SEMANAL);
    expect(l.overdueAmount).toBe(0);
    expect(l.weeksBehind).toBe(0);
  });

  it('registra un pago parcial y arrastra el resto', () => {
    const pagos = [
      pago(W[0]),
      pago(W[1], 40_000),
      pago(W[2]),
      pago(W[3]),
      pago(W[4]),
    ];
    const l = buildLedger(driver, pagos, HOY);
    expect(l.weeks[1].status).toBe('parcial');
    expect(l.overdueAmount).toBe(SEMANAL - 40_000);
    expect(l.weeksBehind).toBe(1);
  });

  it('no cobra la primera semana si el depósito la cubre', () => {
    const conDeposito = { ...driver, depositCoversFirstWeek: true };
    const l = buildLedger(conDeposito, [], HOY);
    expect(l.weeks[0].status).toBe('gracia');
    expect(l.weeks[0].weeklyAmount).toBe(0);
    expect(l.overdueAmount).toBe(SEMANAL * 4);
  });

  it('respeta la tarifa histórica de cada pago si la tarifa cambió', () => {
    const pagos: LedgerPayment[] = [
      { ...pago(W[0], 100_000), weeklyAmount: 100_000 },
      { ...pago(W[1], 100_000), weeklyAmount: 100_000 },
      pago(W[2]),
      pago(W[3]),
      pago(W[4]),
    ];
    const l = buildLedger(driver, pagos, HOY);
    expect(l.weeks[0].weeklyAmount).toBe(100_000);
    expect(l.weeks[2].weeklyAmount).toBe(SEMANAL);
    expect(l.currentBalance).toBe(0);
  });

  // Semana negociada: se cobró menos de lo debido pero se dio por saldada,
  // así que el faltante no persigue al conductor las semanas siguientes.
  it('no arrastra el faltante de una semana dada por saldada', () => {
    const pagos = [
      pago(W[0]),
      pago(W[1], 40_000, true),
      pago(W[2]),
      pago(W[3]),
      pago(W[4]),
    ];
    const l = buildLedger(driver, pagos, HOY);
    expect(l.weeks[1].status).toBe('saldada');
    expect(l.weeks[1].forgivenAmount).toBe(SEMANAL - 40_000);
    expect(l.weeks[1].remainingBalance).toBe(0);
    // La semana siguiente arranca limpia, y el conductor queda al día.
    expect(l.weeks[2].previousBalance).toBe(0);
    expect(l.overdueAmount).toBe(0);
    expect(l.weeksBehind).toBe(0);
    expect(l.currentBalance).toBe(0);
  });

  it('deja al día a quien no pagó nada esa semana pero se le condonó', () => {
    const pagos = [
      pago(W[0]),
      pago(W[1], 0, true),
      pago(W[2]),
      pago(W[3]),
      pago(W[4]),
    ];
    const l = buildLedger(driver, pagos, HOY);
    expect(l.weeks[1].forgivenAmount).toBe(SEMANAL);
    expect(l.overdueAmount).toBe(0);
  });

  it('condonar una semana no borra la deuda que ya venía arrastrada', () => {
    // W2 sin pagar; en W3 se negocia y se da por saldada solo esa semana.
    const pagos = [pago(W[0]), pago(W[2], 0, true), pago(W[3]), pago(W[4])];
    const l = buildLedger(driver, pagos, HOY);
    // W2 quedó sin cubrir y su saldo entró a W3, que se saldó entero.
    expect(l.weeks[1].status).toBe('sin_pagar');
    expect(l.weeks[2].forgivenAmount).toBe(SEMANAL * 2);
    expect(l.overdueAmount).toBe(0);
  });

  it('conserva el crédito si en una semana saldada se pagó de más', () => {
    const pagos = [
      pago(W[0]),
      pago(W[1], SEMANAL * 2, true),
      pago(W[2]),
      pago(W[3]),
      pago(W[4]),
    ];
    const l = buildLedger(driver, pagos, HOY);
    expect(l.weeks[1].forgivenAmount).toBe(0);
    expect(l.weeks[1].remainingBalance).toBe(-SEMANAL);
    expect(l.currentBalance).toBe(-SEMANAL);
  });

  // El contrato de Andres: firmó un jueves con día de pago viernes. La regla
  // anterior ("la semana que contiene contractStartDate") le facturaba desde
  // el viernes ANTERIOR, una semana que no tuvo el carro.
  it('empieza a cobrar en la primera semana que arranca tras el contrato', () => {
    const andres: LedgerDriver = {
      contractStartDate: new Date('2026-07-23T00:00:00.000Z'), // jueves
      weekStartDay: 5, // viernes
      weeklyAmount: SEMANAL,
      depositCoversFirstWeek: false,
    };
    const l = buildLedger(andres, [], HOY);
    expect(l.weeks[0].weekStart.toISOString().slice(0, 10)).toBe('2026-07-24');
  });

  it('mantiene la primera semana si el contrato empieza justo ese día', () => {
    const maikol: LedgerDriver = {
      contractStartDate: new Date('2026-07-28T00:00:00.000Z'), // martes
      weekStartDay: 2,
      weeklyAmount: SEMANAL,
      depositCoversFirstWeek: false,
    };
    const l = buildLedger(maikol, [], HOY);
    expect(l.weeks[0].weekStart.toISOString().slice(0, 10)).toBe('2026-07-28');
  });
});
