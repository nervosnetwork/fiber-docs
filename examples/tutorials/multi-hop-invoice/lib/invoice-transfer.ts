export async function copyInvoice(invoice: string) {
  await navigator.clipboard.writeText(invoice);
}

export async function pasteInvoice() {
  const invoice = (await navigator.clipboard.readText()).trim();
  if (!invoice) throw new Error('The clipboard is empty');
  return invoice;
}

// The encoded invoice can also travel through a QR code,
// chat message, email, or any other text transport.
