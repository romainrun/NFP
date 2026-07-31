import {
  applyDiscountBps,
  lineGrossCents,
  lineNetCents,
  vatFromTtc,
} from '@/shared/utils/pricing';

describe('pricing', () => {
  it('computes line totals with quantity', () => {
    expect(lineGrossCents(199, 3)).toBe(597);
  });

  it('applies discount basis points', () => {
    expect(applyDiscountBps(1000, 1000)).toBe(900); // 10%
    expect(lineNetCents(200, 2, 500)).toBe(380); // 5% off 400
  });

  it('extracts VAT from TTC', () => {
    expect(vatFromTtc(1200, 20)).toBe(200);
    expect(vatFromTtc(1055, 5.5)).toBe(55);
  });
});
