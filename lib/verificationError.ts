export const VERIFICATION_REQUIRED_MESSAGE =
  "Account verification is required for this action.";

export class VerificationRequiredError extends Error {
  constructor(message = VERIFICATION_REQUIRED_MESSAGE) {
    super(message);
    this.name = "VerificationRequiredError";
  }
}
