import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewProvider } from './PreviewProvider';
import { usePreview } from '../hooks/usePreview';
import * as firebaseStatus from '../services/firebaseStatus';

/**
 * The gating here is the security-relevant part of preview mode: a control
 * that unlocks paid modules from the browser must not exist once entitlements
 * are enforced against real customers. Asserting it rather than remembering it.
 */
function Probe() {
  const { available, effectiveEntitlements, persona, personas, setSelection } = usePreview();
  return (
    <div>
      <span data-testid="available">{String(available)}</span>
      <span data-testid="entitlements">
        {effectiveEntitlements === 'all' ? 'all' : effectiveEntitlements.join(',') || 'none'}
      </span>
      <span data-testid="persona">{persona.label}</span>
      {personas.map((option) => (
        <button key={option.id} onClick={() => setSelection(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const renderProbe = () =>
  render(
    <PreviewProvider>
      <Probe />
    </PreviewProvider>,
  );

describe('PreviewProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('while on demo data', () => {
    beforeEach(() => {
      vi.spyOn(firebaseStatus, 'getFirebaseStatus').mockReturnValue({
        enabled: false,
        requested: false,
        missingKeys: [],
        isConnected: false,
        mode: 'Demo Data',
      });
    });

    it('defaults to review mode with every module unlocked', () => {
      renderProbe();
      expect(screen.getByTestId('available')).toHaveTextContent('true');
      expect(screen.getByTestId('entitlements')).toHaveTextContent('all');
    });

    it('applies the entitlements a chosen agency actually owns', async () => {
      const user = userEvent.setup();
      renderProbe();

      await user.click(screen.getByRole('button', { name: 'USDA Food & Nutrition Service' }));
      expect(screen.getByTestId('entitlements')).toHaveTextContent('sdoh,disaster');
    });

    it('gives an agency that owns nothing no modules at all', async () => {
      const user = userEvent.setup();
      renderProbe();

      await user.click(screen.getByRole('button', { name: 'Community Action Committee' }));
      expect(screen.getByTestId('entitlements')).toHaveTextContent('none');
    });

    it('remembers the selection across a remount', async () => {
      const user = userEvent.setup();
      const { unmount } = renderProbe();
      await user.click(screen.getByRole('button', { name: 'United Way River Region' }));
      unmount();

      renderProbe();
      expect(screen.getByTestId('persona')).toHaveTextContent('United Way River Region');
    });
  });

  describe('once live data is connected', () => {
    beforeEach(() => {
      vi.spyOn(firebaseStatus, 'getFirebaseStatus').mockReturnValue({
        enabled: true,
        requested: true,
        missingKeys: [],
        isConnected: true,
        mode: 'Firestore Live',
      });
    });

    it('is unavailable, so the switcher never renders', () => {
      renderProbe();
      expect(screen.getByTestId('available')).toHaveTextContent('false');
    });

    it('grants nothing even when review mode was previously stored', () => {
      // The dangerous case: someone left review mode on, then live data was
      // switched on. A stored override must not survive that.
      window.localStorage.setItem('accessbelt.preview.v1', 'review');
      renderProbe();
      expect(screen.getByTestId('entitlements')).toHaveTextContent('none');
    });
  });
});
