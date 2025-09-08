export class OTPProvider {
  async sendOtp(phoneNumber, otp) {
    throw new Error("Not implemented");
  }
}

export class Msg91Provider extends OTPProvider {
  async sendOtp(phoneNumber, otp) {
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const url = `https://api.msg91.com/api/v5/otp?authkey=${msg91AuthKey}&mobile=${phoneNumber}&template_id=${templateId}&otp=${otp}`;

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("Msg91 OTP send failed");
    return true;
  }
}
