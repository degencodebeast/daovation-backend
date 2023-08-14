import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let hubChain = "Aurora";

const simpleIncrementerAddress = "0x7dA8F2F7EF7760E086c2b862cdDeBEFa8d969aa2";

export async function main() {
   await deployIncrementer(hubChain, wallet);
}

async function deployIncrementer(_hubChain: any, wallet: any) {
    const chain = chains.find((chain: any) => chain.name === _hubChain);

    console.log(`Deploying Test Simple Incrementer contract for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    const simpleIncrementerFactory = new SimpleIncrementer__factory(connectedWallet);
    const contract = await simpleIncrementerFactory.deploy();
    const deployTxReceipt = await contract.deployTransaction.wait();
    console.log(`Simple Test Incrementer contract has been deployed at ${contract.address}`);
}

async function interact(hubChain: string, wallet: any, daoAddr: string) {
    // const chain = chains.find((chain: any) => chain.name === hubChain);
    // const provider = getDefaultProvider(chain.rpc);
    // const connectedWallet = wallet.connect(provider);

    // const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    // const crossChainDAOInstance = crossChainDAOFactory.attach(daoAddr);

    // const result = await crossChainDAOInstance.spokeChainNames(1);
    // //const result2 = await governanceTokenInstance.spokeChainNames(0);
    // console.log(result);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

