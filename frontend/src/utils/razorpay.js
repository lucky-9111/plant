const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise = null;

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error("Could not load the payment gateway. Please check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

// Appends the backend's Request ID to a user-facing error message when one
// was returned, so a customer can quote it to support for faster lookup.
export function withReference(message, err) {
  return err?.requestId ? `${message} (Reference: ${err.requestId})` : message;
}
