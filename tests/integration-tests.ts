//import { expect, assert } from "chai";
const {expect} = require("chai");
//import chaiAsPromised from "chai-as-promised";
import { ethers } from "ethers";
import { mine, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers/lib/utils";
import { main as startLocal } from "../scripts/local-network";
import { isTestnet, wallet } from "../config/constants";
import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { CrossChainDAO, CrossChainDAO__factory, DAOSatellite, GovernanceToken, DAOSatellite__factory } from "../typechain-types";
const { defaultAbiCoder } = utils;
const { deployUpgradable } = require("@axelar-network/axelar-gmp-sdk-solidity");
const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");

import { moveBlocks } from "../utils/move-blocks"
import { moveTime } from "../utils/move-time"
let targetSecondsPerBlockObj = require("../config/targetSecondsPerBlock.json");



//@ts-ignore
const GovernanceToken = require("../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");
const ExampleProxy = require("../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json");
const daoSatellite = require("../artifacts/contracts/DAOSatellite.sol/DAOSatellite.json");

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");
//let initialAmount = parseEther("1000");


const chainNames = ["Binance", "Avalanche", "Polygon"];
const hubChain = "Binance";

const chainsInfo: any = [];

const spokeChainNames = ["Polygon", "Avalanche"];
const spokeChainIds: any = [];
const spokeChainsInfo: any = [];


function findChain(chains: any, name: string) {
    const chain = chains.find((chain: any) => chain.name === name);
    if (!chain) {
        throw new Error(`Chain ${name} not found`);
    }
    return chain;
}

function getConnectedWallet(_chainName: any) {
    const chain = chains.find((chain: any) => chain.name === _chainName);
            const provider = getDefaultProvider(chain.rpc);
            const connectedWallet = wallet.connect(provider);
            return connectedWallet;
}

function getChainIds(chains: any) {
    for (let i = 0; i < spokeChainNames.length; i++) {
        let chainName = spokeChainNames[i];
        //let chainInfo = chainsInfo[i];
        chains.find((chain: any) => {
            if (chain.name === chainName) {
                spokeChainIds.push(chain.chainId);

            }
        });
    }
}

describe("Crosschain CrowdFunding DAO", async () => {
    let encodedSpokeChainIds: any;
    let encodedSpokeChainNames: any;
    let crossChainDAOAddr: any;
    let governanceTokenAddr: any;
    let daoSatelliteAddr: any;

    before(async () => {
        //async function fixture() {
            async function deployGovernanceToken(chain: any, wallet: any) {
                console.log(`Deploying Governance Token for ${chain.name}.`);
                const provider = getDefaultProvider(chain.rpc);
                const connectedWallet = wallet.connect(provider);
                const contract = await deployUpgradable(
                    chain.constAddressDeployer,
                    connectedWallet,
                    GovernanceToken,
                    ExampleProxy,
                    [chain.gateway, chain.gasService],
                    [],
                    defaultAbiCoder.encode(['string'], [chain.name]),
                    'governance-token'
                );
                chain.contract = contract;
                governanceTokenAddr = chain.contract.address;
                console.log(`Deployed Governance Token for ${chain.name} at ${chain.contract.address}.`);
            }
    
            for (let i = 0; i < chainNames.length; i++) {
                        let chainName = chainNames[i];
                        let chainInfo = chains.find((chain: any) => {
                            if (chain.name === chainName) {
                                chainsInfo.push(chain);
                                return chain;
                            }
                        });
            
                        console.log(`Deploying [${chainName}]`);
                        await deployGovernanceToken(chainInfo, wallet);
                        
                    }
                    getChainIds(chains);
                    //console.log(spokeChainIds)
                    encodedSpokeChainIds = ethers.utils.defaultAbiCoder.encode(
                        ["uint32[]"],
                        [spokeChainIds]
                    );
                    encodedSpokeChainNames = ethers.utils.defaultAbiCoder.encode(
                        ["string[]"],
                        [spokeChainNames]
                    );
    
                    
            async function crossChainDAODeploy(hubChain: any, wallet: any, governanceToken: string) {
                const chain = chains.find((chain: any) => chain.name === hubChain);
    
                console.log(`Deploying CrossChainDAO for ${chain.name}.`);
                const provider = getDefaultProvider(chain.rpc);
                const connectedWallet = wallet.connect(provider);
    
                const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
                const contract: CrossChainDAO = await crossChainDAOFactory.deploy(
                    governanceToken,
                    chain.gateway,
                    chain.gasService,
                    encodedSpokeChainIds,
                    encodedSpokeChainNames
                );
                const deployTxReceipt = await contract.deployTransaction.wait();
                crossChainDAOAddr = contract.address;
                console.log(`Cross chain DAO has been deployed at ${contract.address}`);
            }
    
            await crossChainDAODeploy(hubChain, wallet, governanceTokenAddr);
    
           
            async function deploySatellite(_hubChain: string, chain: any, wallet: any, governanceToken: string, targetSecondsPerBlock: number) {
                console.log(`Deploying Satellite for ${chain.name}.`);
                const provider = getDefaultProvider(chain.rpc);
                const connectedWallet = wallet.connect(provider);
    
                const contract = await deployUpgradable(
                    chain.constAddressDeployer,
                    connectedWallet,
                    daoSatellite,
                    ExampleProxy,
                    [_hubChain, chain.gateway, chain.gasService, governanceToken, targetSecondsPerBlock],
                    [],
                    //defaultAbiCoder.encode(['string'], [chain.name]),
                    defaultAbiCoder.encode(['string'], [chain.name]),
                    'satellite'
                );
                chain.contract = contract;
                daoSatelliteAddr = contract.address;
                console.log(`Deployed Satellite for ${chain.name} at ${chain.contract.address}.`);
            }
    
            let targetSecond: any;
            for (let i = 0; i < spokeChainNames.length; i++) {
    
                let chainName = spokeChainNames[i];
        
                let chainInfo = chains.find((chain: any) => {
                    if (chain.name === chainName) {
                        spokeChainsInfo.push(chain);
                        return chain;
                    }
                });
        
                for (const property in targetSecondsPerBlockObj) {
                    if (chainName === property) {
                        targetSecond = targetSecondsPerBlockObj[property]
                    }
                }
        
                console.log(`Deploying [${chainName}]`);
        
                await deploySatellite(hubChain, chainInfo, wallet, governanceTokenAddr, targetSecond);
        
            }
    
            // return{
            //     encodedSpokeChainIds,
            //     encodedSpokeChainNames,
            //     crossChainDAOAddr,
            //     governanceTokenAddr,
            //     daoSatelliteAddr
            // };
        //}
    })

    it("should work", async function () {
                    const connectedWallet = getConnectedWallet(hubChain);
                    //const {crossChainDAOAddr} = await loadFixture(fixture);
                    const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
                    const crossChainDAOInstance = crossChainDAOFactory.attach(crossChainDAOAddr);
                    let hub = findChain(chains, hubChain);
                    let hubGasService = hub.gasService;
                    expect(await crossChainDAOInstance.gasService()).to.eq(hubGasService);
                })


    

    // describe("CrossChainDAO", function() {
    //     before
    //     describe("deployment", function () {
    //         it("should work", async function () {
    //             const connectedWallet = getConnectedWallet(hubChain);
    //             //const {crossChainDAOAddr} = await loadFixture(fixture);
    //             const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    //             const crossChainDAOInstance = crossChainDAOFactory.attach(crossChainDAOAddr);
    //             let hub = findChain(chains, hubChain);
    //             let hubGasService = hub.gasService;
    //             expect(await crossChainDAOInstance.gasService()).to.eq(hubGasService);
    //         })
    //     })
    // })

    
    // let encodedSpokeChainIds: any;
    // let encodedSpokeChainNames: any;
    // let crossChainDAOAddr: any;
    // let governanceTokenAddr: any;
    // let daoSatelliteAddr: any;

    // beforeEach(async () => {
    //     async function deployGovernanceToken(chain: any, wallet: any) {
    //         console.log(`Deploying Governance Token for ${chain.name}.`);
    //         const provider = getDefaultProvider(chain.rpc);
    //         const connectedWallet = wallet.connect(provider);
    //         const contract = await deployUpgradable(
    //             chain.constAddressDeployer,
    //             connectedWallet,
    //             GovernanceToken,
    //             ExampleProxy,
    //             [chain.gateway, chain.gasService],
    //             [],
    //             defaultAbiCoder.encode(['string'], [chain.name]),
    //             'governance-token'
    //         );
    //         chain.contract = contract;
    //         governanceTokenAddr = chain.contract.address;
    //         console.log(`Deployed Governance Token for ${chain.name} at ${chain.contract.address}.`);
    //     }

    //     //await startLocal();
    //     for (let i = 0; i < chainNames.length; i++) {
    //         let chainName = chainNames[i];
    //         let chainInfo = chains.find((chain: any) => {
    //             if (chain.name === chainName) {
    //                 chainsInfo.push(chain);
    //                 return chain;
    //             }
    //         });

    //         console.log(`Deploying [${chainName}]`);
    //         await deployGovernanceToken(chainInfo, wallet);
            
    //     }
    //     getChainIds(chains);
    //     //console.log(spokeChainIds)
    //     encodedSpokeChainIds = ethers.utils.defaultAbiCoder.encode(
    //         ["uint32[]"],
    //         [spokeChainIds]
    //     );
    //     encodedSpokeChainNames = ethers.utils.defaultAbiCoder.encode(
    //         ["string[]"],
    //         [spokeChainNames]
    //     );
    // });

    // describe("When the token has been deployed, we deploy the Cross chain DAO", async () => {
    //     let connectedWallet: any;
    //     let provider: any;
    //     let chain: any;
    //     // let crossChainDAOContract: any;

    //     beforeEach(async () => {
    //         chain = chains.find((chain: any) => chain.name === hubChain);
    //         console.log(`Deploying CrossChainDAO for ${chain.name}.`);
    //         provider = getDefaultProvider(chain.rpc);
    //         connectedWallet = wallet.connect(provider);
    //         const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);

    //         const contract: CrossChainDAO = await crossChainDAOFactory.deploy(
    //             governanceTokenAddr,
    //             chain.gateway,
    //             chain.gasService,
    //             encodedSpokeChainIds,
    //             encodedSpokeChainNames
    //         );
    //         const deployTxReceipt = await contract.deployTransaction.wait();
    //         crossChainDAOAddr = contract.address;
    //         console.log(`Cross chain DAO has been deployed at ${contract.address}`);
    //     })

    //     it("should return the gas service of the hub chain", async () => {
    //         const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    //         const crossChainDAOInstance = crossChainDAOFactory.attach(crossChainDAOAddr);

    //         const gasService = await crossChainDAOInstance.gasService();
    //         let hub = findChain(chains, hubChain);
    //         let hubGasService = hub.gasService;
    //         expect(gasService).to.eq(hubGasService);
    //         console.log(gasService) //0x9548171265Ba120bbCb3977aa697aD8474cdAf80
    //     })

    // });

})