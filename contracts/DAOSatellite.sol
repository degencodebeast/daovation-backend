// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IAxelarGasService} from "@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";
//import {StringToBytes32, Bytes32ToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Bytes32String.sol";

import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/Checkpoints.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";

contract DAOSatellite is AxelarExecutable, Upgradable {
    // The cross-chain DAO is never deployed on the spoke chains because it wouldn't be efficient to replicate all
    // of the data across each spoke chain. But, we still need an interface to work with the CrossChainDAO smart contract
    // on the spoke chains. Hence, we will create a satellite contract named DAOSatellite.

    IAxelarGasService public immutable gasService;

    using StringToAddress for string;
    using AddressToString for address;

    error AlreadyInitialized();

    string public chainName;

    string public hubChain;
    address public hubChainAddr;
    IVotes public immutable token;
    uint256 public immutable targetSecondsPerBlock;

    uint256[] public allProposalIds;

    mapping(uint256 => RemoteProposal) public proposalIdToProposal;
    mapping(uint256 => ProposalVote) public proposalVotes;

    RemoteProposal[] public allProposalData;
    mapping(address => uint256[]) public proposerToProposalIds;

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address => bool) hasVoted;
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    //struct representing proposals on this remote chain
    struct RemoteProposal {
        //Blocks provided by the hub chain as to when the local values should start/finish
        uint256 localVoteStart;
        bool voteFinished;
        uint256 proposalId;
        //address[] targets;
        //uint256[] values;
        //bytes[] calldatas;
        string description;
        //address proposer;
    }

    constructor(
        string memory _hubChain,
        address _hubChainAddr,
        address _gateway,
        address _gasService,
        IVotes _token,
        uint _targetSecondsPerBlock
    ) payable AxelarExecutable(_gateway) {
        gasService = IAxelarGasService(_gasService);
        hubChain = _hubChain;
        hubChainAddr = _hubChainAddr;
        token = _token;
        targetSecondsPerBlock = _targetSecondsPerBlock; // predetermined seconds-per-block estimate
    }

    //checks whether a proposal exists in the contract by checking if the localVoteStart variable of the corresponding
    //proposal in the proposals mapping has been set to a non-zero value.
    function isProposal(uint256 proposalId) public view returns (bool) {
        return proposalIdToProposal[proposalId].localVoteStart != 0;
    }

    //This smart contract communicates with the CrossChainDAO smart contract, and recall that there are currently
    //two instances in which the CrossChainDAO sends a message:
    //When the CrossChainDAO wants to notify the spoke chains of a new proposal (function selector is 0)
    //When the CrossChainDAO wants the spoke chains to send their voting data to the hub chain (function selector is 1)

    function _setup(bytes calldata params) internal override {
        string memory chainName_ = abi.decode(params, (string));
        if (bytes(chainName).length != 0) revert AlreadyInitialized();
        chainName = chainName_;
    }

    function hasVoted(
        uint256 proposalId,
        address account
    ) public view virtual returns (bool) {
        return proposalVotes[proposalId].hasVoted[account];
    }

    function contractId() external pure returns (bytes32) {
        return keccak256("example");
    }

    //execute here sends receives a proposal and sends a payload back to the hub
    function _execute(
        string calldata /*sourceChain*/,
        string calldata sourceAddress,
        bytes memory _payload
    ) internal override /*(AxelarExecutable)*/ {
        // string memory hubAddrString = hubChainAddr.toString();
        // require(
        //     keccak256(abi.encodePacked(sourceAddress)) ==
        //         keccak256(abi.encodePacked(hubAddrString)),
        //     "Only messages from the hub chain can be received!"
        // );
        uint16 option;
        assembly {
            option := mload(add(_payload, 32))
        }
        // Do 1 of 2 things:
        if (option == 0) {
            //Begin proposal on the chain, with local block times

            //To do this, decode the payload, which includes a proposal ID and the timestamp of when the proposal was made as mentioned in the CrossChainDAO section
            //Perform some calculations to generate a cutOffBlockEstimation by subtracting blocks from the current block based on
            //the timestamp and a predetermined seconds-per-block estimate
            // Add a RemoteProposal struct to the proposals map, effectively registering the proposal and its voting-related data on the spoke chain

            (
                ,
                uint256 proposalId,
                uint256 proposalStart,
                //address[] memory targets,
                //uint256[] memory values,
                //bytes[] memory calldatas,
                string memory description
                //address proposer
            ) = abi.decode(
                    _payload,
                    (
                        uint16,
                        uint256,
                        uint256,
                        //address[],
                        //uint256[],
                        //bytes[],
                        string
                        //address
                    )
                );
            require(
                !isProposal(proposalId),
                "Proposal ID must be unique, and not already set"
            );

            uint256 cutOffBlockEstimation = 0;
            if (proposalStart < block.timestamp) {
                uint256 blockAdjustment = (block.timestamp - proposalStart) /
                    targetSecondsPerBlock;
                if (blockAdjustment < block.number) {
                    cutOffBlockEstimation = block.number - blockAdjustment;
                } else {
                    cutOffBlockEstimation = block.number;
                }
            } else {
                cutOffBlockEstimation = block.number;
            }

            RemoteProposal memory remoteProposal = proposalIdToProposal[
                proposalId
            ];
            remoteProposal = RemoteProposal(
                cutOffBlockEstimation,
                false,
                proposalId,
                //targets,
                //values,
                //calldatas,
                description
                //proposer
            );
            allProposalIds.push(proposalId);
            proposalIdToProposal[proposalId] = remoteProposal;
            //proposerToProposalIds[remoteProposal.proposer].push(proposalId);
            allProposalData.push(remoteProposal);

            //The calculations in the above snippet are not enough to ensure a correct setup. While it
            //may not matter as much when people can start voting, it does matter when the vote weight
            //snapshot is made. If the vote weight snapshot is made too far apart between the spoke and
            //hub chains, a user could send a token from one chain to another and effectively double their
            //voting weight. Some example mitigation strategies are using oracles or editing the erc20votes contract
            //to depend on timestamps instead of blocks but that also is open to attacks if block producers on two chains collude.
            //In the meantime, the only strategy is to subtract blocks from the current block based on the timestamp and a predetermined
            //seconds-per-block estimate.

            //Now let's add logic to send vote results back to the hub chain:

            //Retrieve the proposal ID from the cross-chain message
            //Get the data for said proposal from the relevant map
            //Encode that data into a payload as defined by the CrossChainDAO
            //Send that data through Axelar
        } else if (option == 1) {
            //send vote results back to the hub chain
            (, uint256 proposalId) = abi.decode(_payload, (uint16, uint256));
            ProposalVote storage votes = proposalVotes[proposalId];
            bytes memory votingPayload = abi.encode(
                uint16(0),
                proposalId,
                votes.forVotes,
                votes.againstVotes,
                votes.abstainVotes
            );

            // Send a cross-chain message with axelar to the chain in the iterator
            // NOTE: DAOSatellite needs to be funded beforehand, in the constructor.
            // There are better solutions, such as cross-chain swaps being built in from the hub chain, but
            // this is the easiest solution for demonstration purposes.
            gasService.payNativeGasForContractCall{value: 0.1 ether}(
                address(this), //sender
                hubChain, //destination chain
                sourceAddress, //destination contract address, would be same address with address(this) since we are using constant address deployer
                votingPayload, //payload
                //msg.sender //refund address //payable(address(this)) //test this later to see the one that is necessary to suit your needs
                payable(address(this))
            );

            gateway.callContract(
                hubChain, //destination chain
                sourceAddress, //destination contract address, would be same address with address(this) since we are using constant address deployer, if not using constant deployer then will be "hubChainAddr"
                votingPayload //payload
            );
            proposalIdToProposal[proposalId].voteFinished = true;

            //The only issue here is that the gas payment for the cross-chain message's transaction on the hub chain must be included, and there is no simple way to
            // receive it. There are options that could potentially avert this issue, as explained below, but for simplicity's sake, the satellite contract will have
            //to be sent native currency every once in a while.
        }
    }

    function getAllProposalIds()
        public
        view
        returns (uint256[] memory _allProposalIds)
    {
        _allProposalIds = allProposalIds;
    }

    function getAllProposalData()
        public
        view
        returns (RemoteProposal[] memory)
    {
        return allProposalData;
    }

    function getParticularProposalData(
        uint256 _proposalId
    ) public view returns (RemoteProposal memory proposalData) {
        proposalData = proposalIdToProposal[_proposalId];
    }

    function getProposalIdsByProposer(
        address proposer
    ) public view returns (uint256[] memory proposalIds) {
        proposalIds = proposerToProposalIds[proposer];
    }

    function castVote(
        uint256 proposalId,
        uint8 support
    ) public virtual returns (uint256 balance) {
        RemoteProposal storage proposal = proposalIdToProposal[proposalId];
        require(
            !proposal.voteFinished,
            "DAOSatellite: vote not currently active"
        );
        require(isProposal(proposalId), "DAO: not a started vote");

        uint256 weight = token.getPastVotes(
            msg.sender,
            proposal.localVoteStart
        );
        _countVote(proposalId, msg.sender, support, weight);

        return weight;
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight
    ) internal virtual {
        ProposalVote storage proposalVote = proposalVotes[proposalId];

        require(!proposalVote.hasVoted[account], "DAO: vote already cast");
        proposalVote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert("DAOSatellite: invalid value for enum type");
        }
    }

    receive() external payable {
        // Handle the received Ether here
    }
}
