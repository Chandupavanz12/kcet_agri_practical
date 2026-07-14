import { Plan, Settings } from '../models/index.js';

export async function ensureSettings() {
  await Settings.updateOne({ id: 1 }, { $setOnInsert: { id: 1 } }, { upsert: true });

  const defaultPlans = [
    { code: 'combo', name: 'Combo Plan', price_paise: 99900, duration_days: 365, status: 'active' },
    { code: 'pyq', name: 'PYQ Access', price_paise: 49900, duration_days: 365, status: 'active' },
    { code: 'materials', name: 'Study Materials', price_paise: 49900, duration_days: 365, status: 'active' }
  ];
  for (const p of defaultPlans) {
    await Plan.updateOne({ code: p.code }, { $setOnInsert: p }, { upsert: true });
  }

  const row = await Settings.findOne({ id: 1 }).lean();
  return row;
}
