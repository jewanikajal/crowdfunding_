const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function getContract(channelName, chaincodeName, orgName, identityName) {

    /* ---------- Paths ---------- */

    const walletPath = path.join(__dirname, '_wallets', orgName);
    const gatewayPath = path.join(
        __dirname,
        '_gateways',
        `${orgName.toLowerCase()}gateway.json`
    );

    if (!fs.existsSync(walletPath)) {
        throw new Error(`Wallet not found: ${walletPath}`);
    }

    if (!fs.existsSync(gatewayPath)) {
        throw new Error(`Gateway profile not found: ${gatewayPath}`);
    }

    /* ---------- Wallet ---------- */

    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get(identityName);
    if (!identity) {
        throw new Error(`Identity ${identityName} not found in wallet ${orgName}`);
    }

    /* ---------- Gateway ---------- */

    const ccp = JSON.parse(fs.readFileSync(gatewayPath, 'utf8'));

    const gateway = new Gateway();

    await gateway.connect(ccp, {
        wallet,
        identity: identityName,
        discovery: { enabled: true, asLocalhost: true }
    });

    /* ---------- Network ---------- */

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    return { contract, gateway };
}

module.exports = { getContract };
