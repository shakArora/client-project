/**
 * Three-step checkout progress indicator for Shop, Details, and Pay stages.
 * Highlights the current step and marks completed steps for customer orientation during checkout.
 * @author Shivum Arora
 * @date 6/9/2026
 */
const LABELS = ['Shop', 'Details', 'Pay'];

export default function CheckoutStepper({ step }) {
  return (
    <div className="checkout-stepper" aria-label={`Checkout step ${step} of 3`}>
      {[1, 2, 3].map((s, i) => (
        <div key={s} className="checkout-stepper-item">
          <div className={`checkout-stepper-dot ${step > s ? 'done' : step === s ? 'active' : ''}`}>
            {step > s ? '✓' : s}
          </div>
          <span className={`checkout-stepper-label ${step === s ? 'active' : ''}`}>
            {LABELS[i]}
          </span>
          {i < 2 && <div className={`checkout-stepper-line ${step > s ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}
