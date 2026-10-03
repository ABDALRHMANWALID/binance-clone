import { JwtGuardGuard } from './jwt-guard.guard.js';

describe('JwtGuardGuard', () => {
  it('should be defined', () => {
    expect(new JwtGuardGuard()).toBeDefined();
  });
});
