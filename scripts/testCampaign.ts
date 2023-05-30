import { ethers } from "hardhat";
//import{Wallet} from "ethers";
import { CampaignManager__factory, Campaign__factory } from "../typechain-types";

const privateKey = "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897";
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const account1 = "0xBcd4042DE499D14e55001CcbB24a551F3b954096"
const deployer = new ethers.Wallet(privateKey, provider);



function convertToUnits(_tx: any) {
    let arr = [];
    for(let i = 0; i < _tx.length; i++) {
    let result = Number(_tx[i]);
    arr.push(result);
    }
    return arr;
}


const targetInEther = ethers.utils.parseEther("10");

const campaignManagerAddr = "0x0D72E0e4A770Ae04Ca369ccd79533148f8cc08c6";

async function main() {
    //deploy();
    interact();
}

async function deploy() {
   // const [deployer, account1, account2] = await  ethers.getSigners();
    const campaignManagerFactory = new CampaignManager__factory(deployer);
    const contract = await campaignManagerFactory.deploy();
    await contract.deployTransaction.wait();
    console.log(`The campaign manager was deployed at ${contract.address}`);

}

async function interact() {
    //const [deployer, account1, account2] = await  ethers.getSigners();
    const campaignManagerFactory = new CampaignManager__factory(deployer);
    
    const campaignManagerInstance = campaignManagerFactory.attach(campaignManagerAddr);
    
    const tx = await campaignManagerInstance.createCampaign("banger", targetInEther);
    await tx.wait();
    console.log("you just created a campaign");

    const tx2 = await campaignManagerInstance.createCampaign("Big boy", targetInEther);
    await tx2.wait();
    console.log("you just created another campaign");

    const tx3 = await campaignManagerInstance.getOwnerIds();
    let answer = convertToUnits(tx3);
    console.log(answer);

    // const tx4 = await campaignManagerInstance.getOwnerCampaigns();
    // console.log(tx4);

    //expected result = 0x8283CD42F8ECe326d94c762a5f709c5F459C3551
    // const tx5 = await campaignManagerInstance.getParticularCampaign(9);
    // console.log(tx5)

    const tx6 = await campaignManagerInstance.getAllCampaigns();
    console.log(tx6)
   
    const tx7 = await campaignManagerInstance.getAllCampaignIds();
    console.log(convertToUnits(tx7))
   

  

    // console.log("testing array")
    // const tx2 = await campaignManagerInstance.getTestArr();

   
    
    // const test = [];
    // for(let i = 0; i < tx2.length; i++){
    //     test.push(tx2[i]);
    // }

    // console.log(test);

    ///console.log(`The campaign was created that you just created have ids ${ownerIds}`)
}



main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
