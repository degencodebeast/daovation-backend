import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
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

let governanceTokenAddr = "0x1e544Cdb9754eb341c6368FD8c2CE0Cfbd9157d1";
let DAOAddress = "0xf49e05781f66ECE655AC19b3044B496D56Bb9073";
let satelliteAddr = "0x9d73A927528c76a9be12Da79E035A33368C4c38f";


const daoInteractAddress = "0x7dA8F2F7EF7760E086c2b862cdDeBEFa8d969aa2";

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Polygon"];
const spokeChainIds: any = [];

let hubChain = 'Aurora';

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);

export async function main() {

  const receiverChains = [EvmChain.FANTOM, EvmChain.AVALANCHE];
  const sender = EvmChain.POLYGON;
  const gasToken = GasToken.MATIC;

  (async () => {

    const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

    let feesArr: any = []
    for (let i = 0; i < receiverChains.length; i++) {
      // Calculate how much gas to pay to Axelar to execute the transaction at the destination chain
      let result = await api.estimateGasFee(
        sender,
        receiverChains[i],
        gasToken,
        700000,
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

    const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    const crossChainDAOInstance = crossChainDAOFactory.attach(DAOAddress);

    const incrementerFactory = new SimpleIncrementer__factory(connectedWallet);

    const incrementerInstance = incrementerFactory.attach(daoInteractAddress)

    const incrementData = incrementerInstance.interface.encodeFunctionData("increment",)

    const targets = [incrementerInstance.address];
    const values = [0];
    const callDatas = [incrementData];

    let description = 'Proposal for me to be given 1000000 BNB!'

    //const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, feesArray, { value: "10000000000000000000" })
    
    // const gasEstimate = await crossChainDAOInstance.estimateGas.crossChainPropose(targets, values, callDatas, description, satelliteAddr, fees,{gasLimit: 14000000, value: multipliedValue });
    // console.log('Gas estimate:', gasEstimate.toString());

    console.log('creatingProposal...') 

    //later check whether if you use totalFees, whether it will still go
    const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, fees, {gasLimit: 6300000, value: multipliedValue })
    const result = await tx.wait();
    console.log(`Proposal created at this transaction hash: ${result.transactionHash}`);
  })();
}


async function createProposal(description: string, feesArray: any[]) {


  // const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
  // const crossChainDAOInstance = crossChainDAOFactory.attach(DAOAddress);

  // const incrementerFactory = new SimpleIncrementer__factory(connectedWallet);
  // console.log('Deploying Incrementer....')
  // const incrementerContract = await incrementerFactory.deploy();
  // console.log('deployed!')
  // const incrementer = incrementerFactory.attach(incrementerContract.address)

  // const incrementData = incrementerContract.interface.encodeFunctionData("increment",)

  // const targets = [incrementerContract.address];
  // const values = [0];
  // const callDatas = [incrementData];

  // console.log('creatingProposal...')

  // const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, feesArray, { value: "10000000000000000000" })
  // const result = await tx.wait();
  // console.log("Proposal created");
  // const proposalCreatedEvents = result.events?.filter((event: any) => event.event === 'ProposalCreated');

  //   if (proposalCreatedEvents && proposalCreatedEvents.length > 0) {

  //     const proposalId = proposalCreatedEvents[0].args?.proposalId;


  //     console.log("Proposal ID:", proposalId.toString());
  //   } else {
  //     console.log("No 'ProposalCreated' events found in the result.");
  //   }


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

