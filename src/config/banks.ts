/**
 * Nigerian Banks Directory with official NUBAN 3-digit codes for Paystack Account Resolution & Transfers.
 */

export interface NigerianBank {
  name: string;
  code: string;
  slug: string;
  popular?: boolean;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  // Top Popular Banks first
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank', popular: true },
  { name: 'Access Bank', code: '044', slug: 'access-bank', popular: true },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank', popular: true },
  { name: 'United Bank For Africa (UBA)', code: '033', slug: 'united-bank-for-africa', popular: true },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria', popular: true },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank', popular: true },
  { name: 'OPay Digital Services', code: '999992', slug: 'opay', popular: true },
  { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint-mfb-ng', popular: true },
  { name: 'PalmPay', code: '999991', slug: 'palmpay', popular: true },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank', popular: true },
  { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank', popular: true },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank', popular: true },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank', popular: true },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria', popular: true },
  { name: 'Wema Bank', code: '035', slug: 'wema-bank', popular: true },
  { name: 'Polaris Bank', code: '076', slug: 'polaris-bank', popular: true },

  // Commercial & Microfinance
  { name: 'Access Bank (Diamond)', code: '063', slug: 'diamond-bank' },
  { name: 'ALAT by WEMA', code: '035A', slug: 'alat-by-wema' },
  { name: 'Carbon', code: '565', slug: 'carbon' },
  { name: 'Citibank Nigeria', code: '023', slug: 'citibank-nigeria' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'Fairmoney Microfinance Bank', code: '51318', slug: 'fairmoney-microfinance-bank-ng' },
  { name: 'Globus Bank', code: '00103', slug: 'globus-bank' },
  { name: 'Heritage Bank', code: '030', slug: 'heritage-bank' },
  { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
  { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
  { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
  { name: 'Rubies MFB', code: '125', slug: 'rubies-mfb' },
  { name: 'Standard Chartered Bank', code: '068', slug: 'standard-chartered-bank' },
  { name: 'Suntrust Bank', code: '100', slug: 'suntrust-bank' },
  { name: 'Taj Bank', code: '302', slug: 'taj-bank' },
  { name: 'Titan Bank', code: '102', slug: 'titan-bank' },
  { name: 'Unity Bank', code: '215', slug: 'unity-bank' },
  { name: 'VFD Microfinance Bank', code: '566', slug: 'vfd' },
];

export function getNigerianBanks(): NigerianBank[] {
  return NIGERIAN_BANKS;
}

export function findBankByCode(code: string): NigerianBank | undefined {
  const clean = code.trim();
  return NIGERIAN_BANKS.find((b) => b.code === clean);
}

export function findBankByName(name: string): NigerianBank | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return NIGERIAN_BANKS.find(
    (b) =>
      b.name.toLowerCase() === clean ||
      b.name.toLowerCase().includes(clean) ||
      clean.includes(b.slug),
  );
}
