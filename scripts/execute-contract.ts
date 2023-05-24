import { Contract, getDefaultProvider, Wallet, ethers } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { wallet } from "../config/constants";

const {
  utils: { deployContract },
} = require("@axelar-network/axelar-local-dev");

const chains = require("../config/local.json");
const moonbeamChain = chains.find((chain: any) => chain.name === "Binance");
const avalancheChain = chains.find((chain: any) => chain.name === "Avalanche");
const MINT_VALUE = ethers.utils.parseEther("10");
const TRANSFER_VALUE = ethers.utils.parseEther("5");

// load contracts
const GovernanceToken = require("../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");
//const MessageReceiverContract = require("../artifacts/contracts/MessageReceiver.sol/MessageReceiver.json");

avalancheChain.messageReceiver = "0x63C69067938eB808187c8cCdd12D5Bcf0375b2Ac";
moonbeamChain.messageSender = "0x63C69067938eB808187c8cCdd12D5Bcf0375b2Ac";


async function main() {
    // call on destination chain
    const avalancheProvider = getDefaultProvider(avalancheChain.rpc);
    const avalancheConnectedWallet = wallet.connect(avalancheProvider);
    const sourceContract = new Contract(
      avalancheChain.messageReceiver,
      GovernanceToken.abi,
      avalancheConnectedWallet,
    );

    console.log({
        sourceContract: await sourceContract.chainName(),
      });
    
      
  // call on source chain
  const moonBeamProvider = getDefaultProvider(moonbeamChain.rpc);
  const moonBeamConnectedWallet = wallet.connect(moonBeamProvider);
  const destContract = new Contract(
    moonbeamChain.messageSender,
    GovernanceToken.abi,
    moonBeamConnectedWallet,
  );

  console.log({
    destinationContract: await destContract.chainName(),
  });

//   const tx = await sourceContract.sendMessage(
//     "Avalanche",
//     avalancheChain.messageReceiver,
//     "hello world!",
//     {
//       value: BigInt(3000000),
//     },
//   );
//   await tx.wait();

//   const tx = await sourceContract.mint(MINT_VALUE);
//   const txReceipt = await tx.wait();

  const tokenBalanceAccount1 = await sourceContract.balanceOf(avalancheConnectedWallet.address);
  console.log(`Account 1 on Avalanche has a balance of ${ethers.utils.formatEther(tokenBalanceAccount1)} vote tokens`);

  //check the voting power
//   let votePower1Account1 = await sourceContract.getVotes(avalancheConnectedWallet.address);
//   console.log(`Account 1 on Avalanche has a vote power of ${ethers.utils.formatEther(votePower1Account1)} units`)

  //self delegate
    const delegateTx = await sourceContract.connect(avalancheConnectedWallet).delegate(avalancheConnectedWallet.address);
    const delegateTxReceipt = await delegateTx.wait();
    console.log(`Tokens delegated from ${avalancheConnectedWallet.address} for ${avalancheConnectedWallet.address} at block ${delegateTxReceipt.blockNumber}`);

//     //check the voting power again
//     let votePower2Account1 = await sourceContract.getVotes(avalancheConnectedWallet.address);
//     console.log(`Account 2 has an updated vote power of ${ethers.utils.formatEther(votePower2Account1)} units`)

  //cross-chain transfer
//   const descChainName = destContract.chainName();
//   const stringAddress = ethers.utils.getAddress(moonbeamChain.messageSender);
//   const transferRemoteTx = await sourceContract.transferRemote(
//     descChainName,
//     avalancheConnectedWallet.address,
//     TRANSFER_VALUE,
//     {
//         value: BigInt(30000000),
//     },
//     );

//     const trReceipt = await transferRemoteTx.wait();
//     //console.log(trReceipt);
//     console.log("remote transfer successful")

    // const updatedBalance1 = await sourceContract.balanceOf(avalancheConnectedWallet.address);

    // console.log(`Account 1 on Avalanche has an updated balance of ${ethers.utils.formatEther(updatedBalance1)} vote tokens`);

// //   const event = destContract.on("Executed", (from, value) => {
//     if (value === "hello world!") destContract.removeAllListeners("Executed");
//   });

const tokenBalanceAccount2 = await destContract.balanceOf(moonBeamConnectedWallet.address);
console.log(`Account 2 on Moonbeam has a balance of ${ethers.utils.formatEther(tokenBalanceAccount2)} vote tokens`);

  //check the voting power
  let votePower1Account2 = await destContract.getVotes(moonBeamConnectedWallet.address);
  console.log(`Account 2 on Moonbeam has a vote power of ${ethers.utils.formatEther(votePower1Account2)} units`)

  //self delegate
    const delegateTx2 = await destContract.connect(moonBeamConnectedWallet).delegate(moonBeamConnectedWallet.address);
    const delegateTx2Receipt = await delegateTx2.wait();
    console.log(`Tokens delegated from ${moonBeamConnectedWallet.address} for ${moonBeamConnectedWallet.address} at block ${delegateTx2Receipt.blockNumber}`);

    //check the voting power again
    let votePower2Account2 = await destContract.getVotes(moonBeamConnectedWallet.address);
    console.log(`Account 2 has an updated vote power of ${ethers.utils.formatEther(votePower2Account2)} units`)

// const tokenBalanceAccount3 = await destContract.balanceOf(destContract.address);
// console.log(`Moonbeam destination has a balance of ${ethers.utils.formatEther(tokenBalanceAccount3)} vote tokens`);
}

main();
