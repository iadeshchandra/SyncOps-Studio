/** ROAS hemorrhage math — the revenue signal loss model. */

export interface RoasInputs {
  /** Monthly paid media spend in USD. */
  spend: number;
  /** Current reported blended ROAS (e.g. 2.8). */
  roas: number;
}

export interface RoasResult {
  attributedRevenue: number;
  signalLossCoeff: number;
  trueRevenue: number;
  hiddenRevenue: number;
  annualizedHemorrhage: number;
  recoverableRevenue: number;
}

/** Fixed industry-average signal loss from Safari ITP, ad blockers & private relay. */
export const SIGNAL_LOSS_COEFF = 0.3;

/** Capture rate achievable once server-side CAPI is deployed. */
export const CAPI_CAPTURE_RATE = 0.9;

export function calcRoas({ spend, roas }: RoasInputs): RoasResult {
  const attributedRevenue = spend * roas;
  const signalLossCoeff = SIGNAL_LOSS_COEFF;
  const trueRevenue = attributedRevenue / (1 - signalLossCoeff);
  const hiddenRevenue = trueRevenue - attributedRevenue;
  const annualizedHemorrhage = hiddenRevenue * 12;
  const recoverableRevenue = hiddenRevenue * CAPI_CAPTURE_RATE;
  return {
    attributedRevenue,
    signalLossCoeff,
    trueRevenue,
    hiddenRevenue,
    annualizedHemorrhage,
    recoverableRevenue,
  };
}
