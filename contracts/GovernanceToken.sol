// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IAxelarGasService} from "@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {IERC20CrossChain} from "./IERC20CrossChain.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
//import { IInterchainTokenLinker } from "./token-linker/contracts/interfaces/IInterchainTokenLinker.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";
import {StringToBytes32, Bytes32ToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Bytes32String.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

//import { ERC20 } from '@axelar-network/axelar-cgp-solidity/contracts/ERC20.sol';
//import {IERC20VotesCrossChain} from "./interfaces/IERC20VotesCrossChain.sol";

//you can extend the ERC20Votes contract with the InterchainToken contract
//to allow seamless interchain transfers and implement interchain vote methods using GMP
//try this later, for now I am using the InterchainToken interface

//extend erc20votes, and add new interchain vote methods using gmp and test it out.
//Once that works, you can inherit from InterchainToken to benefit from native interchain transfers too

//if you are importing from InterchainTokenLinker contract, you can make this contract abstract
//so that way you don't have to provide arguments for the parent constructors that you are inheriting from

//later you can edit this ERC20Vots to inherit erc20 and ierc20 from axelar gmp
contract GovernanceToken is
    ERC20Votes,
    AccessControl,
    AxelarExecutable,
    Upgradable,
    IERC20CrossChain
{
    //bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    using StringToAddress for string;
    using AddressToString for address;

    error AlreadyInitialized();

    string public chainName; //To check if we are the source chain.

    event FalseSender(string sourceChain, string sourceAddress);

    bytes32 public tokenId;
    IAxelarGasService public immutable gasService;

    constructor(
        address _gateway,
        address _gasService
    )
        ERC20("KingToken", "KT")
        ERC20Permit("GovernanceToken")
        AxelarExecutable(_gateway)
    {
        gasService = IAxelarGasService(_gasService);
        // uint256 s_maxSupply = 1000000000000000000000000;
        // _mint(msg.sender, s_maxSupply);

        //_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        //_grantRole(MINTER_ROLE, msg.sender);

        //_mint(address(this), s_maxSupply);
    }

    //  function _setup(bytes calldata params) internal override {
    //     (string memory name_, string memory symbol_) = abi.decode(params, (string, string));
    //     //if (bytes( super.super.super._name).length != 0) revert AlreadyInitialized();
    //     name() = name_;
    //     super.symbol = symbol_;
    // }

    // This is for testing.
    function mint(uint256 amount) external /*onlyRole(MINTER_ROLE)*/ {
        _mint(msg.sender, amount);
    }

    function executeMint(address _to, uint256 amount) internal {
        _mint(_to, amount);
    }

    function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        /*address _recipient,*/ uint256 amount
    ) public payable override {
        _burn(msg.sender, amount);
        bytes memory payload = abi.encode(destinationAddress, amount);
        string memory stringAddress = address(this).toString();
        //string memory stringAddress = destinationAddress.toString();
        if (msg.value > 0) {
            gasService.payNativeGasForContractCall{value: msg.value}(
                address(this),
                destinationChain,
                stringAddress,
                payload,
                msg.sender
            );
        }
        gateway.callContract(destinationChain, stringAddress, payload);
    }

    function _execute(
        string calldata /*sourceChain*/,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        //remember that you are using axelar's constant address deployer to deploy it so that all chains you are going to be deploying this contract to have the same addresses
        if (sourceAddress.toAddress() != address(this)) {
            emit FalseSender(sourceAddress, sourceAddress);
            return;
        }
        (address to, uint256 amount) = abi.decode(payload, (address, uint256));
        executeMint(to, amount);
    }

    // function sendToRecipient(
    //     string memory destinationChain,
    //     string memory destinationAddress,
    //     address recipient,
    //     string memory symbol,
    //     uint256 amount
    // ) external payable {
    //     address tokenAddress = gateway.tokenAddresses(symbol);
    //     IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
    //     IERC20(tokenAddress).approve(address(gateway), amount);
    //     bytes memory payload = abi.encode(recipient);
    //     if (msg.value > 0) {
    //         gasService.payNativeGasForContractCallWithToken{value: msg.value}(
    //             address(this),
    //             destinationChain,
    //             destinationAddress,
    //             payload,
    //             symbol,
    //             amount,
    //             msg.sender
    //         );
    //     }
    //     gateway.callContractWithToken(
    //         destinationChain,
    //         destinationAddress,
    //         payload,
    //         symbol,
    //         amount
    //     );
    // }

    // function _executeWithToken(
    //     string calldata,
    //     string calldata,
    //     bytes calldata payload,
    //     string calldata tokenSymbol,
    //     uint256 amount
    // ) internal override {
    //     address recipient = abi.decode(payload, (address));
    //     address tokenAddress = gateway.tokenAddresses(tokenSymbol);
    //     IERC20(tokenAddress).transfer(recipient, amount);
    // }

    function contractId() external pure returns (bytes32) {
        return keccak256("example");
    }

    // The functions below are overrides required by Solidity.

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(
        address account,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._burn(account, amount);
    }

    // function _setup(bytes calldata params) internal override {
    //     (string memory name_, string memory symbol_) = abi.decode(
    //         params,
    //         (string, string)
    //     );
    //     if (bytes(_name).length != 0) revert AlreadyInitialized();
    //     _name = name_;
    //     _symbol = symbol_;
    // }

    function _setup(bytes calldata params) internal override {
        string memory chainName_ = abi.decode(params, (string));
        if (bytes(chainName).length != 0) revert AlreadyInitialized();
        chainName = chainName_;
    }

    //function gateway() external view override returns (IAxelarGateway) {}
}
