export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    partyEnabled: process.env.PARTY_MODE_ENABLED !== 'false',
    authConfigured: Boolean(process.env.AUTH0_ISSUER_BASE_URL && process.env.AUTH0_AUDIENCE),
    databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    chatEnabled: process.env.PARTY_CHAT_ENABLED !== 'false',
    walletSettlementEnabled: process.env.PARTY_WALLET_SETTLEMENT_ENABLED !== 'false'
  });
}
