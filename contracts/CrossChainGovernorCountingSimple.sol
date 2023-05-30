// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.0) (governance/extensions/GovernorCountingSimple.sol)

pragma solidity ^0.8.0;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";

/**
 * @dev Extension of {Governor} for simple, 3 options, vote counting.
 *
 * _Available since v4.3._
 */
abstract contract CrossChainGovernorCountingSimple is Governor {
    /**
     * @dev Supported vote types. Matches Governor Bravo ordering.
     */
    enum VoteType {
        Against,
        For,
        Abstain
    }

    // The spokechain IDs that the DAO expects to receive data from during the
    // collection phase
    uint32[] public spokeChains;
    string[] public spokeChainNames;

    //Challenge

    //In a production-ready cross-chain DAO, you would make the spoke chains modifiable by
    // governance instead of keeping it static. Can you add an additional function that would
    // make this possible? Which address should have access to this function?

    // Hint: replace the array with a mapping.

    constructor(
        bytes memory _spokeChainsIdData,
        bytes memory _spokeChainNamesData
    ) {
        uint32[] memory _spokeChains = abi.decode(
            _spokeChainsIdData,
            (uint32[])
        );
        string[] memory _spokeChainNames = abi.decode(
            _spokeChainNamesData,
            (string[])
        );
        setSpokeChainData(_spokeChains, _spokeChainNames);
        spokeChains = _spokeChains;
        spokeChainNames = _spokeChainNames;
    }

    struct spokeChainData {
        uint32 spokeChainId;
        string spokeChainName;
    }

    struct SpokeProposalVote {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool initialized; //This checks whether data was received from the spoke chains or not
    }

    //The new SpokeProposalVote struct is very similar to the ProposalVote struct. Can you think
    //of a more optimal data structure for the smart contract that requires only one struct?

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address => bool) hasVoted;
    }

    mapping(string => uint32) public spokeChainNameToChainId;

    // Maps a proposal ID to a map of a chain ID to summarized spoke voting data
    mapping(uint256 => mapping(uint32 => SpokeProposalVote))
        public proposalIdToChainIdToSpokeVotes;
    // ...

    mapping(uint256 => ProposalVote) private _proposalVotes;

    //Now we have a place to store the cross-chain data, and we have a data structure to organize it with.
    //We also want the cross-chain data to matter when calculating if a vote reached quorum and if a vote passed.
    //By iterating through the stored cross-chain data from each of the spoke chains, the votes for each spoke chain
    //are being added to the quorum and vote success calculations.

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE()
        public
        pure
        virtual
        override
        returns (string memory)
    {
        return "support=bravo&quorum=for,abstain";
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */

    function setSpokeChainData(
        uint32[] memory _spokeChains,
        string[] memory _spokeChainNames
    ) internal {
        require(
            _spokeChains.length == _spokeChainNames.length,
            "not equal lengths"
        );
        for (uint16 i = 0; i < _spokeChains.length; i++) {
            spokeChainNameToChainId[_spokeChainNames[i]] = _spokeChains[i];
        }
    }

    function hasVoted(
        uint256 proposalId,
        address account
    ) public view virtual override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    /**
     * @dev Accessor to the internal vote counts.
     */
    function proposalVotes(
        uint256 proposalId
    )
        public
        view
        virtual
        returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)
    {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return (
            proposalVote.againstVotes,
            proposalVote.forVotes,
            proposalVote.abstainVotes
        );
    }

    /**
     * @dev See {Governor-_quorumReached}.
     */
    function _quorumReached(
        uint256 proposalId
    ) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        uint256 abstainVotes = proposalVote.abstainVotes;
        uint256 forVotes = proposalVote.forVotes;

        for (uint16 i = 0; i < spokeChains.length; i++) {
            SpokeProposalVote
                storage spokeVoteDetails = proposalIdToChainIdToSpokeVotes[
                    proposalId
                ][spokeChains[i]];
            abstainVotes += spokeVoteDetails.abstainVotes;
            forVotes += spokeVoteDetails.forVotes;
        }

        return quorum(proposalSnapshot(proposalId)) <= forVotes + abstainVotes;
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the forVotes must be strictly over the againstVotes.
     */
    function _voteSucceeded(
        uint256 proposalId
    ) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        uint256 againstVotes = proposalVote.againstVotes;
        uint256 forVotes = proposalVote.forVotes;

        for (uint16 i = 0; i < spokeChains.length; i++) {
            SpokeProposalVote
                storage spokeVoteDetails = proposalIdToChainIdToSpokeVotes[
                    proposalId
                ][spokeChains[i]];
            againstVotes += spokeVoteDetails.againstVotes;
            forVotes += spokeVoteDetails.forVotes;
        }

        return forVotes > againstVotes;
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        require(
            !proposalVote.hasVoted[account],
            "GovernorVotingSimple: vote already cast"
        );
        proposalVote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert("GovernorVotingSimple: invalid value for enum VoteType");
        }
    }
}
