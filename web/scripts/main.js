// scripts/main.js
import * as UI from './ui.js';
import * as Payment from './payment.js';

UI.setOpenCardPaymentModal(Payment.openCardPaymentModal); // pass function early (UI will call it)
Payment.initPayment(UI.getCart, UI.clearCart);           // payment needs to call getCart/clearCart on success/failure
UI.initUI(Payment.openCardPaymentModal);                  // start UI, passing payment-opener (optional)
