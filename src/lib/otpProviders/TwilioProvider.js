import twilio from "twilio";

export class TwilioProvider {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.from = process.env.TWILIO_PHONE_NUMBER;
    this.to = process.env.ADMIN_PHONE_NUMBER;
  }

  async sendOtp(otp) {
    console.log("otpgot", otp);
    if (!this.to) throw new Error("Admin phone not configured");
    await this.client.messages.create({
      body: `Your OTP is ${otp}`,
      from: this.from,
      to: this.to,
    });
  }
}
