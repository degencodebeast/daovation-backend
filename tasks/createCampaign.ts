import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CampaignManager__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

import {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} from "@axelar-network/axelarjs-sdk";
import { result } from 'lodash';


const { defaultAbiCoder } = utils;

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let campaignManagerAddr = "0xfaEAc401400A66262CBBe90A37eDAB8CE48B3Ab4"
let campaignSatelliteAddr = "0xc514d8Fd3052E3D2aE793c1e95d4EFdA8Bb05d83"


//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Polygon"];
const spokeChainIds: any = [];

let hubChain = 'Aurora';

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);

const TARGET1 = ethers.utils.parseEther("10");

const TARGET2 = ethers.utils.parseEther("15");

let campaignCID = "bafybeigcjyxzjvkvlqsnjj6d5bqgcv4o57aoi3q5um2ab5agtwvfx5imfe"

const TARGET3 = ethers.utils.parseEther("17");

let campaignCID2: any = "bafybeif5ohaftpyiybkx7xj54g2awulvs7hxhpyf2zgb4qdvugma4eaekm"


let campaignCID3 = "bafybeiejrstxsxocyzpm7ujknae3qbpny2wkrqtf4btwqns3t3xq6o4voq"


export async function main() {
  //await createCampaign(campaignCID3, TARGET3, campaignSatelliteAddr);

  const receiverChains = [EvmChain.FANTOM, EvmChain.POLYGON];
  const sender = EvmChain.AURORA;
  const gasToken = GasToken.AURORA;

  (async () => {

    const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

    let feesArr: any = []
    for (let i = 0; i < receiverChains.length; i++) {
      // Calculate how much gas to pay to Axelar to execute the transaction at the destination chain
      let result = await api.estimateGasFee(
        sender,
        receiverChains[i],
        gasToken,
        800000,
        1.7
      );
      //let result = getGasFee(sender, receiverChains[i], gasToken);
      feesArr.push(result);
      //console.log(result)
    }
    let fees = await feesArr;
    console.log(fees);
    //await createProposal('Proposal for me to be given 1000 BNB!', fees);

    let totalFees: BigNumber = ethers.BigNumber.from(0);
    for (let i = 0; i < fees.length; i++) {
      let number: BigNumber = ethers.BigNumber.from(fees[i])
      totalFees = totalFees.add(number);
    }

    console.log(`totalFees = ${totalFees.toString()}`)
    const multipliedValue = totalFees.mul(11).div(10)
    console.log(`total fees * 1.1 = ${multipliedValue.toString()}`)

    //const totalFeesInWei = ethers.utils.parseEther(totalFees.toString());

    //const bufferFees = totalFees * 1.3;

    const campaignManagerFactory = new CampaignManager__factory(connectedWallet);
    const campaignManagerInstance = campaignManagerFactory.attach(campaignManagerAddr);

    // const gasEstimate = await campaignManagerInstance.estimateGas.createCampaign(campaignCID, TARGET1, campaignSatelliteAddr, fees,{value: multipliedValue});
    // console.log('Gas estimate:', gasEstimate.toString());

    console.log('creating Campaign...')

    const gasLimitBigNum = ethers.BigNumber.from(6721975)
    const tx = await campaignManagerInstance.createCampaign(campaignCID, TARGET1, campaignSatelliteAddr, fees, { gasLimit: 5000000, value: multipliedValue })
    const result = await tx.wait();
    console.log(`Campaign created at this transaction hash: ${result.transactionHash}`);



  })();



}



async function createCampaign(campaignCid: string, _target: any, _campaignSatelliteAddr: string) {

  // const chain = chains.find((chain: any) => chain.name === hubChain);
  // const provider = getDefaultProvider(chain.rpc);
  // const connectedWallet = wallet.connect(provider);

  // const campaignManagerFactory = new CampaignManager__factory(connectedWallet);
  // const campaignManagerInstance = campaignManagerFactory.attach(campaignManagerAddr);


  // const result = await (await campaignManagerInstance.createCampaign(campaignCid, _target, _campaignSatelliteAddr, { value: "10000000000000000" })).wait();
  // console.log(`You created a campaign with the tx of ${result.transactionHash}`)


  //const campaignCreatedEvents = result.events?.filter((event: any) => event.event === 'Campaign created');

  //     if (campaignCreatedEvents && campaignCreatedEvents.length > 0) {
  //     // @ts-ignore
  //     const campaignId = campaignCreatedEvents[0].args.campaignId;
  //     console.log("campaign created");

  //     console.log("Proposal ID:", campaignId.toString());
  //   } else {
  //     console.log("No 'ProposalCreated' events found in the result.");
  //   }


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

