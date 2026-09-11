const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs-extra');
const path = require('path');

const walletPathRoot = path.resolve(__dirname, '../_wallets');
const mspRoot = path.resolve(__dirname, '../_msp');

// Exact mapping from org name → admin directory name
const ORG_ADMIN_DIRS = {
  StartupOrg:   'startuporgadmin',
  ValidatorOrg: 'validatororgadmin',
  InvestorOrg:  'investororgadmin',
  PlatformOrg:  'platformorgadmin',
};

const MSP_IDS = {
  StartupOrg:   'StartupOrgMSP',
  ValidatorOrg: 'ValidatorOrgMSP',
  InvestorOrg:  'InvestorOrgMSP',
  PlatformOrg:  'PlatformOrgMSP',
};

const CHANNELS = {
  gov:    'gov-validation-channel',
  invest: 'investment-channel',
};

const CHAINCODES = {
  gov:    'govcc',
  invest: 'investcc',
};

let gateways = {};

async function loadIdentity(wallet, org) {
  const identityLabel = 'Admin';

  // Always reload from disk — avoids stale/invalid cached identities
  const adminDir = ORG_ADMIN_DIRS[org];
  if (!adminDir) throw new Error(`Unknown org: ${org}`);

  const mspPath  = path.join(mspRoot, org, adminDir, 'msp');
  const certPath = path.join(mspPath, 'signcerts', 'cert.pem');
  const keyPath  = path.join(mspPath, 'keystore',  'key.pem');

  if (!await fs.pathExists(certPath)) throw new Error(`cert.pem not found: ${certPath}`);
  if (!await fs.pathExists(keyPath))  throw new Error(`key.pem not found:  ${keyPath}`);

  const certificate = await fs.readFile(certPath, 'utf8');
  const privateKey  = await fs.readFile(keyPath,  'utf8');

  if (!certificate.includes('BEGIN CERTIFICATE')) throw new Error(`Invalid cert for ${org}`);
  if (!privateKey.includes('BEGIN'))              throw new Error(`Invalid key for ${org}`);

  const identity = {
    credentials: { certificate, privateKey },
    mspId: MSP_IDS[org],
    type: 'X.509',
  };

  await wallet.put(identityLabel, identity);
  console.log(`✅ Identity loaded for ${org} (mspId=${MSP_IDS[org]})`);
  return identityLabel;
}

async function getConnection(org, channel, ccName) {
  const key = `${org}_${channel}`;

  if (!gateways[key]) {
    const walletPath = path.join(walletPathRoot, `_${org}`);
    await fs.ensureDir(walletPath);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identityLabel = await loadIdentity(wallet, org);

    // Build connection profile dynamically from Microfab's grpc:// (no TLS)
    const orgLower    = org.toLowerCase();
    const peerHost    = `${orgLower}peer-api.127-0-0-1.nip.io`;
    const ordererHost = 'orderer-api.127-0-0-1.nip.io';

    const ccp = {
      name: `microfab-${orgLower}`,
      version: '1.0.0',
      client: { organization: org },
      organizations: {
        [org]: {
          mspid: MSP_IDS[org],
          peers: [`${peerHost}:9090`],
        },
      },
      peers: {
        [`${peerHost}:9090`]: {
          url: `grpc://localhost:9090`,
          grpcOptions: {
            'grpc.default_authority':   `${peerHost}:9090`,
            'grpc.ssl_target_name_override': peerHost,
          },
        },
      },
      orderers: {
        [`${ordererHost}:9090`]: {
          url: `grpc://localhost:9090`,
          grpcOptions: {
            'grpc.default_authority':   `${ordererHost}:9090`,
            'grpc.ssl_target_name_override': ordererHost,
          },
        },
      },
      channels: {
        [channel]: {
          orderers: [`${ordererHost}:9090`],
          peers: { [`${peerHost}:9090`]: {} },
        },
      },
    };

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: identityLabel,
      discovery: { enabled: false },
    });

    const network  = await gateway.getNetwork(channel);
    const contract = await network.getContract(ccName);

    gateways[key] = { gateway, contract };
    console.log(`🔗 Connected: org=${org} channel=${channel} chaincode=${ccName}`);
  }

  return gateways[key].contract;
}

async function disconnectAll() {
  for (const { gateway } of Object.values(gateways)) {
    gateway.disconnect();
  }
  gateways = {};
}

module.exports = {
  getStartupGovContract:     () => getConnection('StartupOrg',   CHANNELS.gov,    CHAINCODES.gov),
  getValidatorGovContract:   () => getConnection('ValidatorOrg', CHANNELS.gov,    CHAINCODES.gov),
  getInvestorInvestContract: () => getConnection('InvestorOrg',  CHANNELS.invest, CHAINCODES.invest),
  disconnectAll,
};
