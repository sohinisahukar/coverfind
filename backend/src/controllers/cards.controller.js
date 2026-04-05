/**
 * POST /api/cards
 * Placeholder until multipart upload + OCR/parser exists.
 * Returns a stable JSON shape so clients and Swagger match runtime behavior.
 */
export async function parseCard(req, res) {
  res.status(200).json({
    memberId: null,
    groupId: null,
    planName: null,
    insurerName: null,
    stub: true,
    message: 'Insurance card parsing is not implemented yet.',
  });
}
