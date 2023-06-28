// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IAxelarGasService} from "@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
//import { IInterchainTokenLinker } from "./token-linker/contracts/interfaces/IInterchainTokenLinker.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";
import {StringToBytes32, Bytes32ToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Bytes32String.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
//import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "./CrossChainGovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";

//import {Selector} from "./Selector.sol";

contract CrossChainDAO is
    AxelarExecutable,
    Governor,
    GovernorSettings,
    CrossChainGovernorCountingSimple,
    GovernorVotes
{
    //Architectural flow

    // Count votes from spoke chains
    // Add a new collection phase (collecting votes from all spoke chains) between voting and execution phases
    // Request the collection of votes from spoke chains
    // Receive the collection of votes from spoke chains
    // Add functionality to let spoke chains know when there is a new proposal to vote on
    // (Optional) Add ability to receive cross-chain messages to do non-voting action(s), like proposing or executing

    //The logic and data will be housed in a parent contract of the CrossChainDAO

    //The GovernorCountingSimple contract defines how votes are counted and what votes are. It stores how many votes
    // have been cast per proposal, what a vote can be (for, against, abstain), and it also controls whether or not
    // quorum has been reached.

    //The only difference between our cross-chain variant and the single-chain variant is that the cross-chain variant
    // must account for the collection phase and the votes that come with it
    // I could still implement a timelock later, since this interchain DAO doesn't have a timelock at the moment

    /*
    ~~~~~~~~~~ ON QUORUM ~~~~~~~~~
    Typically, an OpenZeppelin Governor's quorum can be altered by democracy, but for simplicity's sake, the quorum has been 
    reduced to a static value of 1 ether. This means that a single voter holding a single token can vote for a proposal and 
    allow it to pass, even if there are 100k tokens in supply. Please view OpenZeppelin's GovernorVotesQuorumFraction smart 
    contract if interested.
    */

    IAxelarGasService public immutable gasService;

    using StringToAddress for string;
    using AddressToString for address;
    //using Selector for bytes;

    // Whether or not the DAO finished the collection phase. It would be more efficient to add Collection as a status
    // in the Governor interface, but that would require editing the source file. It is a bit out of scope to completely
    // refactor the OpenZeppelin governance contract just for cross-chain action!

    mapping(uint256 => bool) public collectionFinished;
    mapping(uint256 => bool) public collectionStarted;

    uint256[] public feesArray;
    uint256[] public feesArray2;

    bytes4 immutable SEND_RESULTS_TO_HUB_SELECTOR =
        bytes4(keccak256("sendResultsToHub(uint256)")); //1 - requestCollection
    bytes4 immutable SET_PROPOSAL_SELECTOR =
        bytes4(keccak256("setProposalOnRemote(uint256, uint256, string)")); //0 - crossChainPropose
    bytes4 immutable ON_RECEIVE_VOTING_DATA_SELECTOR =
        bytes4(
            keccak256(
                "onReceiveSpokeVotingData(uint256, uint256, uint256, uint256)"
            )
        ); // - onReceiveSpokeVotingData
    bytes4 immutable REMOTE_EXECUTE_PROPOSAL_SELECTOR =
        bytes4(keccak256("executeProposal(uint256)"));

    //event ProposalCreated(uint256 proposalId);

    uint256[] public allProposalIds;

    struct ProposalData {
        uint256 proposalId;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
        address proposer;
        uint256 proposalStart;
    }

    ProposalData[] public allProposalData;

    mapping(uint256 => ProposalData) public proposalIdToProposalData;

    mapping(address => uint256[]) public proposerToProposalIds;

    constructor(
        IVotes _token,
        address _gateway,
        address _gasService,
        bytes memory _spokeChains, //satellite chain ids
        bytes memory _spokeChainNames //satellite chain names
    )
        Governor("CrossChainDAO")
        GovernorSettings(0 /* 0 block */, 30 /* 6 minutes */, 0)
        GovernorVotes(_token)
        AxelarExecutable(_gateway)
        CrossChainGovernorCountingSimple(_spokeChains, _spokeChainNames)
    {
        gasService = IAxelarGasService(_gasService);
    }

    //Implementing a Collection Phase
    //a new collection phase should be added in between the voting period and the proposal's execution.
    //During this phase:
    //Execution must be postponed (execution must be disabled)
    //The hub chain must request voting data from the spoke chains
    //The spoke chain must subsequently send the voting data

    // function that checks whether or not that each of the spoke chains have sent in voting data before
    // a proposal is executed (which is found by checking initialized on a proposal on all chains)
    //should be called by chainlink's automation
    function _beforeExecute(
        uint256 _proposalId,
        address[] memory _targets,
        uint256[] memory _values,
        bytes[] memory _calldatas,
        bytes32 _descriptionHash
    ) internal override {
        finishCollectionPhase(_proposalId);

        require(
            collectionFinished[_proposalId],
            "Collection phase for this proposal is unfinished!"
        );

        super._beforeExecute(
            _proposalId,
            _targets,
            _values,
            _calldatas,
            _descriptionHash
        );
    }

    //function that marks a collection phase as true if all of the spoke chains have
    //sent a cross-chain message back

    function finishCollectionPhase(uint256 _proposalId) public {
        bool phaseFinished = true;
        //loop will only run as long as phaseFinished == true
        for (uint16 i = 0; i < spokeChains.length && phaseFinished; i++) {
            phaseFinished =
                phaseFinished &&
                proposalIdToChainIdToSpokeVotes[_proposalId][spokeChains[i]]
                    .initialized;
        }

        collectionFinished[_proposalId] = phaseFinished; //this sets the collection of the proposalId on all chains as finished
    }

    // If you wanted, you could also add the collection phase within the IGovernor state machine. This would require more effort
    // than it would be worth and is more feasible for a cross-chain DAO written from scratch

    // We can start by making a new public trustless function to begin the collection phase, similar to the execute function:
    // Requests the voting data from all of the spoke chains

    //This function allows any user to start the collection process for a specific proposalId as long as:
    //The voting phase for the proposal has finished
    //The collection phase has not yet started
    //Recall that each spoke chain will have a DAOSatellite smart contract associated with it that can also receive and send
    //cross-chain messages. This function sends a cross-chain message to every registered spoke chain's DAOSatellite during
    //the collection phase. The message contains a function selector, 1, and a proposal ID. The function selector is used to
    //request voting data for the given proposal instead of some other action from the destination DAOSatellite contract.

    //option = 1
    function requestCollections(
        uint256 _proposalId,
        address _satelliteAddr,
        uint256[] memory spokeChainFees
    ) public payable {
        require(
            block.number > proposalDeadline(_proposalId),
            "Cannot request for vote collection until after the vote period is over!"
        );
        require(
            !collectionStarted[_proposalId],
            "Collection phase for this proposal has already started"
        );

        uint256 totalFee;
        for (uint i = 0; i < spokeChainFees.length; i++) {
            totalFee += spokeChainFees[i];
        }
        require(msg.value >= totalFee, "insufficient gas fee for transaction");

        collectionStarted[_proposalId] = true;
        //uint256 crossChainFee = msg.value / spokeChainNames.length;
        for (uint16 i = 0; i < spokeChainNames.length; i++) {
            uint256 crossChainFee = spokeChainFees[i];
            feesArray2.push(crossChainFee);
            //require(msg.value >= crossChainFee, "transaction fee isn't enough");
            bytes memory payload = abi.encodeWithSignature(
                "sendResultsToHub(uint256)",
                _proposalId
            );
            gasService.payNativeGasForContractCall{value: crossChainFee}(
                address(this), //sender
                spokeChainNames[i], //destination chain
                _satelliteAddr.toString(),
                payload,
                msg.sender
            );

            gateway.callContract(
                spokeChainNames[i],
                _satelliteAddr.toString(),
                payload
            );
        }
    }

    function getAllProposalIds()
        public
        view
        returns (uint256[] memory _allProposalIds)
    {
        _allProposalIds = allProposalIds;
    }

    function getAllProposalData() public view returns (ProposalData[] memory) {
        return allProposalData;
    }

    function getParticularProposalData(
        uint256 _proposalId
    ) public view returns (ProposalData memory proposalData) {
        proposalData = proposalIdToProposalData[_proposalId];
    }

    function getProposalIdsByProposer(
        address proposer
    ) public view returns (uint256[] memory proposalIds) {
        proposalIds = proposerToProposalIds[proposer];
    }

    //This function will receive cross chain voting data
    function _execute(
        string calldata sourceChain,
        string calldata /*sourceAddress*/,
        bytes calldata _payload
    ) internal override(AxelarExecutable) {
        //super._execute();
        uint32 _srcChainId = spokeChainNameToChainId[sourceChain];
        bytes calldata payloadNoSig = _payload[4:];
        bytes4 selector = getSelector(_payload);
        // Some options for cross-chain actions are: propose, vote, vote with reason,
        // vote with reason and params, cancel, etc.
        if (selector == ON_RECEIVE_VOTING_DATA_SELECTOR) {
            onReceiveSpokeVotingData(_srcChainId, payloadNoSig);
        } else if (selector == REMOTE_EXECUTE_PROPOSAL_SELECTOR) {
            // TODO: Feel free to put your own cross-chain actions (propose, execute, etc.)
            callExecute();
        } else {
            // You could revert here if you wanted to
            revert("Invalid payload: no selector match");
        }
    }

    function getSelector(
        bytes memory _data
    ) internal pure returns (bytes4 sig) {
        assembly {
            sig := mload(add(_data, 32))
        }
    }

    function callExecute() public pure returns (string memory message) {
        message = "You just called the execute proposal function from another chain";
    }

    //if you are implementing _execute from the governor contract remember to override it as well
    //we want to know for which proposal the data received is for, and initialize it to true that it has been received

    //if a proposal on the spokeProposalVote struct has been initialized to true, then it means that it has received voting data for that spoke chain
    function onReceiveSpokeVotingData(
        uint32 _srcChainId,
        bytes memory payload
    ) internal virtual {
        (
            uint256 _proposalId,
            uint256 _for,
            uint256 _against,
            uint256 _abstain
        ) = abi.decode(payload, (uint256, uint256, uint256, uint256));

        //as long as the received data isn't already initialized.._execute
        if (
            proposalIdToChainIdToSpokeVotes[_proposalId][_srcChainId]
                .initialized
        ) {
            revert("Already initialized");
        } else {
            //Add it to the map (while setting initialized to true)
            proposalIdToChainIdToSpokeVotes[_proposalId][
                _srcChainId
            ] = SpokeProposalVote(_for, _against, _abstain, true);
        }
    }

    // At this point, the collection phase is finished! The collection phase stops the execution
    // before all votes are counted, and a message is sent requesting voting data from spoke chains

    //OpenZeppelin's Governor smart contract came with a propose function, but unfortunately it doesn't work for our purposes
    //When a user sends a proposal, the smart contract needs to send cross-chain messages to let the spoke chains
    //know that there is a new proposal to vote on. But the destination chains also need gas to complete the messages'
    //journey. Most cross-chain protocols currently require extra gas paid in the origin chain's native currency for
    //the destination chain's transaction, and that can only be sent via a payable function. The propose function is
    //not payable, hence why we must write our own cross-chain version.

    //Note
    //Technically, the cross-chain messages should be sent when the voting delay is over to sync with when the voting
    //weight snapshot is taken. In this instance, the proposal and snapshot are made at the same time.

    //We'll rename the original propose function included in the Governor smart contract to be crossChainPropose.
    //Then we'll modify it to send cross-chain messages with information on the proposal to every spoke chain,
    // the IDs of which is being stored in the CrossChainGovernorCountingSimple contract

    function crossChainPropose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        address _satelliteAddr,
        uint256[] memory spokeChainFees
    ) public payable virtual returns (uint256) {
        uint256 totalFee;
        for (uint i = 0; i < spokeChainFees.length; i++) {
            totalFee += spokeChainFees[i];
        }
        require(msg.value >= totalFee, "insufficient gas fee for transaction");
        uint256 _proposalId = super.propose(
            targets,
            values,
            calldatas,
            description
        );

        uint256 _proposalTimeStart = block.timestamp;
        ProposalData memory proposalData = ProposalData(
            _proposalId,
            targets,
            values,
            calldatas,
            description,
            msg.sender,
            _proposalTimeStart
        );
        allProposalData.push(proposalData);
        //sends the proposal to all of the other chains
        // NOTE: I could also provide the time end, but that should be done with a timestamp as well
        if (spokeChainNames.length > 0) {
            //uint256 crossChainFee = msg.value / spokeChainNames.length;

            //Iterate over every spoke chain
            for (uint16 i = 0; i < spokeChainNames.length; i++) {
                // using "0" as the function selector for destination contract
                uint256 crossChainFee = spokeChainFees[i];
                feesArray.push(crossChainFee);

                bytes memory payload = abi.encodeWithSignature(
                    "setProposalOnRemote(uint256, uint256, string)",
                    _proposalId,
                    _proposalTimeStart,
                    //proposalData.targets,
                    //proposalData.values,
                    //proposalData.calldatas,
                    proposalData.description
                    //proposalData.proposer
                );

                // Send a cross-chain message with axelar to the chain in the iterator

                gasService.payNativeGasForContractCall{value: crossChainFee}(
                    address(this), //sender
                    spokeChainNames[i], //destination chain
                    _satelliteAddr.toString(),
                    payload,
                    msg.sender //refund address
                );

                gateway.callContract(
                    spokeChainNames[i], //destination chain name
                    _satelliteAddr.toString(), //destination address
                    payload //payload
                );
            }

            //emit ProposalCreated(_proposalId);
        }
        proposalIdToProposalData[_proposalId] = proposalData;
        proposerToProposalIds[msg.sender].push(_proposalId);
        allProposalIds.push(_proposalId);
        return _proposalId;
    }

    function quorum(
        uint256 blockNumber
    ) public pure override returns (uint256) {
        return 1e18;
    }

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function executeProposal() public {}

    //function getSpokeVotes(uint256 chainId, uint256 proposalId) public {}

    function getAllVotes() public {}
}
