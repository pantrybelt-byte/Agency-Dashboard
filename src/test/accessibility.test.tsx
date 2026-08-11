import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage, signInForTest } from './renderPage';
import { OverviewPage } from '../pages/OverviewPage';
import { DemographicsPage } from '../pages/DemographicsPage';
import { FoodDesertsPage } from '../pages/FoodDesertsPage';
import { PantryInteractionsPage } from '../pages/PantryInteractionsPage';
import { MostRequestedPage } from '../pages/MostRequestedPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LoginPage } from '../pages/LoginPage';

/**
 * Automated accessibility gate.
 *
 * Axe catches roughly a third of real accessibility problems, so passing here
 * is a floor, not a certificate. Keyboard and screen-reader passes still have
 * to happen by hand. What this does guarantee is that the mechanical failures
 * — unlabelled controls, missing table structure, bad ARIA — cannot come back
 * unnoticed.
 */
const pages: [string, () => React.ReactElement][] = [
  ['Login', () => <LoginPage onLogin={() => {}} />],
  ['Overview', () => <OverviewPage />],
  ['Demographics', () => <DemographicsPage />],
  ['Food Deserts', () => <FoodDesertsPage />],
  ['Pantry Interactions', () => <PantryInteractionsPage />],
  ['Most Requested', () => <MostRequestedPage />],
  ['Reports', () => <ReportsPage />],
  ['Settings', () => <SettingsPage />],
];

describe('accessibility', () => {
  beforeEach(() => {
    signInForTest();
  });

  it.each(pages)('%s page has no detectable axe violations', async (_name, renderComponent) => {
    const { container } = renderPage(renderComponent());
    const results = await axe(container);

    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      help: violation.help,
    }));

    expect(violations).toEqual([]);
  });
});
