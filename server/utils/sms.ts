export async function sendSms(to: string, body: string): Promise<void> {
  console.log(`[SMS] To: ${to} | Body: ${body}`);
}
