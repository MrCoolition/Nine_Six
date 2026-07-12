import { getCommunityRuntimeConfig } from './_config.js';
import { ensureCommunitySchema, pingCommunityDatabase } from './_db.js';

export default async function handler(_request, response) {
  const config = getCommunityRuntimeConfig();
  let databaseConnected = false;
  let schemaReady = false;
  if (config.databaseConfigured) {
    try {
      databaseConnected = await pingCommunityDatabase();
      schemaReady = await ensureCommunitySchema();
    } catch {
      databaseConnected = false;
      schemaReady = false;
    }
  }
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    partyEnabled: process.env.PARTY_MODE_ENABLED !== 'false',
    authConfigured: config.authConfigured,
    databaseProvider: 'neon',
    databaseConfigured: config.databaseConfigured,
    databaseConnected,
    schemaReady,
    sharedLeaderboardConfigured: config.sharedLeaderboardConfigured,
    partyActionsConfigured: config.partyActionsConfigured,
    chatEnabled: process.env.PARTY_CHAT_ENABLED !== 'false',
    walletSettlementEnabled: process.env.PARTY_WALLET_SETTLEMENT_ENABLED !== 'false'
  });
}
