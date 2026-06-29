import type { Institution } from '@/types/uploads';
import type { AccountType } from '@/types/accounts';

/**
 * Bundled sample statements for the demo upload showcase (todo #51).
 *
 * Each `file` lives in `public/demo-samples/` and is served verbatim — the demo
 * "Try this sample" buttons fetch its raw bytes and POST them unchanged. The
 * backend allowlist matches on the sha256 of those bytes, so the files MUST stay
 * byte-identical to the API repo fixtures (see `.gitattributes`).
 *
 * `targetAccountType` picks which seeded demo account to import into.
 */
export interface DemoSample {
  file: string;
  institution: Institution;
  label: string;
  blurb: string;
  targetAccountType: AccountType;
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    file: 'amex_sample.csv',
    institution: 'amex',
    label: 'American Express',
    blurb: 'Credit card purchases — watch the AI suggest a category for each transaction.',
    targetAccountType: 'CREDIT_CARD',
  },
  {
    file: 'tdbank_sample.csv',
    institution: 'tdbank',
    label: 'TD Bank',
    blurb: 'Checking account activity — debit-card purchases and a payroll deposit, auto-categorized.',
    targetAccountType: 'CHECKING',
  },
  {
    file: 'schwab_sample.csv',
    institution: 'schwab',
    label: 'Charles Schwab',
    blurb: 'Brokerage statement — buys, sells, and dividends imported as investment activity.',
    targetAccountType: 'INVESTMENT',
  },
];
