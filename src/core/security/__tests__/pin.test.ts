import { isValidPinFormat } from '@/core/security/pin';

describe('isValidPinFormat', () => {
  it('accepts 4-digit PINs', () => {
    expect(isValidPinFormat('1234')).toBe(true);
  });

  it('rejects non-numeric or wrong length', () => {
    expect(isValidPinFormat('12')).toBe(false);
    expect(isValidPinFormat('12345')).toBe(false);
    expect(isValidPinFormat('12a4')).toBe(false);
  });
});
